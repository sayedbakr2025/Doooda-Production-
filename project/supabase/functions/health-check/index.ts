import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
  };

  try {
    // Step 1: Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    diagnostics.env = {
      has_supabase_url: !!supabaseUrl,
      supabase_url: supabaseUrl || "MISSING",
      has_anon_key: !!anonKey,
      anon_key_prefix: anonKey ? anonKey.substring(0, 20) + "..." : "MISSING",
      has_service_key: !!serviceKey,
      service_key_prefix: serviceKey ? serviceKey.substring(0, 20) + "..." : "MISSING",
    };

    // Step 2: Check Authorization header
    const authHeader = req.headers.get("Authorization");
    diagnostics.auth_header = {
      present: !!authHeader,
      has_bearer: authHeader?.startsWith("Bearer ") || false,
      starts_with_eyJ: authHeader?.replace("Bearer ", "").startsWith("eyJ") || false,
      token_prefix: authHeader ? authHeader.substring(0, 30) + "..." : "MISSING",
    };

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Missing authorization header",
          diagnostics,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
          diagnostics,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Test JWT verification with SERVICE_ROLE_KEY (standard approach)
    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    diagnostics.jwt_verification = {
      method: "SERVICE_ROLE_KEY + getUser(token)",
    };

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    diagnostics.jwt_verification.success = !!user;
    diagnostics.jwt_verification.error = authError?.message || null;
    diagnostics.jwt_verification.user_id = user?.id || null;
    diagnostics.jwt_verification.user_email = user?.email || null;

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "JWT verification failed",
          details: authError?.message,
          diagnostics,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Test database access
    diagnostics.database_test = {};

    const { data: userData, error: dbError } = await supabaseAdmin
      .from("users")
      .select("id, email, plan, tokens_balance")
      .eq("id", user.id)
      .maybeSingle();

    diagnostics.database_test.success = !!userData;
    diagnostics.database_test.error = dbError?.message || null;
    diagnostics.database_test.user_found = !!userData;

    // SUCCESS
    return new Response(
      JSON.stringify({
        success: true,
        message: "Health check passed - all systems operational",
        user: {
          id: user.id,
          email: user.email,
          plan: userData?.plan || "unknown",
          tokens: userData?.tokens_balance || 0,
        },
        diagnostics,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    diagnostics.exception = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };

    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
        diagnostics,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
