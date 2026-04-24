import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BlurbResponse {
  hook: string;
  short_blurb: string;
  full_blurb: string;
}

async function callAIProvider(
  supabase: ReturnType<typeof createClient>,
  userPrompt: string,
  systemPrompt: string
): Promise<string> {
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

  let apiKey: string;
  let baseUrl: string;
  let model: string;

  if (deepseekApiKey) {
    apiKey = deepseekApiKey;
    baseUrl = "https://api.deepseek.com/v1";
    model = "deepseek-chat";
  } else {
    const { data: provider } = await supabase
      .from("ai_providers")
      .select("provider_config, api_key_encrypted")
      .eq("is_active", true)
      .maybeSingle();

    if (!provider) throw new Error("No active AI provider configured");

    const config = provider.provider_config as Record<string, unknown> ?? {};
    apiKey = provider.api_key_encrypted as string;
    baseUrl = (config.base_url as string) || "https://api.openai.com/v1";
    model = (config.model as string) || "gpt-4o-mini";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI provider error: ${err}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

async function buildSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  lang: string
): Promise<string> {
  const { data: persona } = await supabase
    .from("doooda_persona_versions")
    .select("persona_prompt_ar, persona_prompt_en, guardrails_ar, guardrails_en")
    .eq("is_active", true)
    .maybeSingle();

  if (persona) {
    const personaText = lang === "ar" ? persona.persona_prompt_ar : persona.persona_prompt_en;
    const guardrails = lang === "ar" ? persona.guardrails_ar : persona.guardrails_en;
    const base = `${personaText}\n\n---\n\n${guardrails}`;

    if (lang === "ar") {
      return `${base}\n\n---\n\nأنت الآن تكتب نصوصًا تسويقية لـ Amazon KDP. ردودك بالعربية الفصحى الجذابة. أرجع JSON فقط بلا أي نص إضافي.`;
    }
    return `${base}\n\n---\n\nYou are now writing Amazon KDP marketing copy. Respond in fluent, compelling English. Return JSON only with no extra text.`;
  }

  if (lang === "ar") {
    return `أنت دووودة، رفيق كتابة متخصص في النصوص التسويقية لـ Amazon KDP. ردودك بالعربية الفصحى الجذابة. أرجع JSON فقط بلا أي نص إضافي.`;
  }
  return `You are doooda, a writing companion specializing in Amazon KDP marketing copy. Respond in fluent, compelling English. Return JSON only with no extra text.`;
}

function buildUserPrompt(
  lang: string,
  title: string,
  projectType: string,
  genre: string,
  idea: string,
  characters: string[]
): string {
  const charList = characters.slice(0, 3).join("، ");

  if (lang === "ar") {
    return `اكتب نصوصًا تسويقية لـ Amazon KDP للكتاب التالي:

العنوان: ${title}
النوع: ${projectType}
التصنيف: ${genre}
الفكرة: ${idea || "غير محدد"}
الشخصيات الرئيسية: ${charList || "غير محدد"}

أرجع JSON فقط بهذا الشكل بالضبط:
{
  "hook": "جملة واحدة جذابة لا تتجاوز 20 كلمة",
  "short_blurb": "وصف قصير من 40-50 كلمة",
  "full_blurb": "وصف كامل من 150-170 كلمة مناسب للغلاف الخلفي على Amazon"
}`;
  }

  return `Write Amazon KDP marketing copy for the following book:

Title: ${title}
Type: ${projectType}
Genre: ${genre}
Premise: ${idea || "Not specified"}
Main characters: ${characters.slice(0, 3).join(", ") || "Not specified"}

Return JSON only in this exact format:
{
  "hook": "One compelling hook sentence (max 20 words)",
  "short_blurb": "Short description of 40-50 words",
  "full_blurb": "Full back-cover description of 150-170 words suitable for Amazon"
}`;
}

function extractJson(text: string): BlurbResponse | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed.hook && parsed.short_blurb && parsed.full_blurb) {
      return parsed as BlurbResponse;
    }
  } catch {
    // try extracting JSON block
  }

  const match = text.match(/\{[\s\S]*"hook"[\s\S]*"short_blurb"[\s\S]*"full_blurb"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.hook && parsed.short_blurb && parsed.full_blurb) {
        return parsed as BlurbResponse;
      }
    } catch {
      return null;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const projectId: string = body.project_id;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, project_type, idea, language, user_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: kdpMeta } = await supabase
      .from("kdp_metadata")
      .select("categories, language")
      .eq("project_id", projectId)
      .maybeSingle();

    const { data: characters } = await supabase
      .from("project_characters")
      .select("name")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .limit(5);

    const lang = kdpMeta?.language || project.language || "ar";
    const genre = (kdpMeta?.categories as string[])?.[0] || project.project_type || "";
    const characterNames = (characters ?? []).map((c: { name: string }) => c.name).filter(Boolean);

    const systemPrompt = await buildSystemPrompt(supabase, lang);
    const userPrompt = buildUserPrompt(
      lang,
      project.title,
      project.project_type,
      genre,
      project.idea ?? "",
      characterNames
    );

    const rawText = await callAIProvider(supabase, userPrompt, systemPrompt);
    const blurb = extractJson(rawText);

    if (!blurb) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(blurb), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
