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
    const { action, institution_id } = body;

    if (!institution_id || !action) {
      return new Response(JSON.stringify({ error: "Missing institution_id or action" }), {
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
      .select("id, is_active")
      .eq("id", institution_id)
      .maybeSingle();

    if (instErr || !institution) {
      return new Response(JSON.stringify({ error: "Institution not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!institution.is_active) {
      return new Response(JSON.stringify({ error: "Institution not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_competitions") {
      const { data: competitions, error } = await admin
        .from("competitions")
        .select("*")
        .eq("partner_id", institution_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const comps = competitions || [];
      const submissionCounts: Record<string, number> = {};

      if (comps.length > 0) {
        await Promise.all(
          comps.map(async (c: { id: string }) => {
            const { count } = await admin
              .from("competition_submissions")
              .select("*", { count: "exact", head: true })
              .eq("competition_id", c.id);
            submissionCounts[c.id] = count || 0;
          })
        );
      }

      return new Response(JSON.stringify({ competitions: comps, submissionCounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_submissions") {
      const { competition_id } = body;
      if (!competition_id) {
        return new Response(JSON.stringify({ error: "Missing competition_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: comp, error: compErr } = await admin
        .from("competitions")
        .select("id, partner_id")
        .eq("id", competition_id)
        .maybeSingle();

      if (compErr || !comp || comp.partner_id !== institution_id) {
        return new Response(JSON.stringify({ error: "Competition not found or access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subs, error: subsErr } = await admin
        .from("competition_submissions")
        .select("*")
        .eq("competition_id", competition_id)
        .order("created_at", { ascending: false });

      if (subsErr) throw subsErr;

      const submissions = await Promise.all(
        (subs || []).map(async (sub: { user_id: string; [key: string]: unknown }) => {
          const { data: userData } = await admin
            .from("users")
            .select("pen_name, email")
            .eq("id", sub.user_id)
            .maybeSingle();
          return {
            ...sub,
            writer_name: userData?.pen_name || "Writer",
            writer_email: userData?.email || "",
          };
        })
      );

      return new Response(JSON.stringify({ submissions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_criteria") {
      const { data: criteria, error } = await admin
        .from("institution_evaluation_criteria")
        .select("id, name, description, weight")
        .eq("institution_id", institution_id)
        .order("created_at");

      if (error) throw error;

      return new Response(JSON.stringify({ criteria: criteria || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_submission_evaluation") {
      const { submission_id, competition_id, ai_evaluation } = body;
      if (!submission_id || !competition_id) {
        return new Response(JSON.stringify({ error: "Missing submission_id or competition_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: comp } = await admin
        .from("competitions")
        .select("partner_id")
        .eq("id", competition_id)
        .maybeSingle();

      if (!comp || comp.partner_id !== institution_id) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin
        .from("competition_submissions")
        .update({ ai_evaluation, ai_evaluated_at: new Date().toISOString() })
        .eq("id", submission_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_works") {
      const { data: works, error } = await admin
        .from("institution_works")
        .select("*")
        .eq("institution_id", institution_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ works: works || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "insert_work") {
      const { title, summary, file_url, file_name, notes } = body;
      if (!title) {
        return new Response(JSON.stringify({ error: "Missing title" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: work, error } = await admin
        .from("institution_works")
        .insert({
          institution_id,
          title,
          summary: summary || null,
          file_url: file_url || null,
          file_name: file_name || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ work }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_work_evaluation") {
      const { work_id, ai_evaluation } = body;
      if (!work_id) {
        return new Response(JSON.stringify({ error: "Missing work_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await admin
        .from("institution_works")
        .select("institution_id")
        .eq("id", work_id)
        .maybeSingle();

      if (!existing || existing.institution_id !== institution_id) {
        return new Response(JSON.stringify({ error: "Work not found or access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin
        .from("institution_works")
        .update({ ai_evaluation, ai_evaluated_at: new Date().toISOString() })
        .eq("id", work_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_work") {
      const { work_id } = body;
      if (!work_id) {
        return new Response(JSON.stringify({ error: "Missing work_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await admin
        .from("institution_works")
        .select("institution_id")
        .eq("id", work_id)
        .maybeSingle();

      if (!existing || existing.institution_id !== institution_id) {
        return new Response(JSON.stringify({ error: "Work not found or access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin
        .from("institution_works")
        .delete()
        .eq("id", work_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "object" && err !== null) {
      const e = err as Record<string, unknown>;
      message = String(e.message || e.msg || e.error || JSON.stringify(err));
    } else if (typeof err === "string") {
      message = err;
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
