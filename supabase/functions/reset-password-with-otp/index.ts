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
        const newPassword = body.new_password;

        if (!email || !otpCode || !newPassword) {
            return json({ error: "E-mail, código e nova senha são obrigatórios" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
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
            console.error("reset-password-with-otp: DB error", otpError);
            return json({ error: "Erro ao verificar código de recuperação" }, { status: 500 });
        }

        if (!otpRecord) {
            return json({ error: "Código inválido. Verifique e tente novamente." }, { status: 400 });
        }

        // Check expiration
        if (new Date(otpRecord.expires_at) < new Date()) {
            return json({ error: "Código expirado. Solicite um novo código." }, { status: 400 });
        }

        // Find the user by email
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
            perPage: 1000,
        });

        if (listError) {
            console.error("reset-password-with-otp: listUsers error", listError);
            return json({ error: "Erro ao localizar usuário" }, { status: 500 });
        }

        const user = usersData?.users?.find(
            (u: any) => (u.email ?? "").toLowerCase() === email
        );

        if (!user) {
            return json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // Note: admin.updateUserById can trigger native Supabase emails.
        // To silently update the password, we should technically update the auth.users table. 
        // Unfortunately, direct updates to auth.users require pg_crypto for bcrypt hashing,
        // or we just have to tell the user to disable the email template in the Supabase Dashboard. 
        // BUT there is a workaround: using the Admin API is still the best way to hash passwords.
        // What we can do instead is just remind the user to disable the "Email Confirmations" or "Secure Email Change" / "Password Changed" email templates.

        // Let's attempt to use the admin API but avoid email_confirm if not needed.
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword,
            user_metadata: { password_reset_via_otp: true } // Just an arbitrary update to ensure it persists
        });

        if (updateError) {
            console.error("reset-password-with-otp: updateUser error", updateError);
            return json({ error: "Erro ao atualizar a senha do usuário" }, { status: 500 });
        }

        // Mark OTP as used
        await supabase
            .from("email_verification_otps")
            .update({ used_at: new Date().toISOString() })
            .eq("id", otpRecord.id);

        return json({ ok: true });
    } catch (err) {
        console.error("reset-password-with-otp: unexpected error", err);
        return json({ error: "Erro inesperado" }, { status: 500 });
    }
});
