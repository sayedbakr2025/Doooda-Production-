import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ModerationRequest {
  content: string;
  content_type: "reply" | "topic";
  content_id?: string;
  topic_category?: string;
  recent_user_posts?: string[];
}

interface ModerationResult {
  status: "published" | "pending_review";
  flags: {
    spam: boolean;
    toxic: boolean;
    duplicate: boolean;
    off_topic: boolean;
  };
  reason: string;
}

const SPAM_PATTERNS = [
  /https?:\/\/[^\s]{10,}/gi,
  /\b(buy now|click here|free money|make money fast|earn \$|whatsapp|telegram|discount code)\b/gi,
  /(.)\1{6,}/g,
  /[A-Z]{15,}/g,
];

const TOXIC_PATTERNS = [
  /\b(idiot|stupid|moron|loser|trash|garbage|worthless|dumb|shut up|go to hell)\b/gi,
  /\b(أحمق|غبي|تافه|مجنون|اخرس|اغرب|كلب|خنزير)\b/g,
];

function runHeuristicChecks(
  content: string,
  recentPosts: string[],
  category: string
): ModerationResult {
  const flags = { spam: false, toxic: false, duplicate: false, off_topic: false };
  const reasons: string[] = [];

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      flags.spam = true;
      reasons.push("spam_pattern");
      break;
    }
  }

  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(content)) {
      flags.toxic = true;
      reasons.push("toxic_language");
      break;
    }
  }

  const normalized = content.trim().toLowerCase();
  for (const prev of recentPosts) {
    if (prev.trim().toLowerCase() === normalized) {
      flags.duplicate = true;
      reasons.push("duplicate_post");
      break;
    }
    const sim = normalized.length > 20 && prev.toLowerCase().includes(normalized.substring(0, 20));
    if (sim) {
      flags.duplicate = true;
      reasons.push("near_duplicate");
      break;
    }
  }

  const isLikelyOffTopic =
    content.trim().split(/\s+/).length < 3 &&
    !["general", "feedback", "request_feedback"].includes(category);
  if (isLikelyOffTopic) {
    flags.off_topic = true;
    reasons.push("too_short_for_category");
  }

  const flagged = flags.spam || flags.toxic || flags.duplicate || flags.off_topic;

  return {
    status: flagged ? "pending_review" : "published",
    flags,
    reason: reasons.join(", ") || "clean",
  };
}

async function callAI(
  content: string,
  apiKey: string,
  baseUrl: string,
  modelId: string,
  personaPrompt?: string
): Promise<{ flagged: boolean; flags: Partial<ModerationResult["flags"]>; reason: string }> {
  const systemPrompt = personaPrompt ||
    `أنت دووودة، رفيق كتابة ومحكّم محتوى لمجتمع كُتّاب. مهمتك تحليل المحتوى بهدوء وموضوعية. لا تذكر أبداً أنك AI أو نموذج لغوي.`;

  const userPrompt = `حلّل النص التالي لمجتمع كتابة. أجب بـ JSON فقط بدون أي نص إضافي.
الشكل: {"spam":bool,"toxic":bool,"duplicate":bool,"off_topic":bool}

النص: ${content.substring(0, 400)}`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 60,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { flagged: false, flags: {}, reason: "ai_skip" };

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw);
    const flagged = !!(parsed.spam || parsed.toxic || parsed.duplicate || parsed.off_topic);
    const reasons = Object.entries(parsed)
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    return { flagged, flags: parsed, reason: reasons.join(", ") || "clean" };
  } catch {
    return { flagged: false, flags: {}, reason: "ai_error" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: ModerationRequest = await req.json();
    const { content, content_type, content_id, topic_category = "general", recent_user_posts = [] } = body;

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ status: "published", flags: {}, reason: "empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const heuristic = runHeuristicChecks(content, recent_user_posts, topic_category);

    let finalResult: ModerationResult = heuristic;

    if (!heuristic.flags.spam && !heuristic.flags.toxic && !heuristic.flags.duplicate) {
      const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

      let apiKey: string | null = null;
      let baseUrl = "https://api.deepseek.com/v1";
      let modelId = "deepseek-reasoner";
      let personaPrompt: string | undefined;

      if (deepseekApiKey) {
        apiKey = deepseekApiKey;
      } else {
        const { data: provider } = await supabase
          .from("ai_providers")
          .select("api_key, base_url, model_id, provider_config")
          .eq("is_active", true)
          .maybeSingle();

        if (provider?.api_key && provider?.base_url) {
          apiKey = provider.api_key;
          baseUrl = provider.base_url;
          modelId = provider.provider_config?.moderation_model || provider.model_id || "gpt-4o-mini";
        }
      }

      const { data: persona } = await supabase
        .from("doooda_persona_versions")
        .select("persona_prompt_ar, guardrails_ar")
        .eq("is_active", true)
        .maybeSingle();

      if (persona) {
        personaPrompt = `${persona.persona_prompt_ar}\n\n${persona.guardrails_ar}`;
      }

      if (apiKey) {
        const aiCheck = await callAI(content, apiKey, baseUrl, modelId, personaPrompt);

        if (aiCheck.flagged) {
          finalResult = {
            status: "pending_review",
            flags: { ...heuristic.flags, ...aiCheck.flags } as ModerationResult["flags"],
            reason: [heuristic.reason !== "clean" ? heuristic.reason : "", aiCheck.reason]
              .filter(Boolean)
              .join(", "),
          };
        }
      }
    }

    if (content_id && finalResult.status === "pending_review") {
      const table = content_type === "reply" ? "community_replies" : "community_topics";
      await supabase
        .from(table)
        .update({
          moderation_status: "pending_review",
          moderation_flags: finalResult.flags,
          moderation_checked_at: new Date().toISOString(),
        })
        .eq("id", content_id);

      await supabase.from("admin_notifications").insert({
        type: "warning",
        title: "Content flagged for review",
        body: `A community ${content_type} was flagged: ${finalResult.reason}. Content: "${content.substring(0, 80)}..."`,
        payload: {
          content_type,
          content_id,
          flags: finalResult.flags,
          reason: finalResult.reason,
        },
      });
    } else if (content_id) {
      const table = content_type === "reply" ? "community_replies" : "community_topics";
      await supabase
        .from(table)
        .update({
          moderation_status: "published",
          moderation_flags: null,
          moderation_checked_at: new Date().toISOString(),
        })
        .eq("id", content_id);
    }

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[moderate-content] Error:", err);
    return new Response(
      JSON.stringify({ status: "published", flags: {}, reason: "error_fallback" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
