import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CHARACTERS = 15000;
const MAX_WORDS = 2000;

type DiacritizeMode =
  | "light"
  | "full"
  | "correction_with_diacritics"
  | "proofread"
  | "proofread_advanced"
  | "punctuation"
  | "light_with_punctuation"
  | "full_with_punctuation";

interface DiacritizeRequest {
  text: string;
  mode: DiacritizeMode;
  language: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function hasArabicDiacritics(text: string): boolean {
  const diacriticsRegex = /[\u064B-\u065F]/g;
  const matches = text.match(diacriticsRegex);
  if (!matches) return false;
  return (matches.length / text.length) > 0.1;
}

const PUNCTUATION_PROMPT = `
⚠️ إضافة علامات الترقيم (CRITICAL):

🎯 قواعد علامات الترقيم للغة العربية (احترافية وفق مجمع اللغة العربية):

1️⃣ علامات الترقيم العربية الصحيحة:
   - النقطة (.) - نهاية الجملة التامة
   - الفاصلة العربية (،) - بين الجمل المعطوفة أو العناصر في القائمة
     ⚠️ CRITICAL: استخدم (،) وليس الفاصلة الإنجليزية (,)
   - الفاصلة المنقوطة (؛) - بين جملتين مترابطتين في المعنى أو علاقة سببية
   - النقطتان الرأسيتان (:) - قبل الشرح أو التفصيل أو الأمثلة أو بعد القول
   - علامة الاستفهام العربية (؟) - نهاية السؤال
     ⚠️ CRITICAL: استخدم (؟) وليس (?)
   - علامة التعجب (!) - للتعجب أو التأكيد
   - علامات التنصيص (" ") - للحوارات والاقتباسات
   - الشرطة (-) - للجمل الاعتراضية أو العطف
   - القوسان ((...)) - للملاحظات الجانبية أو التوضيحات
   - النقاط الثلاث (...) - للكلام غير المكتمل أو التردد أو الحذف

2️⃣ ضبط المسافات (⚠️ CRITICAL):
   ✅ لا مسافة قبل علامة الترقيم
   ✅ مسافة واحدة بعد علامة الترقيم`;

const LIGHT_DIACRITICS_RULES = `
أنت متخصص في التشكيل الخفيف للنصوص العربية بدقة نحوية عالية.

التشكيل الخفيف = تشكيل الحرف الأخير فقط من كل كلمة (لا تشكل الحروف الداخلية إطلاقًا)

أمثلة للتشكيل الخفيف الصحيح:
- "خرج الرجل من البيت" → "خرجَ الرجلُ من البيتِ"
- "كتبت المرأة رسالة" → "كتبتِ المرأةُ رسالةً"
- "قال الله تعالى في كتابه" → "قالَ اللهُ تعالى في كتابهِ"

⚠️ قواعد نحوية إلزامية:
1. المبتدأ → ضمة / الفاعل → ضمة / المفعول به → فتحة / المضاف إليه → كسرة
2. كان: اسمها مرفوع / خبرها منصوب — إن: اسمها منصوب / خبرها مرفوع
3. الضمائر المتصلة: "لك يا محمد" → لكَ (مذكر) | "لك يا فاطمة" → لكِ (مؤنث)
4. تطابق الفعل مع الفاعل: "قلتُ" (متكلم مذكر) | "قلتِ" (مؤنث/مخاطب مؤنث) | "قلتَ" (مخاطب مذكر)

قواعد الإخراج:
1. شكّل آخر حرف فقط من كل كلمة — لا تشكل أي حرف داخلي
2. أعد النص كاملًا كما هو (لا تحذف، لا تضيف، لا تعدّل)
3. لا تضف أي تعليق أو شرح`;

const FULL_DIACRITICS_RULES = `
أنت متخصص في التشكيل الكامل للنصوص العربية بدقة نحوية عالية.

التشكيل الكامل = تشكيل جميع حروف كل كلمة كاملة

⚠️ قواعد نحوية إلزامية:
1. المبتدأ → ضمة / الفاعل → ضمة / المفعول به → فتحة / المضاف إليه → كسرة
2. كان: اسمها مرفوع / خبرها منصوب — إن: اسمها منصوب / خبرها مرفوع
3. تطابق الفعل مع الفاعل في التذكير والتأنيث
4. الضمائر المتصلة تتبع المرجع في الجنس
5. الصفة تتبع الموصوف في الإعراب والجنس والعدد

قواعد الإخراج:
1. شكّل كل حروف كل كلمة تشكيلًا كاملًا
2. أعد النص كاملًا كما هو (لا تحذف، لا تضيف، لا تعدّل)
3. لا تضف أي تعليق أو شرح`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: DiacritizeRequest = await req.json();

