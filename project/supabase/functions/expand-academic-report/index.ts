import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FULL_AR_SCHEMA = `{
  "title": "عنوان التقرير الأكاديمي",
  "abstract": "ملخص شامل للتحليل (150-200 كلمة)",
  "introduction": "مقدمة تحليلية مفصلة (100-150 كلمة)",
  "methodology": "المنهجية المستخدمة في التحليل (80-120 كلمة)",
  "structural_analysis": "تحليل البنية الدرامية بالتفصيل (150-200 كلمة)",
  "tension_analysis": "تحليل مستويات التوتر والتصاعد (100-150 كلمة)",
  "pacing_analysis": "تحليل الإيقاع والسرد (100-150 كلمة)",
  "causality_analysis": "تحليل السببية والترابط بين الأحداث (100-150 كلمة)",
  "character_dynamics_analysis": "تحليل ديناميات الشخصيات (100-150 كلمة)",
  "thematic_cohesion_analysis": "تحليل التماسك الموضوعي (100-150 كلمة)",
  "dramatic_arc_evaluation": "تقييم القوس الدرامي الكلي (100-150 كلمة)",
  "act_structure_evaluation": "تقييم بنية الفصول الثلاثة (100-150 كلمة)",
  "midpoint_evaluation": "تقييم نقطة المنتصف الدرامية (80-100 كلمة)",
  "climax_evaluation": "تقييم الذروة الدرامية (80-100 كلمة)",
  "structural_imbalances": ["قائمة بعدم التوازنات البنيوية المحددة"],
  "redundancy_and_filler_analysis": "تحليل التكرار والحشو (80-120 كلمة)",
  "unused_setups_analysis": "تحليل الإعدادات غير المستخدمة (80-120 كلمة)",
  "global_strengths": ["نقاط القوة العالمية المحددة"],
  "global_weaknesses": ["نقاط الضعف العالمية المحددة"],
  "revision_strategy": "استراتيجية المراجعة والتحسين الشاملة (150-200 كلمة)",
  "final_evaluation": "التقييم النهائي والتوصية الكلية (100-150 كلمة)",
  "quality_score": "درجة الجودة (0 إلى 1)"
}`;

