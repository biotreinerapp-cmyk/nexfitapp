import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...corsHeaders, ...(init?.headers ?? {}) },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return json({ error: "Configuração de backend incompleta" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const email = (body.email ?? "").trim().toLowerCase();
        const otpCode = (body.otp_code ?? "").trim();

        if (!email || !otpCode) {
            return json({ error: "E-mail e código são obrigatórios" }, { status: 400 });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });

        // Find valid, unused OTP
        const { data: otpRecord, error: otpError } = await supabase
            .from("email_verification_otps")
            .select("id, expires_at, used_at")
            .eq("email", email)
            .eq("otp_code", otpCode)
            .is("used_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (otpError) {
            console.error("verify-email-otp: DB error", otpError);
            return json({ error: "Erro ao verificar código" }, { status: 500 });
        }

        if (!otpRecord) {
            return json({ error: "Código inválido. Verifique e tente novamente." }, { status: 400 });
        }

        // Check expiration
        if (new Date(otpRecord.expires_at) < new Date()) {
            return json({ error: "Código expirado. Solicite um novo código." }, { status: 400 });
        }

        // Mark OTP as used
        await supabase
            .from("email_verification_otps")
            .update({ used_at: new Date().toISOString() })
            .eq("id", otpRecord.id);

        // Find the user by email
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
            perPage: 1000,
        });

        if (listError) {
            console.error("verify-email-otp: listUsers error", listError);
            return json({ error: "Erro ao localizar usuário" }, { status: 500 });
        }

        const user = usersData?.users?.find(
            (u: any) => (u.email ?? "").toLowerCase() === email
        );

        if (!user) {
            return json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // Confirm email via Admin API
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true,
        });

        if (updateError) {
            console.error("verify-email-otp: updateUser error", updateError);
            return json({ error: "Erro ao confirmar e-mail" }, { status: 500 });
        }

        // Generate a magic link / sign-in link so the user gets a session automatically
        // We use generateLink to get a session token the frontend can use
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email,
        });

        if (linkError || !linkData) {
            console.error("verify-email-otp: generateLink error", linkError);
            // Email confirmed but can't auto-login — return success so user can login manually
            return json({ ok: true, autoLogin: false });
        }

        // Extract the token from the magic link
        // The link looks like: https://.../#access_token=...&refresh_token=...
        const linkUrl = linkData.properties?.action_link ?? "";
        const hashPart = linkUrl.split("#")[1] ?? "";
        const params = new URLSearchParams(hashPart);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
            return json({
                ok: true,
                autoLogin: true,
                access_token: accessToken,
                refresh_token: refreshToken,
            });
        }

        return json({ ok: true, autoLogin: false });
    } catch (err) {
        console.error("verify-email-otp: unexpected error", err);
        return json({ error: "Erro inesperado" }, { status: 500 });
    }
});
