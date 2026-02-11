// Supabase Edge Function: downgrade_expired_plans
// - Downgrades expired ADVANCE/ELITE subscriptions to FREE
// - Intended to be invoked by pg_cron daily

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SubscriptionPlan = "FREE" | "ADVANCE" | "ELITE";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const expectedSecret = Deno.env.get("DOWNGRADE_CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      console.warn("[downgrade_expired_plans] Unauthorized call", { requestId });
      return jsonResponse({ ok: false, error: "unauthorized", requestId }, 401);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceRoleKey) {
      console.error("[downgrade_expired_plans] Missing env vars", {
        requestId,
        hasUrl: Boolean(url),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return jsonResponse({ ok: false, error: "missing_env", requestId }, 500);
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const targetPlans: SubscriptionPlan[] = ["ADVANCE", "ELITE"];

    let totalAffected = 0;
    let loops = 0;

    // Batch to avoid Supabase 1000 rows limit
    while (loops < 25) {
      loops += 1;

      const { data: expired, error: selectError } = await supabase
        .from("profiles")
        .select("id")
        .in("subscription_plan", targetPlans)
        .not("plan_expires_at", "is", null)
        .lt("plan_expires_at", nowIso)
        .limit(1000);

      if (selectError) throw selectError;

      const ids = (expired ?? []).map((r) => (r as any).id as string).filter(Boolean);
      if (ids.length === 0) break;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ subscription_plan: "FREE", plan_expires_at: null })
        .in("id", ids);

      if (updateError) throw updateError;

      totalAffected += ids.length;
    }

    const durationMs = Date.now() - start;
    console.log("[downgrade_expired_plans] Done", {
      requestId,
      totalAffected,
      loops,
      durationMs,
    });

    return jsonResponse({ ok: true, totalAffected, loops, durationMs, requestId });
  } catch (error) {
    const durationMs = Date.now() - start;
    console.error("[downgrade_expired_plans] Error", { requestId, durationMs, error });
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        requestId,
        durationMs,
      },
      500,
    );
  }
});
