import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // POST /create-session — create a new active session
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const projectId = body?.project_id ?? null;

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          project_id: projectId,
          status: "active",
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("[create-session] Insert error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create session", details: error?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("[create-session] Created session:", data.id, "user:", user.id, "project:", projectId);

      return new Response(
        JSON.stringify({ session_id: data.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // PATCH /create-session — archive or update a session
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const { session_id, status } = body as { session_id: string; status: string };

      if (!session_id) {
        return new Response(
          JSON.stringify({ error: "session_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const updatePayload: Record<string, unknown> = {
        last_active_at: new Date().toISOString(),
      };

      if (status === "archived") {
        updatePayload.status = "archived";
        updatePayload.archived_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("chat_sessions")
        .update(updatePayload)
        .eq("id", session_id)
        .eq("user_id", user.id); // RLS-equivalent guard

      if (error) {
        console.error("[create-session] Update error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update session", details: error?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-session] Unexpected error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
