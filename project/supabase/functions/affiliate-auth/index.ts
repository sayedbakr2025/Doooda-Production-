import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeAccount(a: any) {
  const { password_hash, ...safe } = a;
  return safe;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    if (action === "hash") {
      const { password } = body;
      if (!password) throw new Error("password required");
      return new Response(JSON.stringify({ hash: await hashPassword(password) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register") {
      const { name, email, password, website, social_links, promotion_method, country } = body;
      if (!name || !email || !password) throw new Error("name, email, password required");

      const existing = await supabase.from("affiliates").select("id").eq("email", email).maybeSingle();
      if (existing.data) {
        return new Response(JSON.stringify({ error: "Email already registered" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: codeData } = await supabase.rpc("generate_referral_code");
      const referral_code = codeData || "AFF" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from("affiliates")
        .insert({
          name,
          email: email.toLowerCase().trim(),
          password_hash: await hashPassword(password),
          website: website || null,
          social_links: social_links || {},
          promotion_method: promotion_method || null,
          country: country || null,
          referral_code,
          status: "pending",
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ account: safeAccount(data) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) throw new Error("email and password required");

      const { data: affiliate, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (error || !affiliate) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hash = await hashPassword(password);
      if (hash !== affiliate.password_hash) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (affiliate.status === "rejected") {
        return new Response(JSON.stringify({ error: "Your application was rejected" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (affiliate.status === "suspended") {
        return new Response(JSON.stringify({ error: "Account suspended" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ account: safeAccount(affiliate) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_account") {
      const { affiliate_id } = body;
      if (!affiliate_id) throw new Error("affiliate_id required");

      const { data } = await supabase.from("affiliates").select("*").eq("id", affiliate_id).maybeSingle();
      if (!data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      return new Response(JSON.stringify({ account: safeAccount(data) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_stats") {
      const { affiliate_id } = body;
      if (!affiliate_id) throw new Error("affiliate_id required");

      const [clicksRes, conversionsRes, commissionsRes, payoutsRes] = await Promise.all([
        supabase
          .from("affiliate_clicks")
          .select("id, created_at")
          .eq("affiliate_id", affiliate_id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("affiliate_conversions")
          .select("*")
          .eq("affiliate_id", affiliate_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("affiliate_commissions")
          .select("*")
          .eq("affiliate_id", affiliate_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", affiliate_id)
          .order("created_at", { ascending: false }),
      ]);

      return new Response(
        JSON.stringify({
          clicks: clicksRes.data || [],
          conversions: conversionsRes.data || [],
          commissions: commissionsRes.data || [],
          payouts: payoutsRes.data || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "request_payout") {
      const { affiliate_id, amount, method, payout_details } = body;
      if (!affiliate_id || !amount || !method) throw new Error("affiliate_id, amount, method required");

      const { data: affiliate } = await supabase.from("affiliates").select("total_commission_earned, total_commission_paid, minimum_payout").eq("id", affiliate_id).maybeSingle();
      if (!affiliate) throw new Error("Affiliate not found");

      const pending = affiliate.total_commission_earned - affiliate.total_commission_paid;
      if (amount > pending) throw new Error("Amount exceeds available balance");
      if (amount < affiliate.minimum_payout) throw new Error(`Minimum payout is $${affiliate.minimum_payout}`);

      const { data, error } = await supabase.from("affiliate_payouts").insert({
        affiliate_id,
        amount,
        method,
        payout_details: payout_details || {},
        status: "pending",
      }).select().single();

      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ payout: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_payout_method") {
      const { affiliate_id, payout_method, payout_details } = body;
      if (!affiliate_id) throw new Error("affiliate_id required");

      const { error } = await supabase.from("affiliates").update({ payout_method, payout_details: payout_details || {}, updated_at: new Date().toISOString() }).eq("id", affiliate_id);
      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_coupons") {
      const { affiliate_id } = body;
      if (!affiliate_id) throw new Error("affiliate_id required");

      const { data } = await supabase.from("affiliate_coupons").select("*").eq("affiliate_id", affiliate_id).order("created_at", { ascending: false });
      return new Response(JSON.stringify({ coupons: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "track_click") {
      const { referral_code, ip_address, user_agent, referrer, landing_page, country } = body;
      if (!referral_code) throw new Error("referral_code required");

      const { data: affiliate } = await supabase.from("affiliates").select("id").eq("referral_code", referral_code).eq("status", "approved").maybeSingle();
      if (!affiliate) {
        return new Response(JSON.stringify({ error: "Invalid referral code" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("affiliate_clicks").insert({
        affiliate_id: affiliate.id,
        ip_address,
        user_agent,
        referrer,
        landing_page,
        country,
      });

      await supabase.rpc("increment_affiliate_clicks", { p_affiliate_id: affiliate.id });

      return new Response(JSON.stringify({ success: true, affiliate_id: affiliate.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
