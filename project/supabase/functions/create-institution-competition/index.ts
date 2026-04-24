import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { institution_id, competition, prizes } = body;

    if (!institution_id || !competition) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: institution, error: instErr } = await admin
      .from("institutional_accounts")
      .select("id, tokens_balance, is_active")
      .eq("id", institution_id)
      .maybeSingle();

    if (instErr || !institution) {
      return new Response(JSON.stringify({ error: "Institution not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!institution.is_active) {
      return new Response(JSON.stringify({ error: "Institution account is not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const boostBudget = competition.boost_budget_tokens || 0;
    if (competition.boost_enabled && boostBudget > institution.tokens_balance) {
      return new Response(JSON.stringify({ error: "Insufficient token balance" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: comp, error: compErr } = await admin
      .from("competitions")
      .insert({
        ...competition,
        created_by_partner: true,
        partner_id: institution_id,
        is_active: true,
        approval_status: "pending",
      })
      .select()
      .single();

    if (compErr) throw compErr;

    if (prizes && prizes.length > 0) {
      const { error: prizesErr } = await admin.from("competition_prizes").insert(
        prizes.map((p: Record<string, unknown>) => ({ ...p, competition_id: comp.id }))
      );
      if (prizesErr) throw prizesErr;
    }

    if (competition.boost_enabled && boostBudget > 0) {
      await admin
        .from("institutional_accounts")
        .update({ tokens_balance: institution.tokens_balance - boostBudget })
        .eq("id", institution_id);
    }

    return new Response(JSON.stringify({ competition: comp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
