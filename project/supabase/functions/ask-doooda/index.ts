import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FALLBACK_RESPONSES: Record<string, string[]> = {
  ar: [
    "خلّينا نكمّل بعد لحظة، واضح إن الفكرة محتاجة ترتيب بسيط.",
    "لحظة واحدة، خلّيني أرتب أفكاري وأرجعلك.",
    "حاسس إننا محتاجين نهدأ لحظة ونكمّل. أنا معاك.",
  ],
  en: [
    "Let's take a short pause and continue in a moment.",
    "Give me a moment to gather my thoughts, and I'll be right back.",
    "Let's slow down for a second and pick this back up shortly.",
  ],
};

const AI_LEAK_PATTERNS = [
  /\bAI\b/g,
  /\bartificial intelligence\b/gi,
  /\blanguage model\b/gi,
  /\bLLM\b/g,
  /\bGPT[-\s]?\d/gi,
  /\bOpenAI\b/gi,
  /\bDeepSeek\b/gi,
  /\bGemini\b/gi,
  /\bClaude\b/gi,
  /\bAnthropic\b/gi,
  /\btrained on\b/gi,
  /\btraining data\b/gi,
  /\bmy (training|programming|instructions|guidelines|policies)\b/gi,
  /\bas an? (AI|assistant|language model|chatbot|bot)\b/gi,
  /\bI'?m an? (AI|assistant|language model|chatbot|bot)\b/gi,
  /\bذكاء اصطناعي\b/g,
  /\bنموذج لغوي?\b/g,
  /\bتدريبي\b/g,
  /\bبيانات التدريب\b/g,
  /\bسياسات(ي)?\b/g,
];

const DEFAULT_SYSTEM_EN = `You are doooda, a friendly writing companion. Help writers clarify ideas, improve flow, and develop their work. Be concise. Reply in the writer's language.`;

const DEFAULT_SYSTEM_AR = `أنت دووودة، رفيق كتابة ودود. ساعد الكاتب في توضيح أفكاره وتحسين نصه. كن موجزاً. أجب بلغة الكاتب.`;

function sanitizeResponse(text: string): string {
  let result = text;
  for (const pattern of AI_LEAK_PATTERNS) {
    result = result.replace(pattern, "");
  }
  result = result.replace(/\s{2,}/g, " ").trim();
  return result;
}

function pickFallback(lang: string): string {
  const arr = FALLBACK_RESPONSES[lang] || FALLBACK_RESPONSES["en"];
  return arr[Math.floor(Math.random() * arr.length)];
}

