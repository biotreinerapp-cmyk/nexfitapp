import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, token",
};

serve(async (req: Request) => {
    // Configuração de CORS (para testes de postback via console, preflight requests, etc)
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Inicializar cliente do Supabase
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Obter e validar o Token da Perfect Pay
        const { data: configData, error: configError } = await supabaseClient
            .from("integration_configs")
            .select("value")
            .eq("key", "perfectpay_webhook_token")
            .single();

        if (configError) throw new Error("Erro ao carregar token no sistema");

        const systemToken = configData?.value;

        // O token pode vir via Header ou via Payload (no body JSON) dependendo da configuração.
        // Vamos verificar o Payload (json corpo) caso venha em POST JSON.
        const body = await req.json();

        // Validação de segurança
        const incomingToken = body.token || req.headers.get("token");

        if (!systemToken) {
            return new Response(JSON.stringify({ error: "Token de webhook não configurado no painel Admin" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (incomingToken !== systemToken) {
            return new Response(JSON.stringify({ error: "Token inválido ou não fornecido" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log("Recebendo payload PerfectPay:", body);

        // De acordo com a Perfect Pay (exemplo simplificado mercado), status principais são:
        // 2 ou 'Approved' para aprovado
        if (body.sale_status_enum !== 2 && body.sale_status !== 'Approved' && body.sale_status_enum !== 4 && body.sale_status !== 'Completed') {
            console.log("Transação não foi concluída. Status:", body.sale_status);
            return new Response(JSON.stringify({ message: "Transação ignorada. Status diferente de Aprovado." }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const customerEmail = body.customer?.email;
        const planName = body.product?.name; // Ex: "Advance Pro" ou "Elite Black" ou o id do produto (body.product?.id) se definirmos no admin.
        const amountCents = Math.round(Number(body.sale_amount || 0) * 100);
        const transactionId = body.transaction_code || body.transaction;

        if (!customerEmail) {
            throw new Error("E-mail não encontrado no payload");
        }

        // 2. Buscar o usuário pelo email
        const { data: userData, error: userError } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("email", customerEmail)
            .single();

        if (userError || !userData) {
            console.log(`Usuário ${customerEmail} não encontrado. Aguardando registro do aluno.`);
            return new Response(JSON.stringify({ message: "Postback recebido, mas aluno não está cadastrado" }), {
                status: 200, // Retornamos 200 para não estourar o limite de tentativas no gateway
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const userId = userData.id;

        // 3. Verificando se a compra é de um pacote de Ads/Destaque
        const upperPlanName = (planName || "").toUpperCase();
        if (upperPlanName.includes("DESTAQUE") || upperPlanName.includes("ADS")) {
            // Lógica de Destaque
            const { data: storeData } = await supabaseClient
                .from("marketplace_stores")
                .select("id, highlight_expires_at")
                .eq("owner_user_id", userId)
                .limit(1);

            if (storeData && storeData.length > 0) {
                const storeId = storeData[0].id;
                let newExpiresAt = new Date();

                if (storeData[0].highlight_expires_at) {
                    const currentExp = new Date(storeData[0].highlight_expires_at);
                    if (currentExp > newExpiresAt) {
                        newExpiresAt = currentExp;
                    }
                }

                // Vamos assumir fallback de 30 dias para webhooks de destaque caso seja genérico.
                // Mas o log do nome do plano conterá a descrição.
                newExpiresAt.setDate(newExpiresAt.getDate() + 30);

                const { error: adsError } = await supabaseClient
                    .from("marketplace_stores")
                    .update({
                        is_highlighted: true,
                        highlight_expires_at: newExpiresAt.toISOString(),
                        highlight_clicks: 0,
                        highlight_sales: 0
                    })
                    .eq("id", storeId);

                if (adsError) throw new Error("Erro ao ativar ADS: " + adsError.message);

                const { data: existingTx } = await supabaseClient
                    .from("financial_transactions")
                    .select("id")
                    .eq("reference_id", transactionId)
                    .eq("type", "income");

                if (!existingTx || existingTx.length === 0) {
                    await supabaseClient.from("financial_transactions").insert({
                        type: 'income',
                        amount_cents: amountCents > 0 ? amountCents : 9990,
                        description: `Nexfit ADS (${planName}) via PerfectPay (${customerEmail})`,
                        category: 'Marketing',
                        reference_id: transactionId,
                        date: new Date().toISOString().split('T')[0]
                    });
                }

                return new Response(JSON.stringify({ message: "ADS ativado com sucesso!" }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 4. Se não for Destaque, Buscar a vigência do plano no sistema para identificar dias
        // (Buscamos o plano cujo nome contém a string enviada pela perfect pay de forma case-insensitive, ou um fallback).
        const { data: planData, error: planError } = await supabaseClient
            .from("app_access_plans")
            .select("*")
            .ilike("name", `%${planName}%`)
            .eq("user_type", "ALUNO")
            .eq("is_active", true)
            .limit(1);

        // Se o plano não for encontrado com exatidão, faremos um fallback para identificar
        let matchedPlanName = planName;
        let validityDays = 30; // 30 dias

        if (!planError && planData && planData.length > 0) {
            matchedPlanName = planData[0].name;
            validityDays = planData[0].validity_days || 30;
        }

        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

        // 4. Atualizar Assinatura
        let enumPlan = "FREE";
        if (matchedPlanName.toUpperCase().includes("ADVANCE")) enumPlan = "ADVANCE";
        if (matchedPlanName.toUpperCase().includes("ELITE")) enumPlan = "ELITE";

        const { error: profileError } = await supabaseClient
            .from("profiles")
            .update({
                subscription_plan: enumPlan,
                plan_expires_at: expiresAt
            })
            .eq("id", userId);

        if (profileError) throw new Error("Erro ao atualizar perfil: " + profileError.message);

        // 5. Inserir Registro na Tabela pagamentos
        const { error: pagError } = await supabaseClient
            .from("pagamentos")
            .insert({
                user_id: userId,
                provider: "perfectpay",
                desired_plan: enumPlan,
                status: "approved",
                receipt_path: "auto_approved_perfectpay",
                processed_at: new Date().toISOString()
            });

        if (pagError) throw new Error("Erro ao registrar pagamento: " + pagError.message);

        // 6. Inserir transação financeira
        // Verifica se já existe a transação para não duplicar receita do mesmo webhook
        const { data: existingTx } = await supabaseClient
            .from("financial_transactions")
            .select("id")
            .eq("reference_id", transactionId)
            .eq("type", "income");

        if (!existingTx || existingTx.length === 0) {
            const { error: txError } = await supabaseClient
                .from("financial_transactions")
                .insert({
                    type: 'income',
                    amount_cents: amountCents > 0 ? amountCents : 9990, // valor dinâmico ou fixo
                    description: `Assinatura ${matchedPlanName} via PerfectPay (${customerEmail})`,
                    category: 'Assinaturas',
                    reference_id: transactionId,
                    date: new Date().toISOString().split('T')[0]
                });

            if (txError) throw new Error("Erro ao registrar transação financeira: " + txError.message);
        }

        return new Response(JSON.stringify({ message: "Webhook processado com sucesso!" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        console.error("Erro no Webhook Perfect Pay:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