const FULL_EN_SCHEMA = `{
  "title": "Academic Report Title",
  "abstract": "Comprehensive analysis summary (150-200 words)",
  "introduction": "Detailed analytical introduction (100-150 words)",
  "methodology": "Methodology used in analysis (80-120 words)",
  "structural_analysis": "Detailed dramatic structure analysis (150-200 words)",
  "tension_analysis": "Tension levels and escalation analysis (100-150 words)",
  "pacing_analysis": "Pacing and narrative rhythm analysis (100-150 words)",
  "causality_analysis": "Causality and event linkage analysis (100-150 words)",
  "character_dynamics_analysis": "Character dynamics analysis (100-150 words)",
  "thematic_cohesion_analysis": "Thematic cohesion analysis (100-150 words)",
  "dramatic_arc_evaluation": "Overall dramatic arc evaluation (100-150 words)",
  "act_structure_evaluation": "Three-act structure evaluation (100-150 words)",
  "midpoint_evaluation": "Dramatic midpoint evaluation (80-100 words)",
  "climax_evaluation": "Dramatic climax evaluation (80-100 words)",
  "structural_imbalances": ["List of specific structural imbalances"],
  "redundancy_and_filler_analysis": "Redundancy and filler analysis (80-120 words)",
  "unused_setups_analysis": "Unused setups analysis (80-120 words)",
  "global_strengths": ["List of specific global strengths"],
  "global_weaknesses": ["List of specific global weaknesses"],
  "revision_strategy": "Comprehensive revision and improvement strategy (150-200 words)",
  "final_evaluation": "Final evaluation and overall recommendation (100-150 words)",
  "quality_score": "Quality score (0 to 1)"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json() as {
      plot_project_id: string;
      language: 'ar' | 'en';
    };

    const { plot_project_id, language } = body;
    if (!plot_project_id) throw new Error("Missing plot_project_id");

    const { data: analysisRow, error: analysisError } = await adminClient
      .from("plot_analysis")
      .select("analysis_json")
      .eq("plot_project_id", plot_project_id)
      .maybeSingle();

    if (analysisError || !analysisRow) {
      return new Response(
        JSON.stringify({ error: language === 'ar' ? 'لم يُعثر على تحليل محفوظ' : 'No saved analysis found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error: userError2 } = await adminClient
      .from("users")
      .select("tokens_balance, plan")
      .eq("id", user.id)
      .maybeSingle();

    if (userError2 || !userData) throw new Error("Failed to get user token balance");

    const FIXED_COST = 80;
    if (userData.tokens_balance < FIXED_COST) {
      return new Response(
        JSON.stringify({
          error: language === 'ar' ? 'رصيد التوكنز غير كافٍ' : 'Insufficient token balance',
          required: FIXED_COST,
          available: userData.tokens_balance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) throw new Error("DeepSeek API key not configured");

    const existing = analysisRow.analysis_json as Record<string, unknown>;

    const summaryContext = {
      overall_quality: existing.overall_quality,
      strengths: existing.strengths,
      key_issues: existing.key_issues,
      recommendations: existing.recommendations,
      structural_warnings: existing.structural_warnings,
      filler_scenes: existing.filler_scenes,
      unresolved_elements: existing.unresolved_elements,
      global_structure: existing.global_structure,
      chapter_scores: Array.isArray(existing.chapter_scores)
        ? (existing.chapter_scores as Array<Record<string, unknown>>).map(c => ({
            ci: c.chapter_index,
            ss: c.structure_score,
            ts: c.tension_score,
            ps: c.pacing_score,
            rec: c.recommendation,
          }))
        : [],
    };

    const schema = language === 'ar' ? FULL_AR_SCHEMA : FULL_EN_SCHEMA;

    const systemPrompt = language === 'ar'
      ? `أنت دووودة الناقد - محلل بنية درامية أكاديمي متخصص. اكتب تقريراً أكاديمياً شاملاً ومفصلاً بناءً على نتائج التحليل المقدمة. نبرة أكاديمية رسمية. لا تذكر نماذج أو مزودين. أخرج JSON فقط وفق هذا الهيكل:\n${schema}`
      : `You are doooda critic - a specialized academic dramatic structure analyst. Write a comprehensive detailed academic report based on the provided analysis results. Academic formal tone. No models/providers. Output JSON only with this structure:\n${schema}`;

    const userPrompt = language === 'ar'
      ? `اكتب تقريراً أكاديمياً شاملاً لهذا التحليل:\n${JSON.stringify(summaryContext)}\nأخرج JSON فقط.`
      : `Write a comprehensive academic report for this analysis:\n${JSON.stringify(summaryContext)}\nOutput JSON only.`;

    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
    }

    const openaiData = await deepseekResponse.json();
    const reportText: string = openaiData.choices[0].message.content;
    const usage = openaiData.usage;

    let fullReport;
    try {
      fullReport = JSON.parse(reportText);
    } catch (_) {
      const stripped = reportText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      fullReport = JSON.parse(stripped);
    }

    const userPlan = userData.plan || 'free';
    const MULTIPLIER = userPlan === 'free' ? 1.5 : 2.0;
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    const { data: deductResult, error: deductError } = await adminClient.rpc("log_and_deduct_tokens", {
      p_user_id: user.id,
      p_feature: "expand_academic_report",
      p_provider: "deepseek",
      p_model: "deepseek-chat",
      p_prompt_tokens: promptTokens,
      p_completion_tokens: completionTokens,
      p_multiplier: MULTIPLIER,
      p_request_metadata: { plot_project_id, language },
      p_response_metadata: { quality_score: fullReport.quality_score || 0 },
    });

    if (deductError) {
      console.error("[expand-academic-report] deductError:", deductError);
      throw new Error("Failed to process token usage");
    }
    if (!deductResult.success) {
      return new Response(
        JSON.stringify({ error: language === 'ar' ? 'رصيد التوكنز غير كافٍ' : 'Insufficient token balance' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatedAnalysis = { ...existing, academic_report: fullReport };
    await adminClient.from("plot_analysis")
      .update({ analysis_json: updatedAnalysis })
      .eq("plot_project_id", plot_project_id);

    return new Response(
      JSON.stringify({
        success: true,
        academic_report: fullReport,
        tokens_used: deductResult.tokens_deducted,
        tokens_remaining: deductResult.tokens_remaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[expand-academic-report] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