function getModePrompt(mode: string, lang: string): string {
  const modes: Record<string, Record<string, string>> = {
    explain: { en: `Explain briefly.`, ar: `اشرح باختصار.` },
    review: { en: `Review clarity, rhythm, tone.`, ar: `راجع الوضوح والإيقاع والنبرة.` },
    idea: { en: `Suggest ideas.`, ar: `اقترح أفكاراً.` },
  };
  return modes[mode]?.[lang] || "";
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function resolveAdaptiveMaxTokens(
  lastUserMessage: string,
  mode: string | undefined,
  hasContext: boolean,
  plan: string
): number {
  const msgLen = lastUserMessage.trim().length;

  const planCeiling = plan === "free" ? 1000 : 2000;

  let base: number;
  if (msgLen < 60) {
    base = 600;
  } else if (msgLen < 200) {
    base = 800;
  } else if (msgLen < 600) {
    base = 1000;
  } else {
    base = 1500;
  }

  if (mode === "review") base = Math.max(base, 800);
  if (hasContext) base = Math.min(base + 200, planCeiling);

  return Math.min(base, planCeiling);
}

interface CharacterContext {
  character: {
    id: string;
    name: string;
    dialogue_name: string;
    description?: string;
    personality_traits?: string;
    background?: string;
    speaking_style?: string;
    speech_style?: string;
    dialect?: string;
    goals?: string;
    fears?: string;
  };
  dialogue: {
    dialogueName: string;
    dialogueText: string;
  };
}

type ProjectType = 'novel' | 'short_story' | 'long_story' | 'book' | 'film_script' | 'tv_series' | 'theatre_play' | 'radio_series' | 'children_story';

interface RequestBody {
  messages: Array<{ role: "user" | "doooda"; content: string }>;
  language: "ar" | "en";
  mode?: "explain" | "review" | "idea";
  context?: string;
  selectedText?: string;
  characterContext?: CharacterContext;
  projectType?: ProjectType;
  genres?: string[];
  tone?: string;
  project_id?: string;
}

function getGenreToneSystemAddition(genres: string[] | undefined, tone: string | undefined, lang: string): string {
  const parts: string[] = [];
  if (genres && genres.length > 0) {
    const label = lang === 'ar' ? 'تصنيف' : 'Genre';
    parts.push(`${label}: ${genres.join(', ')}`);
  }
  if (tone) {
    const label = lang === 'ar' ? 'نبرة' : 'Tone';
    parts.push(`${label}: ${tone}`);
  }
  if (parts.length === 0) return '';
  if (lang === 'ar') {
    return `${parts.join(' | ')}\nاضبط أسلوب الرد بما يتناسب مع هذا التصنيف والنبرة.`;
  }
  return `${parts.join(' | ')}\nAdapt your feedback style to match this genre and tone.`;
}

function getProjectTypeSystemAddition(projectType: ProjectType | undefined, lang: string): string {
  if (!projectType) return "";
  const additions: Record<ProjectType, Record<string, string>> = {
    novel: { ar: "", en: "" },
    short_story: { ar: "", en: "" },
    long_story: { ar: "", en: "" },
    book: {
      ar: "كتاب غير روائي: وضوح، منطق، دقة.",
      en: "Non-fiction: clarity, logic, accuracy.",
    },
    film_script: {
      ar: "سيناريو: حوار مكثف، توجيهات بصرية، ترويسات INT/EXT.",
      en: "Screenplay: tight dialogue, visual action, INT/EXT headers.",
    },
    tv_series: {
      ar: "مسلسل: قوس الحلقة، cliffhanger، توزيع الشخصيات.",
      en: "TV series: episode arc, cliffhanger, character pacing.",
    },
    theatre_play: {
      ar: "مسرحية: حوار ومونولوج، تعبير لفظي، إرشادات مسرحية.",
      en: "Theatre: dialogue, monologue, stage directions.",
    },
    radio_series: {
      ar: "إذاعي: صوت فقط، مؤثرات، نبرة، لا وصف بصري.",
      en: "Radio: audio-only, sound effects, voice tones.",
    },
    children_story: {
      ar: "أطفال: جمل قصيرة، لغة بسيطة، مواضيع آمنة.",
      en: "Children's: short sentences, simple words, safe topics.",
    },
  };
  return additions[projectType]?.[lang] || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    console.log('[ask-doooda] Authorization header present:', !!authHeader);

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body: RequestBody = await req.json();
    const lang = body.language || "en";

    if (!body.messages || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({
          error: lang === 'ar' ? 'مفتاح DeepSeek غير متوفر' : 'DeepSeek API key not configured',
          blocked: false,
          reason: "no_api_key"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve billing user: if a project_id is provided and the caller is a collaborator,
    // deduct tokens from the project owner instead of the collaborator.
    let billingUserId = user.id;
    if (body.project_id) {
      const { data: projectRow } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", body.project_id)
        .maybeSingle();

      if (projectRow?.user_id && projectRow.user_id !== user.id) {
        // Caller is a collaborator — verify they have an active collaborator record
        const { data: collabRow } = await supabase
          .from("project_collaborators")
          .select("id")
          .eq("project_id", body.project_id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (collabRow) {
          billingUserId = projectRow.user_id;
          console.log('[ask-doooda] billing routed to project owner:', billingUserId, 'for collaborator:', user.id);
        }
      }
    }

    const [configResult, userResult, personaResult] = await Promise.all([
      supabase
        .from("doooda_config")
        .select("session_memory_enabled, max_context_length")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("users")
        .select("tokens_balance, plan")
        .eq("id", billingUserId)
        .maybeSingle(),
      supabase
        .from("doooda_persona_versions")
        .select("persona_prompt_en, persona_prompt_ar, guardrails_en, guardrails_ar")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    const config = configResult.data;
    const userData = userResult.data;
    const activePersona = personaResult.data;

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userBalance = userData.tokens_balance || 0;
    const userPlan = userData.plan || 'free';
    const MULTIPLIER = userPlan === 'free' ? 1.5 : 2.0;
    const MIN_TOKENS = 50;

    let systemPrompt: string;
    if (activePersona) {
      const persona = lang === "ar" ? activePersona.persona_prompt_ar : activePersona.persona_prompt_en;
      const guardrails = lang === "ar" ? activePersona.guardrails_ar : activePersona.guardrails_en;
      systemPrompt = `${persona}\n\n---\n\n${guardrails}`;
    } else {
      systemPrompt = lang === "ar" ? DEFAULT_SYSTEM_AR : DEFAULT_SYSTEM_EN;
    }

    if (body.characterContext) {
      const { character, dialogue } = body.characterContext;

      const effectiveSpeakingStyle = character.speech_style || character.speaking_style;

      const traitParts = [
        character.personality_traits && (lang === "ar" ? `الشخصية: ${character.personality_traits}` : `Personality: ${character.personality_traits}`),
        effectiveSpeakingStyle && (lang === "ar" ? `أسلوب الكلام: ${effectiveSpeakingStyle}` : `Style: ${effectiveSpeakingStyle}`),
        character.dialect && (lang === "ar" ? `اللهجة المحددة: ${character.dialect}` : `Defined Dialect: ${character.dialect}`),
        character.goals && (lang === "ar" ? `الأهداف: ${character.goals}` : `Goals: ${character.goals}`),
      ].filter(Boolean).join(' | ');

      const trimmedDialogue = dialogue.dialogueText.length > 300
        ? dialogue.dialogueText.slice(0, 300) + "..."
        : dialogue.dialogueText;

      const hasDefinedStyle = !!(effectiveSpeakingStyle || character.dialect);

      if (lang === "ar") {
        systemPrompt += `\n\n---\n\n`;
        systemPrompt += `CRITICAL RULE: لا تحكم على الحوار بناءً على اسم الشخصية أو لقبها أو أي افتراض خارجي. فقط الخصائص المحددة أدناه هي المرجع.\n\n`;
        systemPrompt += `شخصية: ${character.name}`;
        if (traitParts) systemPrompt += ` | ${traitParts}`;
        systemPrompt += `\nحوار: "${trimmedDialogue}"\n\n`;
        systemPrompt += `تعليمات التحليل:\n`;
        if (effectiveSpeakingStyle) {
          systemPrompt += `- أسلوب الكلام المحدد: "${effectiveSpeakingStyle}". قيّم هل الحوار يتبعه أم لا.\n`;
        }
        if (character.dialect) {
          systemPrompt += `- اللهجة المحددة: "${character.dialect}". قيّم هل الحوار يستخدمها أم لا.\n`;
        }
        if (hasDefinedStyle) {
          systemPrompt += `- إذا كان الحوار متوافقاً مع الأسلوب واللهجة المحددين، قل ذلك بوضوح.\n`;
          systemPrompt += `- لا تقترح تعديلات بناءً على توقعاتك من الاسم أو اللقب.\n`;
        } else {
          systemPrompt += `- لا يوجد أسلوب كلام أو لهجة محددة لهذه الشخصية. قيّم الاتساق مع السمات المذكورة فقط.\n`;
          systemPrompt += `- أي حوار لا يتعارض مع السمات المذكورة هو حوار مقبول.\n`;
        }
      } else {
        systemPrompt += `\n\n---\n\n`;
        systemPrompt += `CRITICAL RULE: Do NOT judge the dialogue based on the character's name, title, or any external assumption. Only the explicitly defined traits below are the reference.\n\n`;
        systemPrompt += `Character: ${character.name}`;
        if (traitParts) systemPrompt += ` | ${traitParts}`;
        systemPrompt += `\nDialogue: "${trimmedDialogue}"\n\n`;
        systemPrompt += `Analysis instructions:\n`;
        if (effectiveSpeakingStyle) {
          systemPrompt += `- Defined speaking style: "${effectiveSpeakingStyle}". Assess whether the dialogue follows it.\n`;
        }
        if (character.dialect) {
          systemPrompt += `- Defined dialect: "${character.dialect}". Assess whether the dialogue uses it.\n`;
        }
        if (hasDefinedStyle) {
          systemPrompt += `- If the dialogue is consistent with the defined style and dialect, state that clearly.\n`;
          systemPrompt += `- Do not suggest changes based on expectations from the character's name or title.\n`;
        } else {
          systemPrompt += `- No speaking style or dialect is defined for this character. Evaluate consistency with stated personality traits only.\n`;
          systemPrompt += `- Any dialogue that does not conflict with the stated traits is acceptable.\n`;
        }
      }
    } else if (body.mode) {
      const modePrompt = getModePrompt(body.mode, lang);
      if (modePrompt) {
        systemPrompt += `\n\n---\n\n${modePrompt}`;
      }
    }

    const projectTypeAddition = getProjectTypeSystemAddition(body.projectType, lang);
    if (projectTypeAddition) {
      systemPrompt += `\n\n---\n\n${projectTypeAddition}`;
    }

    const genreToneAddition = getGenreToneSystemAddition(body.genres, body.tone, lang);
    if (genreToneAddition) {
      systemPrompt += `\n\n---\n\n${genreToneAddition}`;
    }

    if (!body.characterContext && body.selectedText) {
      const maxLen = config?.max_context_length || 400;
      const trimmedText = body.selectedText.length > maxLen
        ? body.selectedText.slice(0, maxLen) + "..."
        : body.selectedText;
      const dialoguePatternNewline = /^([^\n:]{1,100}):\s*\n(.+)/s;
      const dialoguePatternInline = /^([^\n:]{1,100}):\s*(.+)/s;
      const selTrimmed = body.selectedText.trim();
      const isDialogue = dialoguePatternNewline.test(selTrimmed) || dialoguePatternInline.test(selTrimmed);
      if (isDialogue) {
        if (lang === "ar") {
          systemPrompt += `\n\n---\n\nNOTE: النص التالي هو حوار لشخصية. عند تحليله، لا تستنتج أي توقعات من اسم الشخصية أو لقبها. حكم فقط بناءً على ما هو محدد صراحةً في خصائص الشخصية إن وُجدت، وإلا فالحوار مقبول بذاته.\n\n${trimmedText}`;
        } else {
          systemPrompt += `\n\n---\n\nNOTE: The following is a character dialogue. When analyzing it, do NOT infer expectations from the character's name or title. Judge only based on explicitly defined character traits if provided; otherwise the dialogue is acceptable as-is.\n\n${trimmedText}`;
        }
      } else {
        systemPrompt += `\n\n---\n\n${trimmedText}`;
      }
    } else if (!body.characterContext && body.context) {
      const maxLen = config?.max_context_length || 400;
      const trimmedCtx = body.context.length > maxLen
        ? body.context.slice(0, maxLen) + "..."
        : body.context;
      systemPrompt += `\n\n---\n\n${trimmedCtx}`;
    }

    let finalMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    const chatMessages = body.messages.map((m) => ({
      role: m.role === "doooda" ? "assistant" : "user",
      content: m.content,
    }));

    const tokenBudget = userPlan === 'free' ? 800 : 2000;
    const selectedMessages: Array<{ role: string; content: string }> = [];
    let tokensUsed = 0;

    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const msg = chatMessages[i];
      const msgTokens = estimateTokens(msg.content);
      if (tokensUsed + msgTokens > tokenBudget) break;
      selectedMessages.unshift(msg);
      tokensUsed += msgTokens;
    }

    finalMessages = finalMessages.concat(selectedMessages);

    const lastUserMessage = chatMessages.filter(m => m.role === "user").pop()?.content || "";
    const hasContext = !!(body.selectedText || body.context || body.characterContext);

    const maxTokens = resolveAdaptiveMaxTokens(lastUserMessage, body.mode, hasContext, userPlan);

    console.log('[ask-doooda] user:', user.id, '| plan:', userPlan, '| balance:', userBalance, '| adaptive_max_tokens:', maxTokens);

    if (userBalance < MIN_TOKENS) {
      let limitMsg: string;
      if (userPlan === 'free') {
        limitMsg = lang === 'ar'
          ? 'لقد استخدمت رصيدك المجاني بالكامل. قم بالترقية للحصول على المزيد من التوكنز.'
          : 'You have used all your free tokens. Upgrade to get more tokens.';
      } else if (userPlan === 'pro') {
        limitMsg = lang === 'ar'
          ? 'رصيدك انتهى، اشترِ توكنز أو قم بالترقية.'
          : 'Your tokens have run out. Purchase more tokens or upgrade.';
      } else {
        limitMsg = lang === 'ar'
          ? 'اشترِ توكنز إضافية للاستمرار.'
          : 'Purchase additional tokens to continue.';
      }

      return new Response(
        JSON.stringify({
          error: limitMsg,
          type: "LIMIT_REACHED",
          plan: userPlan,
          required: MIN_TOKENS,
          available: userBalance
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ask-doooda] DeepSeek API error:', aiResponse.status, errorText);

      await supabase.from("ai_usage_tracking").insert([{
        user_id: user.id,
        request_type: "question",
        provider_used: "deepseek",
        tokens_used: 0,
        response_status: "error",
        error_message: `deepseek_api_error_${aiResponse.status}`,
      }]);

      return new Response(
        JSON.stringify({ reply: pickFallback(lang), blocked: false, error: "api_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();

    if (!aiData.choices || aiData.choices.length === 0) {
      return new Response(
        JSON.stringify({ reply: pickFallback(lang), blocked: false, error: "no_response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiContent = aiData.choices[0].message.content;
    const promptTokens = aiData.usage?.prompt_tokens ?? 0;
    const completionTokens = aiData.usage?.completion_tokens ?? 0;

    console.log('[ask-doooda] tokens used — prompt:', promptTokens, '| completion:', completionTokens, '| max_tokens_cap:', maxTokens);

    const { data: deductResult, error: deductError } = await supabase.rpc(
      "log_and_deduct_tokens",
      {
        p_user_id: billingUserId,
        p_feature: "ask_doooda",
        p_provider: "deepseek",
        p_model: "deepseek-chat",
        p_prompt_tokens: promptTokens,
        p_completion_tokens: completionTokens,
        p_multiplier: MULTIPLIER,
        p_request_metadata: {
          language: lang,
          mode: body.mode || null,
          has_selected_text: !!body.selectedText,
          has_context: !!body.context,
          message_count: body.messages.length,
          adaptive_max_tokens: maxTokens,
        },
        p_response_metadata: {
          max_tokens: maxTokens,
        },
      }
    );

    if (deductError) {
      console.error('[ask-doooda] Failed to log and deduct tokens:', deductError);
      return new Response(
        JSON.stringify({ reply: pickFallback(lang), blocked: false, error: "token_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!deductResult.success) {
      let limitMsg: string;
      if (userPlan === 'free') {
        limitMsg = lang === 'ar'
          ? 'لقد استخدمت رصيدك المجاني بالكامل. قم بالترقية للحصول على المزيد من التوكنز.'
          : 'You have used all your free tokens. Upgrade to get more tokens.';
      } else if (userPlan === 'pro') {
        limitMsg = lang === 'ar'
          ? 'رصيدك انتهى، اشترِ توكنز أو قم بالترقية.'
          : 'Your tokens have run out. Purchase more tokens or upgrade.';
      } else {
        limitMsg = lang === 'ar'
          ? 'اشترِ توكنز إضافية للاستمرار.'
          : 'Purchase additional tokens to continue.';
      }

      return new Response(
        JSON.stringify({
          error: limitMsg,
          type: "LIMIT_REACHED",
          plan: userPlan,
          required: deductResult.required,
          available: deductResult.available
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sanitized = sanitizeResponse(aiContent);
    const finalReply = sanitized || pickFallback(lang);
    const newBalance = deductResult.tokens_remaining;

    console.log('[ask-doooda] deducted:', deductResult.tokens_deducted, '| new_balance:', newBalance);

    if (newBalance < 100) {
      let lowMsg: string;
      if (userPlan === 'free') {
        lowMsg = lang === 'ar'
          ? `${finalReply}\n\n⚠️ توكنزك قربت تخلص (متبقي ${newBalance}). قم بالترقية للحصول على المزيد!`
          : `${finalReply}\n\n⚠️ Tokens running low (${newBalance} remaining). Upgrade to get more!`;
      } else {
        lowMsg = lang === 'ar'
          ? `${finalReply}\n\n⚠️ توكنزك قربت تخلص (متبقي ${newBalance}). اشترِ المزيد!`
          : `${finalReply}\n\n⚠️ Tokens running low (${newBalance} remaining). Purchase more!`;
      }
      return new Response(
        JSON.stringify({ reply: lowMsg, blocked: false, type: "TOKENS_LOW", tokens_left: newBalance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ reply: finalReply, blocked: false, tokens_left: newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error('[ask-doooda] Unexpected error:', error instanceof Error ? error.message : String(error));

    return new Response(
      JSON.stringify({
        error: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
        blocked: false,
        reason: "unexpected_error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
