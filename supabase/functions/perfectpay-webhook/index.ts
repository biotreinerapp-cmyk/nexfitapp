import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Perfect Pay sends data as POST with JSON or Form-URL-Encoded
        const payload = await req.json();
        console.log("Perfect Pay Webhook received:", payload);

        // 1. Validate Token (Security)
        const { data: config } = await supabaseClient
            .from("integration_configs")
            .select("value")
            .eq("key", "perfectpay_webhook_token")
            .single();

        const securityToken = config?.value;

        // Perfect Pay might send token in the payload or as a param
        // According to docs, they send 'key' or we check our own defined token
        // For simplicity, we'll check if our configured token matches a specific field
        // Note: Adjust according to Perfect Pay's specific 'Security Token' field name
        if (securityToken && payload.token !== securityToken) {
            console.error("Invalid security token");
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const {
            email,
            status,
            user_id, // We try to pass this in the metadata/params if possible
            sale_status_name, // 'Aprovado', 'Cancelado', etc.
            product_name
        } = payload;

        // Mapping Perfect Pay status to our system
        // Typical statuses: 'approved', 'abandoned', 'pending', 'canceled', 'refunded'
        // Perfect Pay uses 'sale_status' - 2 is often 'Aprovado' (Approved)

        if (sale_status_name === "Aprovado" || payload.sale_status === 2 || payload.sale_status === "2") {
            console.log(`Processing approval for ${email}`);

            // Identify the plan from the product name or we can use metadata
            let plan: "ADVANCE" | "ELITE" = "ADVANCE";
            if (product_name?.toUpperCase().includes("ELITE")) {
                plan = "ELITE";
            }

            // Find user by email (primary) or user_id (if provided in checkout link)
            let targetUserId = user_id;

            if (!targetUserId) {
                const { data: userData } = await supabaseClient
                    .from("profiles")
                    .select("id")
                    .eq("email", email)
                    .maybeSingle();
                targetUserId = userData?.id;
            }

            if (targetUserId) {
                // Update profile
                const { error: updateError } = await supabaseClient
                    .from("profiles")
                    .update({
                        subscription_plan: plan,
                        plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", targetUserId);

                if (updateError) throw updateError;

                console.log(`Successfully updated user ${targetUserId} to ${plan}`);
            } else {
                console.warn(`User with email ${email} not found in profiles.`);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
