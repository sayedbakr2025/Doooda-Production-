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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { referral_code } = await req.json();
    if (!referral_code || typeof referral_code !== "string") {
      return new Response(JSON.stringify({ error: "missing referral_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("complete_referral", {
      p_referred_user_id: user.id,
      p_referral_code: referral_code,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, commission_type, commission_value, total_signups, total_conversions, total_commission_earned")
      .eq("referral_code", referral_code)
      .eq("status", "approved")
      .maybeSingle();

    if (affiliate) {
      const { data: conversion } = await supabase
        .from("affiliate_conversions")
        .insert({
          affiliate_id: affiliate.id,
          user_id: user.id,
          event_type: "signup",
          amount: 0,
          currency: "USD",
          metadata: { referral_code },
        })
        .select("id")
        .single();

      if (conversion) {
        const commissionAmount = affiliate.commission_type === "fixed"
          ? affiliate.commission_value
          : 0;

        if (commissionAmount > 0) {
          await supabase.from("affiliate_commissions").insert({
            affiliate_id: affiliate.id,
            conversion_id: conversion.id,
            amount: commissionAmount,
            currency: "USD",
            status: "pending",
            description: `Signup commission for referral_code ${referral_code}`,
          });
        }

        await supabase.from("affiliates").update({
          total_signups: affiliate.total_signups + 1,
          total_conversions: affiliate.total_conversions + 1,
          total_commission_earned: affiliate.total_commission_earned + commissionAmount,
          updated_at: new Date().toISOString(),
        }).eq("id", affiliate.id);
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