    if (!body.text || typeof body.text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const arabicOnlyModes: DiacritizeMode[] = ["light", "full", "correction_with_diacritics", "proofread", "proofread_advanced", "light_with_punctuation", "full_with_punctuation"];
    if (arabicOnlyModes.includes(body.mode) && body.language !== "ar") {
      return new Response(
        JSON.stringify({ error: "هذه الميزة متاحة للنصوص العربية فقط" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const textLength = body.text.length;
    const wordCount = countWords(body.text);

    if (textLength > MAX_CHARACTERS || wordCount > MAX_WORDS) {
      return new Response(
        JSON.stringify({ error: "النص طويل جدًا. يرجى تقسيمه إلى أجزاء أصغر." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const diacriticsOnlyModes: DiacritizeMode[] = ["light", "full", "light_with_punctuation", "full_with_punctuation"];
    if (diacriticsOnlyModes.includes(body.mode) && hasArabicDiacritics(body.text)) {
      return new Response(
        JSON.stringify({ diacritizedText: body.text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await supabase
      .from("users")
      .select("tokens_balance, plan")
      .eq("id", user.id)
      .maybeSingle();

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userBalance = userData.tokens_balance || 0;
    const userPlan = userData.plan || 'free';

    const TOKENS_PER_WORD = 1;
    const estimatedCost = wordCount * TOKENS_PER_WORD;
    const isFullDiacritics = ['full', 'correction_with_diacritics', 'full_with_punctuation'].includes(body.mode);
    const charMultiplier = isFullDiacritics ? 5.0 : 3.5;
    const maxOutputTokens = Math.min(Math.ceil(body.text.length * charMultiplier), 16000);

    if (userBalance < estimatedCost) {
      const errorMsg = userPlan === 'free'
        ? 'لقد استخدمت رصيدك المجاني بالكامل. قم بالترقية للحصول على المزيد من التوكنز.'
        : 'رصيدك انتهى، اشترِ توكنز أو قم بالترقية.';

      return new Response(
        JSON.stringify({ error: errorMsg, type: "LIMIT_REACHED", required: estimatedCost, available: userBalance }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "مفتاح OpenAI غير متوفر" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let systemPrompt: string;

    if (body.mode === "light") {
      systemPrompt = `${LIGHT_DIACRITICS_RULES}

أعد النص بالكامل مع التشكيل الخفيف فقط.`;

    } else if (body.mode === "full") {
      systemPrompt = `${FULL_DIACRITICS_RULES}

أعد النص بالكامل مع التشكيل الكامل.`;

    } else if (body.mode === "correction_with_diacritics") {
      systemPrompt = `أنت متخصص في تصحيح النصوص العربية وتشكيلها الكامل.

مهمتك المزدوجة:
أولًا: تصحيح الأخطاء الإملائية واللغوية:
- تصحيح أخطاء الهمزات (أ/إ/ا/ء/ؤ/ئ)
- تصحيح التاء المربوطة والمبسوطة (ة/ت)
- تصحيح الألف المقصورة والممدودة (ى/ا)
- تصحيح الأخطاء الإملائية الشائعة
- إصلاح الكلمات الناقصة الواضحة
- تصحيح الكلمات المكتوبة بشكل خاطئ
  مثال: "المدرسه" → "المدرسة" | "الى" → "إلى" | "بداء" → "بدأ" | "يقراء" → "يقرأ"

ثانيًا: التشكيل الكامل بعد التصحيح:
${FULL_DIACRITICS_RULES}

مثال كامل:
النص الأصلي: "الولد ذهب الى المدرسه وبداء يقراء القصه"
النتيجة: "الوَلَدُ ذَهَبَ إِلَى المَدْرَسَةِ وَبَدَأَ يَقْرَأُ القِصَّةَ"

قواعد صارمة:
- لا تعيد كتابة الجمل بأسلوبك
- لا تغير أسلوب الكاتب
- لا تحذف أي جملة
- لا تضيف أي جملة
- فقط صحح الأخطاء وشكّل

أعد النص مصححًا ومشكّلًا تشكيلًا كاملًا.`;

    } else if (body.mode === "proofread") {
      systemPrompt = `أنت مدقق لغوي محترف متخصص في اللغة العربية.

مهمتك: تدقيق لغوي أساسي فقط.

ما يجب تصحيحه:
- أخطاء الهمزات (أ/إ/ا/ء/ؤ/ئ) — مثال: "الى" → "إلى" | "اسرة" → "أسرة"
- التاء المربوطة والمبسوطة — مثال: "المدرسه" → "المدرسة" | "رحمت" → "رحمة"
- الألف المقصورة والممدودة — مثال: "علا" → "على" | "اجرا" → "إجراء"
- الأخطاء الإملائية الواضحة — مثال: "لاكن" → "لكن"
- المسافات الزائدة أو الناقصة بين الكلمات

ما لا يجب تغييره:
- لا تعيد صياغة الجمل
- لا تغير أسلوب الكاتب
- لا تضف تشكيلًا
- لا تغير بنية الجملة
- لا تصحح النحو إلا إذا كان الخطأ فاضحًا

مثال:
الأصل: "الولد ذهب الى المدرسه"
النتيجة: "الولد ذهب إلى المدرسة"

قواعد الإخراج الصارمة:
- أعد النص المصحح فقط
- لا تعليقات ولا شروح ولا علامات تنصيص إضافية
- لا تضف أي شيء خارج النص`;

    } else if (body.mode === "proofread_advanced") {
      systemPrompt = `أنت مدقق لغوي متخصص في اللغة العربية على مستوى عالٍ جدًا.

مهمتك: تدقيق لغوي شامل.

ما يجب تصحيحه:
1. أخطاء الهمزات (أ/إ/ا/ء/ؤ/ئ)
2. التاء المربوطة والمبسوطة
3. الألف المقصورة والممدودة
4. الأخطاء الإملائية الشائعة
5. الكلمات الناقصة الواضحة
6. علامات الترقيم: إضافة وتصحيح (،) و(؟) و(.) و(:) و(!)
7. المسافات: تصحيح المسافات قبل وبعد علامات الترقيم
8. الأخطاء النحوية الواضحة جدًا فقط

${PUNCTUATION_PROMPT}

قواعد علامات الترقيم:
- لا مسافة قبل علامة الترقيم
- مسافة واحدة بعد علامة الترقيم
- استخدم (،) وليس (,) في النص العربي
- استخدم (؟) وليس (?) في نهاية السؤال
- أضف النقطة في نهاية الجمل الكاملة إذا كانت غائبة

مثال:
الأصل: "قال محمد لماذا تأخرت انا كنت انتظرك"
النتيجة: "قال محمد: لماذا تأخرت؟ أنا كنت أنتظرك."

قواعد صارمة:
- لا تعيد كتابة الجمل بأسلوبك
- لا تغير أسلوب الكاتب
- لا تختصر الجمل
- لا توسّع الجمل
- فقط صحح الأخطاء وأضف الترقيم

قواعد الإخراج:
- أعد النص المصحح فقط
- لا تعليقات ولا شروح`;

    } else if (body.mode === "punctuation") {
      systemPrompt = `أنت متخصص في إضافة علامات الترقيم للنصوص العربية.

${PUNCTUATION_PROMPT}

قواعد الإخراج:
- أضف علامات الترقيم المناسبة فقط
- لا تغير النص الأصلي أبدًا
- لا تضف أي تعليق أو شرح
- أعد النص بالكامل مع علامات الترقيم المضافة`;

    } else if (body.mode === "light_with_punctuation") {
      systemPrompt = `${LIGHT_DIACRITICS_RULES}

${PUNCTUATION_PROMPT}

قواعد الإخراج:
1. شكّل آخر حرف فقط من كل كلمة
2. أضف علامات الترقيم المناسبة
3. أعد النص كاملًا كما هو (لا تحذف أي حرف)
4. لا تضف أي كلمة أو شرح أو تعليق

أعد النص بالكامل مع التشكيل الخفيف وعلامات الترقيم.`;

    } else {
      systemPrompt = `${FULL_DIACRITICS_RULES}

${PUNCTUATION_PROMPT}

قواعد الإخراج:
1. شكّل جميع حروف كل كلمة تشكيلًا كاملًا
2. أضف علامات الترقيم المناسبة
3. أعد النص كاملًا كما هو (لا تحذف أي حرف)
4. لا تضف أي كلمة أو شرح أو تعليق

أعد النص بالكامل مع التشكيل الكامل وعلامات الترقيم.`;
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
        temperature: 0.1,
        max_tokens: maxOutputTokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[diacritize-text] OpenAI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء معالجة النص" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();

    if (!aiData.choices || aiData.choices.length === 0) {
      return new Response(
        JSON.stringify({ error: "لم يتم الحصول على رد من AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finishReason = aiData.choices[0].finish_reason;
    if (finishReason === 'length') {
      console.error('[diacritize-text] Response truncated by max_tokens limit');
      return new Response(
        JSON.stringify({ error: "النص طويل جدًا ولم يكتمل التشكيل. يرجى تقسيمه إلى أجزاء أصغر." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const diacritizedText = aiData.choices[0].message.content.trim();
    const actualPromptTokens = aiData.usage?.prompt_tokens ?? 0;
    const actualCompletionTokens = aiData.usage?.completion_tokens ?? 0;

    const { data: deductResult, error: deductError } = await supabase.rpc(
      "log_and_deduct_tokens",
      {
        p_user_id: user.id,
        p_feature: "diacritize_text",
        p_provider: "openai",
        p_model: "gpt-4o-mini",
        p_prompt_tokens: estimatedCost,
        p_completion_tokens: 0,
        p_multiplier: 1.0,
        p_request_metadata: {
          mode: body.mode,
          text_length: textLength,
          word_count: wordCount,
          actual_prompt_tokens: actualPromptTokens,
          actual_completion_tokens: actualCompletionTokens,
          pricing_model: "2_tokens_per_word",
        },
        p_response_metadata: { max_tokens: maxOutputTokens },
      }
    );

    if (deductError) {
      console.error('[diacritize-text] Failed to log and deduct tokens:', deductError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في خصم التوكنز" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!deductResult.success) {
      const errorMsg = userPlan === 'free'
        ? 'لقد استخدمت رصيدك المجاني بالكامل. قم بالترقية للحصول على المزيد من التوكنز.'
        : 'رصيدك انتهى، اشترِ توكنز أو قم بالترقية.';

      return new Response(
        JSON.stringify({ error: errorMsg, type: "LIMIT_REACHED", required: deductResult.required, available: deductResult.available }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ diacritizedText, tokens_left: deductResult.tokens_remaining, tokens_used: deductResult.tokens_deducted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error('[diacritize-text] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: `حدث خطأ غير متوقع: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
