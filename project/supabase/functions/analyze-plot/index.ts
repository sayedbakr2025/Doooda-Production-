import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ProjectType = 'novel' | 'short_story' | 'long_story' | 'book' | 'film_script' | 'tv_series' | 'theatre_play' | 'radio_series' | 'children_story';

interface PlotChapter {
  order_index: number;
  title: string;
  summary: string;
  tension_level: number;
  pace_level: number;
  has_climax: boolean;
}

interface PlotScene {
  chapter_index: number;
  order_index: number;
  title: string;
  summary: string;
  hook: string;
  tension_level: number;
  pace_level: number;
  has_climax: boolean;
}

const CHUNK_SIZE = 50;

const TYPE_WEIGHTS: Record<ProjectType, string> = {
  novel:          "str:30 ten:25 pac:20 clx:25",
  short_story:    "str:25 ten:30 pac:25 clx:20",
  long_story:     "str:30 ten:25 pac:25 clx:20",
  book:           "str:35 ten:10 pac:25 clx:30",
  film_script:    "str:35 ten:30 pac:20 clx:15",
  tv_series:      "str:25 ten:30 pac:20 clx:25",
  theatre_play:   "str:25 ten:30 pac:20 clx:25",
  radio_series:   "str:25 ten:30 pac:25 clx:20",
  children_story: "str:15 ten:20 pac:25 clx:40",
};

const TYPE_FOCUS_AR: Record<ProjectType, string> = {
  novel:          "قوس درامي، تطور شخصيات، تصاعد توتر، سببية.",
  short_story:    "كثافة درامية، لحظة تحول، اقتصاد كلمات.",
  long_story:     "تصعيد مرحلي، اتساق موضوعي، توازن حبكات فرعية.",
  book:           "تسلسل منطقي، قوة حجج، وضوح مفاهيم.",
  film_script:    "زخم مشهد، بنية ثلاثية، كثافة صراع، نقطة منتصف.",
  tv_series:      "خطاف حلقة، cliffhanger، قوس موسمي.",
  theatre_play:   "مونولوج، توازن حوار، تصاعد عاطفي.",
  radio_series:   "إيقاع صوتي، هوية أصوات، خطاف صوتي.",
  children_story: "بساطة لغة، وضوح حبكة، قوس أخلاقي.",
};

const TYPE_FOCUS_EN: Record<ProjectType, string> = {
  novel:          "arc, char dev, tension escalation, causality.",
  short_story:    "density, turning point, word economy.",
  long_story:     "phased escalation, thematic consistency.",
  book:           "logic, argument strength, concept clarity.",
  film_script:    "scene momentum, 3-act, conflict density, midpoint.",
  tv_series:      "episode hook, cliffhanger, season arc.",
  theatre_play:   "monologue, dialogue balance, emotional escalation.",
  radio_series:   "audio rhythm, voice identity, audio hook.",
  children_story: "simple language, plot clarity, moral arc.",
};

const SCENE_SCORES_SCHEMA = `SS:[{ci,si,wt,at,wp,ap,as,cas,dp,fr,cf,sp,bs,hc,pu,rec,cm}]`;

const GLOBAL_SCHEMA = `OQ:overall_quality(0-1,honest per weights)
CS:[{ci,ss,ts,ps,bs,cas,rec}]
GS:{mid,clx,acts:{a1e,a2m,a2e}}
FS:[{ci,si,r}]
UE:[{d,intro,st}]
SW[]
STR[]
KI[]
REC[]
AR:{title,abs,sa,ta,pa,ca,gs[],gw[],rs,fe,qs}`;

const GENRE_CRITIC_FOCUS_AR: Record<string, string> = {
  horror:          'ركز على: تصاعد التوتر، فجوات التشويق، توقيت الصدمة، الجو النفسي.',
  romance:         'ركز على: التطور العاطفي، نقاط التحول في العلاقة، الكيمياء بين الشخصيات.',
  thriller:        'ركز على: الإيقاع، الـcliffhanger، تصاعد المخاطر، كثافة الصراع.',
  mystery:         'ركز على: توزيع الخيوط، منطق الكشف، التوازن بين الغموض والوضوح.',
  psychological:   'ركز على: العمق النفسي للشخصيات، التوتر الداخلي، المصداقية الدرامية.',
  action:          'ركز على: زخم المشاهد، كثافة الحركة، وضوح خطوط الصراع.',
  drama:           'ركز على: التطور الدرامي، التغيرات العاطفية، المصداقية الإنسانية.',
  comedy:          'ركز على: توقيت الفكاهة، التناسق الإيقاعي، الأصالة الكوميدية.',
  fantasy:         'ركز على: اتساق بناء العالم، منطق القواعد الخيالية، التوازن بين الواقع والخيال.',
  science_fiction: 'ركز على: المصداقية العلمية، بناء العالم، تأثير التكنولوجيا على الشخصيات.',
  dystopian:       'ركز على: الاتساق السياسي والاجتماعي، تطور الأمل واليأس، الرسالة الفكرية.',
};

const GENRE_CRITIC_FOCUS_EN: Record<string, string> = {
  horror:          'Focus: tension escalation, suspense gaps, scare timing, psychological atmosphere.',
  romance:         'Focus: emotional progression, relationship turning points, character chemistry.',
  thriller:        'Focus: pacing, cliffhangers, stakes escalation, conflict intensity.',
  mystery:         'Focus: clue distribution, reveal logic, balance of mystery vs clarity.',
  psychological:   'Focus: psychological depth, internal conflict, dramatic credibility.',
  action:          'Focus: scene momentum, action density, clarity of conflict lines.',
  drama:           'Focus: dramatic development, emotional shifts, human credibility.',
  comedy:          'Focus: comedic timing, rhythmic consistency, originality of humor.',
  fantasy:         'Focus: world-building consistency, internal rule logic, reality-fantasy balance.',
  science_fiction: 'Focus: scientific credibility, world-building, tech impact on characters.',
  dystopian:       'Focus: socio-political consistency, hope/despair arc, thematic message.',
};

const TONE_CRITIC_NOTE_AR: Record<string, string> = {
  dark:          'النبرة قاتمة — تحقق من اتساق الظلام، تجنب التخفيف غير المبرر.',
  light:         'النبرة خفيفة — تحقق من الانسجام والخفة طوال النص.',
  epic:          'النبرة ملحمية — تحقق من حجم الأحداث والمشاعر وتوافقها مع النطاق الملحمي.',
  serious:       'النبرة جادة — تحقق من التوازن دون ثقل مفرط.',
  humorous:      'النبرة فكاهية — تحقق من توقيت الفكاهة واتساقها.',
  melancholic:   'النبرة حزينة — تحقق من عمق الحزن وعدم سطحيتها.',
  inspirational: 'النبرة ملهمة — تحقق من مصداقية الرسالة الإيجابية.',
  realistic:     'النبرة واقعية — تحقق من المصداقية الإنسانية في كل مشهد.',
  surreal:       'النبرة سريالية — تحقق من اتساق المنطق السريالي الداخلي.',
  suspenseful:   'النبرة مشوقة — تحقق من استمرارية التشويق وعدم انكساره.',
  whimsical:     'النبرة خيالية مرحة — تحقق من اتساق الخيال والمرح.',
};

const TONE_CRITIC_NOTE_EN: Record<string, string> = {
  dark:          'Tone is dark — check darkness consistency, flag unjustified tonal relief.',
  light:         'Tone is light — check for harmony and lightness throughout.',
  epic:          'Tone is epic — check that events and emotions match the epic scope.',
  serious:       'Tone is serious — check balance without excessive heaviness.',
  humorous:      'Tone is humorous — check comedic timing and consistency.',
  melancholic:   'Tone is melancholic — check depth of sadness vs superficiality.',
  inspirational: 'Tone is inspirational — check credibility of positive messaging.',
  realistic:     'Tone is realistic — check human credibility in every scene.',
  surreal:       'Tone is surreal — check internal surreal logic consistency.',
  suspenseful:   'Tone is suspenseful — check continuity of tension, flag breaks.',
  whimsical:     'Tone is whimsical — check fantasy/fun consistency.',
};

function buildSystemPrompt(type: ProjectType, lang: 'ar' | 'en', genres?: string[], tone?: string): string {
  const w = TYPE_WEIGHTS[type];

  const genreLines: string[] = [];
  if (genres && genres.length > 0) {
    for (const g of genres) {
      const note = lang === 'ar' ? GENRE_CRITIC_FOCUS_AR[g] : GENRE_CRITIC_FOCUS_EN[g];
      if (note) genreLines.push(note);
    }
  }
  const toneNote = tone ? (lang === 'ar' ? TONE_CRITIC_NOTE_AR[tone] : TONE_CRITIC_NOTE_EN[tone]) : '';

  const genreBlock = genreLines.length > 0
    ? (lang === 'ar' ? `\nتصنيف النص:\n${genreLines.join('\n')}` : `\nGenre context:\n${genreLines.join('\n')}`)
    : '';
  const toneBlock = toneNote
    ? (lang === 'ar' ? `\nنبرة النص: ${toneNote}` : `\nTone context: ${toneNote}`)
    : '';

  if (lang === 'ar') {
    return `دووودة الناقد: محلل بنية درامية متخصص. نبرة أكاديمية رسمية. لا تذكر نماذج/مزودين.
نوع: ${TYPE_FOCUS_AR[type]} أوزان:${w}${genreBlock}${toneBlock}
قواعد صارمة:
1. OQ يعكس جودة حقيقية بناء على الأوزان - لا تعطِ 65% لكل شيء
2. كل مشهد يجب أن يحصل على توصية نقدية محددة وقابلة للتنفيذ - ليس مدحاً
3. cm يجب أن يكون نقداً بناءً أو تحليلاً محدداً - ليس ثناءً عاماً
4. wt و wp: أعد القيم الأصلية للكاتب كما وردت في المدخلات
5. التقرير الأكاديمي يجب أن يكون شاملاً ومفصلاً لكل قسم
أخرج JSON فقط. مفاتيح مختصرة:\n${SCENE_SCORES_SCHEMA}`;
  }
  return `doooda critic: specialized dramatic structure analyst. Academic formal tone. No models/providers.
Type:${TYPE_FOCUS_EN[type]} Weights:${w}${genreBlock}${toneBlock}
Strict rules:
1. Every scene must get a specific actionable critique - NOT praise
2. cm must be constructive critique or specific analysis - NOT generic compliments
3. wt and wp: return original writer values as provided in input
JSON only. Short keys:\n${SCENE_SCORES_SCHEMA}`;
}

function buildGlobalSystemPrompt(type: ProjectType, lang: 'ar' | 'en', genres?: string[], tone?: string): string {
  const w = TYPE_WEIGHTS[type];

  const genreLines: string[] = [];
  if (genres && genres.length > 0) {
    for (const g of genres) {
      const note = lang === 'ar' ? GENRE_CRITIC_FOCUS_AR[g] : GENRE_CRITIC_FOCUS_EN[g];
      if (note) genreLines.push(note);
    }
  }
  const toneNote = tone ? (lang === 'ar' ? TONE_CRITIC_NOTE_AR[tone] : TONE_CRITIC_NOTE_EN[tone]) : '';
  const genreBlock = genreLines.length > 0
    ? (lang === 'ar' ? `\nتصنيف النص:\n${genreLines.join('\n')}` : `\nGenre context:\n${genreLines.join('\n')}`)
    : '';
  const toneBlock = toneNote
    ? (lang === 'ar' ? `\nنبرة النص: ${toneNote}` : `\nTone context: ${toneNote}`)
    : '';

  if (lang === 'ar') {
    return `دووودة الناقد: محلل بنية درامية متخصص. نبرة أكاديمية رسمية. لا تذكر نماذج/مزودين.
نوع: ${TYPE_FOCUS_AR[type]} أوزان:${w}${genreBlock}${toneBlock}
قواعد صارمة:
1. OQ يعكس جودة حقيقية بناء على الأوزان - لا تعطِ 65% لكل شيء
2. التقرير الأكاديمي يجب أن يكون شاملاً ومفصلاً
3. ارصد نقاط التحول العالمية والبنية الثلاثية والذروة من العناوين والبيانات المقدمة
أخرج JSON فقط. مفاتيح مختصرة:\n${GLOBAL_SCHEMA}`;
  }
  return `doooda critic: specialized dramatic structure analyst. Academic formal tone. No models/providers.
Type:${TYPE_FOCUS_EN[type]} Weights:${w}${genreBlock}${toneBlock}
Strict rules:
1. OQ must reflect genuine quality per weights
2. Academic report must be comprehensive and detailed
3. Detect global turning points, 3-act structure, and climax from titles and data provided
JSON only. Short keys:\n${GLOBAL_SCHEMA}`;
}

function buildChunkUserPrompt(chunkScenes: PlotScene[], chunkIndex: number, totalChunks: number, type: ProjectType, lang: 'ar' | 'en'): string {
  const compactScenes = chunkScenes.map(s => ({
    ci: s.chapter_index,
    i: s.order_index,
    t: s.title,
    s: s.summary?.slice(0, 180),
    h: s.hook?.slice(0, 80),
    tn: s.tension_level,
    p: s.pace_level,
    cl: s.has_climax,
  }));

  const typeNames: Record<ProjectType, { ar: string; en: string }> = {
    novel: { ar: 'رواية', en: 'Novel' },
    short_story: { ar: 'قصة قصيرة', en: 'Short Story' },
    long_story: { ar: 'قصة طويلة', en: 'Long Story' },
    book: { ar: 'كتاب', en: 'Non-Fiction Book' },
    film_script: { ar: 'سيناريو سينمائي', en: 'Film Screenplay' },
    tv_series: { ar: 'مسلسل تلفزيوني', en: 'TV Series' },
    theatre_play: { ar: 'مسرحية', en: 'Theatre Play' },
    radio_series: { ar: 'مسلسل إذاعي', en: 'Radio Series' },
    children_story: { ar: 'قصة أطفال', en: "Children's Story" },
  };

  const name = lang === 'ar' ? typeNames[type].ar : typeNames[type].en;

  if (lang === 'ar') {
    return `حلل مشاهد "${name}" — الجزء ${chunkIndex + 1} من ${totalChunks}:
وحدات:${JSON.stringify(compactScenes)}
tn/p توقعات الكاتب (1-10). أخرج ai_tension وai_pace (0-1). أخرج SS فقط بدون أي مفاتيح أخرى. JSON فقط.`;
  }
  return `Analyze scenes of "${name}" — Chunk ${chunkIndex + 1} of ${totalChunks}:
Units:${JSON.stringify(compactScenes)}
tn/p are writer expectations (1-10). Provide ai_tension and ai_pace (0-1). Output SS only, no other keys. JSON only.`;
}

function sampleScenes(scenes: PlotScene[], maxSample: number): PlotScene[] {
  if (scenes.length <= maxSample) return scenes;
  const result: PlotScene[] = [];
  const third = Math.floor(maxSample / 3);
  result.push(...scenes.slice(0, third));
  const midStart = Math.floor(scenes.length / 2) - Math.floor(third / 2);
  result.push(...scenes.slice(midStart, midStart + third));
  result.push(...scenes.slice(scenes.length - third));
  return result;
}

function buildGlobalUserPrompt(chapters: PlotChapter[], scenes: PlotScene[], type: ProjectType, lang: 'ar' | 'en'): string {
  const MAX_GLOBAL_SCENES = 90;
  const sampledScenes = sampleScenes(scenes, MAX_GLOBAL_SCENES);
  const isSampled = sampledScenes.length < scenes.length;

  const compactChapters = chapters.map(c => ({
    i: c.order_index,
    t: c.title,
    s: c.summary?.slice(0, 120),
    tn: c.tension_level,
    p: c.pace_level,
    cl: c.has_climax,
  }));

  const compactScenes = sampledScenes.map(s => ({
    ci: s.chapter_index,
    i: s.order_index,
    t: s.title,
    tn: s.tension_level,
    p: s.pace_level,
    cl: s.has_climax,
  }));

  const typeNames: Record<ProjectType, { ar: string; en: string }> = {
    novel: { ar: 'رواية', en: 'Novel' },
    short_story: { ar: 'قصة قصيرة', en: 'Short Story' },
    long_story: { ar: 'قصة طويلة', en: 'Long Story' },
    book: { ar: 'كتاب', en: 'Non-Fiction Book' },
    film_script: { ar: 'سيناريو سينمائي', en: 'Film Screenplay' },
    tv_series: { ar: 'مسلسل تلفزيوني', en: 'TV Series' },
    theatre_play: { ar: 'مسرحية', en: 'Theatre Play' },
    radio_series: { ar: 'مسلسل إذاعي', en: 'Radio Series' },
    children_story: { ar: 'قصة أطفال', en: "Children's Story" },
  };

  const name = lang === 'ar' ? typeNames[type].ar : typeNames[type].en;
  const hasChapters = chapters.length > 0;

  const sampledNote = isSampled
    ? (lang === 'ar'
        ? ` (عينة ممثلة: بداية + وسط + نهاية من ${scenes.length} وحدة إجمالاً)`
        : ` (representative sample: start+mid+end of ${scenes.length} total units)`)
    : '';

  if (lang === 'ar') {
    return `حلل البنية الكلية لـ"${name}": ${hasChapters ? `${chapters.length} فصل` : ''} ${compactScenes.length} وحدة${sampledNote}.
${hasChapters ? `فصول:${JSON.stringify(compactChapters)}\n` : ''}وحدات (عناوين وبيانات فقط):${JSON.stringify(compactScenes)}
أخرج التحليل الكلي الشامل مع التقرير الأكاديمي الكامل. JSON فقط.`;
  }
  return `Analyze overall structure of "${name}": ${hasChapters ? `${chapters.length} chapters` : ''} ${compactScenes.length} units${sampledNote}.
${hasChapters ? `Chapters:${JSON.stringify(compactChapters)}\n` : ''}Units (titles and data only):${JSON.stringify(compactScenes)}
Output comprehensive global analysis with full academic report. JSON only.`;
}

function buildSingleUserPrompt(chapters: PlotChapter[], scenes: PlotScene[], type: ProjectType, lang: 'ar' | 'en'): string {
  const hasChapters = chapters.length > 0;

  const compactChapters = chapters.map(c => ({
    i: c.order_index,
    t: c.title,
    s: c.summary?.slice(0, 200),
    tn: c.tension_level,
    p: c.pace_level,
    cl: c.has_climax,
  }));

  const compactScenes = scenes.map(s => ({
    ci: s.chapter_index,
    i: s.order_index,
    t: s.title,
    s: s.summary?.slice(0, 200),
    h: s.hook?.slice(0, 100),
    tn: s.tension_level,
    p: s.pace_level,
    cl: s.has_climax,
  }));

  const typeNames: Record<ProjectType, { ar: string; en: string }> = {
    novel: { ar: 'رواية', en: 'Novel' },
    short_story: { ar: 'قصة قصيرة', en: 'Short Story' },
    long_story: { ar: 'قصة طويلة', en: 'Long Story' },
    book: { ar: 'كتاب', en: 'Non-Fiction Book' },
    film_script: { ar: 'سيناريو سينمائي', en: 'Film Screenplay' },
    tv_series: { ar: 'مسلسل تلفزيوني', en: 'TV Series' },
    theatre_play: { ar: 'مسرحية', en: 'Theatre Play' },
    radio_series: { ar: 'مسلسل إذاعي', en: 'Radio Series' },
    children_story: { ar: 'قصة أطفال', en: "Children's Story" },
  };

  const name = lang === 'ar' ? typeNames[type].ar : typeNames[type].en;
  const FULL_SCHEMA = `OQ:overall_quality(0-1,honest per weights)
CS:[{ci,ss,ts,ps,bs,cas,rec}]
SS:[{ci,si,wt,at,wp,ap,as,cas,dp,fr,cf,sp,bs,hc,pu,rec,cm}]
GS:{mid,clx,acts:{a1e,a2m,a2e}}
FS:[{ci,si,r}]
UE:[{d,intro,st}]
SW[]
STR[]
KI[]
REC[]
AR:{title,abs,sa,ta,pa,ca,gs[],gw[],rs,fe,qs}`;

  if (lang === 'ar') {
    return `حلل "${name}": ${hasChapters ? `${chapters.length} فصل` : ''} ${scenes.length} وحدة.
${hasChapters ? `فصول:${JSON.stringify(compactChapters)}\n` : ''}وحدات:${JSON.stringify(compactScenes)}
tn/p هي توقعات الكاتب (1-10). أخرج ai_tension وai_pace (0-1). accuracy_score=1-|tn/10-ai_tension|. JSON فقط.\nSchema:\n${FULL_SCHEMA}`;
  }

  return `Analyze "${name}": ${hasChapters ? `${chapters.length} chapters` : ''} ${scenes.length} units.
${hasChapters ? `Chapters:${JSON.stringify(compactChapters)}\n` : ''}Units:${JSON.stringify(compactScenes)}
tn/p are writer expectations (1-10). Provide ai_tension and ai_pace (0-1). accuracy_score=1-|tn/10-ai_tension|. JSON only.\nSchema:\n${FULL_SCHEMA}`;
}

function getMaxOutputTokens(sceneCount: number): number {
  if (sceneCount <= 5) return 2500;
  if (sceneCount <= 10) return 3500;
  if (sceneCount <= 20) return 4500;
  if (sceneCount <= 35) return 6000;
  if (sceneCount <= 50) return 7000;
  return 8192;
}

function getChunkOutputTokens(chunkSize: number): number {
  if (chunkSize <= 20) return 4000;
  if (chunkSize <= 35) return 5500;
  return 7000;
}

async function callDeepSeek(apiKey: string, systemPrompt: string, userPrompt: string, maxTokens: number): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 120000);

  let response: Response;
  try {
    response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `DeepSeek API error: ${response.status}`;
    try { const d = JSON.parse(errorText); if (d.error?.message) msg = d.error.message; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

function parseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch (_) {
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    try {
      return JSON.parse(stripped);
    } catch (_2) {
      const m = stripped.match(/\{[\s\S]*/);
      if (m) {
        let depth = 0; let end = 0;
        for (let i = 0; i < m[0].length; i++) {
          if (m[0][i] === '{') depth++;
          else if (m[0][i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        if (end > 0) return JSON.parse(m[0].substring(0, end));
      }
      throw new Error("Invalid analysis format");
    }
  }
}

function remapAnalysis(raw: Record<string, unknown>): Record<string, unknown> {
  const chapterScores = (Array.isArray(raw.CS) ? raw.CS : (Array.isArray(raw.chapter_scores) ? raw.chapter_scores : [])) as Record<string, unknown>[];
  const sceneScores = (Array.isArray(raw.SS) ? raw.SS : (Array.isArray(raw.scene_scores) ? raw.scene_scores : [])) as Record<string, unknown>[];
  const gs = (raw.GS ?? raw.global_structure ?? {}) as Record<string, unknown>;
  const fillerScenes = (Array.isArray(raw.FS) ? raw.FS : (Array.isArray(raw.filler_scenes) ? raw.filler_scenes : [])) as Record<string, unknown>[];
  const unresolvedElements = (Array.isArray(raw.UE) ? raw.UE : (Array.isArray(raw.unresolved_elements) ? raw.unresolved_elements : [])) as Record<string, unknown>[];
  const ar = (raw.AR ?? raw.academic_report ?? {}) as Record<string, unknown>;

  return {
    overall_quality: raw.OQ ?? raw.overall_quality ?? 0,
    chapter_scores: chapterScores.map(c => ({
      chapter_index: c.ci ?? c.chapter_index ?? 0,
      structure_score: c.ss ?? c.structure_score ?? 0,
      tension_score: c.ts ?? c.tension_score ?? 0,
      pacing_score: c.ps ?? c.pacing_score ?? 0,
      build_up_score: c.bs ?? c.build_up_score ?? 0,
      causality_score: c.cas ?? c.causality_score ?? 0,
      recommendation: c.rec ?? c.recommendation ?? '',
    })),
    scene_scores: sceneScores.map(s => ({
      chapter_index: s.ci ?? s.chapter_index ?? 0,
      scene_index: s.si ?? s.scene_index ?? s.order_index ?? 0,
      writer_tension: s.wt ?? s.writer_tension ?? 0,
      ai_tension: s.at ?? s.ai_tension ?? 0,
      writer_pace: s.wp ?? s.writer_pace ?? 0,
      ai_pace: s.ap ?? s.ai_pace ?? 0,
      accuracy_score: s.as ?? s.accuracy_score ?? 0,
      causality_score: s.cas ?? s.causality_score ?? 0,
      dramatic_progress_score: s.dp ?? s.dramatic_progress_score ?? 0,
      filler_ratio: s.fr ?? s.filler_ratio ?? 0,
      conflict_intensity_score: s.cf ?? s.conflict_intensity_score ?? 0,
      setup_payoff_tag: s.sp ?? s.setup_payoff_tag ?? 'none',
      build_up_score: s.bs ?? s.build_up_score ?? 0,
      has_climax: s.hc ?? s.has_climax ?? false,
      scene_purpose: s.pu ?? s.scene_purpose ?? s.purpose ?? 'transition',
      recommendation: s.rec ?? s.recommendation ?? '',
      comment: s.cm ?? s.comment ?? '',
    })),
    global_structure: {
      detected_midpoint_scene_index: gs.mid ?? gs.midpoint ?? gs.detected_midpoint_scene_index ?? null,
      detected_main_climax_scene_index: gs.clx ?? gs.climax ?? gs.detected_main_climax_scene_index ?? null,
      act_breakpoints: {
        act1_end: (gs.acts as Record<string, unknown>)?.a1e ?? (gs.acts as Record<string, unknown>)?.act1_end ?? (gs.act_breakpoints as Record<string, unknown>)?.act1_end ?? null,
        act2_mid: (gs.acts as Record<string, unknown>)?.a2m ?? (gs.acts as Record<string, unknown>)?.act2_mid ?? (gs.act_breakpoints as Record<string, unknown>)?.act2_mid ?? null,
        act2_end: (gs.acts as Record<string, unknown>)?.a2e ?? (gs.acts as Record<string, unknown>)?.act2_end ?? (gs.act_breakpoints as Record<string, unknown>)?.act2_end ?? null,
      },
    },
    filler_scenes: fillerScenes.map(f => ({
      chapter_index: f.ci ?? f.chapter_index ?? 0,
      scene_index: f.si ?? f.scene_index ?? 0,
      reason: f.r ?? f.reason ?? '',
    })),
    unresolved_elements: unresolvedElements.map(u => ({
      description: u.d ?? u.description ?? '',
      introduced_in: u.intro ?? u.introduced_in ?? '',
      status: u.st ?? u.status ?? '',
    })),
    structural_warnings: Array.isArray(raw.SW) ? raw.SW : (Array.isArray(raw.structural_warnings) ? raw.structural_warnings : []),
    strengths: Array.isArray(raw.STR) ? raw.STR : (Array.isArray(raw.strengths) ? raw.strengths : []),
    key_issues: Array.isArray(raw.KI) ? raw.KI : (Array.isArray(raw.key_issues) ? raw.key_issues : []),
    recommendations: Array.isArray(raw.REC) ? raw.REC : (Array.isArray(raw.recommendations) ? raw.recommendations : []),
    academic_report: {
      title: ar.title ?? '',
      abstract: ar.abs ?? ar.abstract ?? '',
      introduction: ar.intro ?? ar.introduction ?? '',
      methodology: ar.meth ?? ar.methodology ?? '',
      structural_analysis: ar.sa ?? ar.structural_analysis ?? '',
      tension_analysis: ar.ta ?? ar.tension_analysis ?? '',
      pacing_analysis: ar.pa ?? ar.pacing_analysis ?? '',
      causality_analysis: ar.ca ?? ar.causality_analysis ?? '',
      character_dynamics_analysis: ar.cda ?? ar.character_dynamics_analysis ?? '',
      thematic_cohesion_analysis: ar.tca ?? ar.thematic_cohesion_analysis ?? '',
      dramatic_arc_evaluation: ar.dae ?? ar.dramatic_arc_evaluation ?? '',
      act_structure_evaluation: ar.ase ?? ar.act_structure_evaluation ?? '',
      midpoint_evaluation: ar.me ?? ar.midpoint_evaluation ?? '',
      climax_evaluation: ar.ce ?? ar.climax_evaluation ?? '',
      structural_imbalances: Array.isArray(ar.si) ? ar.si : (Array.isArray(ar.structural_imbalances) ? ar.structural_imbalances : []),
      redundancy_and_filler_analysis: ar.rfa ?? ar.redundancy_and_filler_analysis ?? '',
      unused_setups_analysis: ar.usa ?? ar.unused_setups_analysis ?? '',
      global_strengths: Array.isArray(ar.gs) ? ar.gs : (Array.isArray(ar.global_strengths) ? ar.global_strengths : []),
      global_weaknesses: Array.isArray(ar.gw) ? ar.gw : (Array.isArray(ar.global_weaknesses) ? ar.global_weaknesses : []),
      revision_strategy: ar.rs ?? ar.revision_strategy ?? '',
      final_evaluation: ar.fe ?? ar.final_evaluation ?? '',
      quality_score: ar.qs ?? ar.quality_score ?? 0,
    },
  };
}

function remapChunkSceneScores(raw: Record<string, unknown>): Record<string, unknown>[] {
  const ss = Array.isArray(raw.SS) ? raw.SS : (Array.isArray(raw.scene_scores) ? raw.scene_scores : []) as Record<string, unknown>[];
  return ss.map((s: Record<string, unknown>) => ({
    chapter_index: s.ci ?? s.chapter_index ?? 0,
    scene_index: s.si ?? s.scene_index ?? s.order_index ?? 0,
    writer_tension: s.wt ?? s.writer_tension ?? 0,
    ai_tension: s.at ?? s.ai_tension ?? 0,
    writer_pace: s.wp ?? s.writer_pace ?? 0,
    ai_pace: s.ap ?? s.ai_pace ?? 0,
    accuracy_score: s.as ?? s.accuracy_score ?? 0,
    causality_score: s.cas ?? s.causality_score ?? 0,
    dramatic_progress_score: s.dp ?? s.dramatic_progress_score ?? 0,
    filler_ratio: s.fr ?? s.filler_ratio ?? 0,
    conflict_intensity_score: s.cf ?? s.conflict_intensity_score ?? 0,
    setup_payoff_tag: s.sp ?? s.setup_payoff_tag ?? 'none',
    build_up_score: s.bs ?? s.build_up_score ?? 0,
    has_climax: s.hc ?? s.has_climax ?? false,
    scene_purpose: s.pu ?? s.scene_purpose ?? s.purpose ?? 'transition',
    recommendation: s.rec ?? s.recommendation ?? '',
    comment: s.cm ?? s.comment ?? '',
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json() as {
      plot_project_id: string;
      chapters: PlotChapter[];
      scenes: PlotScene[];
      language: 'ar' | 'en';
      project_type?: ProjectType;
      genres?: string[];
      tone?: string;
    };

    const { plot_project_id, chapters, scenes, language, project_type, genres, tone } = body;

    if (!plot_project_id || !scenes || scenes.length === 0) {
      throw new Error("Missing required fields");
    }

    const type: ProjectType = project_type ?? 'novel';

    const { data: userData, error: userError2 } = await supabase
      .from("users")
      .select("tokens_balance, plan")
      .eq("id", user.id)
      .maybeSingle();

    if (userError2 || !userData) throw new Error("Failed to get user token balance");

    const userPlan = userData.plan || 'free';
    const MULTIPLIER = userPlan === 'free' ? 1.5 : 2.0;
    const MIN_TOKENS = 100;

    const estimatedInputTokens = Math.ceil(JSON.stringify({ chapters, scenes }).length / 4);
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.65);
    const estimatedCost = Math.max(Math.ceil((estimatedInputTokens + estimatedOutputTokens) * MULTIPLIER), MIN_TOKENS);

    if (userData.tokens_balance < estimatedCost) {
      return new Response(
        JSON.stringify({
          error: language === 'ar' ? 'رصيد التوكنز غير كافٍ' : 'Insufficient token balance',
          required: estimatedCost,
          available: userData.tokens_balance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) throw new Error(language === 'ar' ? 'مفتاح DeepSeek غير متوفر' : 'DeepSeek API key not configured');

    let analysis: Record<string, unknown>;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    const useChunking = scenes.length > CHUNK_SIZE;

    if (!useChunking) {
      const systemPrompt = buildSystemPrompt(type, language, genres, tone);
      const userPrompt = buildSingleUserPrompt(chapters, scenes, type, language);
      const MAX_OUTPUT_TOKENS = getMaxOutputTokens(scenes.length);

      console.log('[analyze-plot] single-pass | user:', user.id, '| scenes:', scenes.length, '| max_tokens:', MAX_OUTPUT_TOKENS);

      const result = await callDeepSeek(deepseekApiKey, systemPrompt, userPrompt, MAX_OUTPUT_TOKENS);
      totalPromptTokens += result.usage.prompt_tokens || 0;
      totalCompletionTokens += result.usage.completion_tokens || 0;

      const raw = parseJSON(result.content);
      analysis = remapAnalysis(raw);

    } else {
      console.log('[analyze-plot] chunked | user:', user.id, '| scenes:', scenes.length, '| chunk_size:', CHUNK_SIZE);

      const chunks: PlotScene[][] = [];
      for (let i = 0; i < scenes.length; i += CHUNK_SIZE) {
        chunks.push(scenes.slice(i, i + CHUNK_SIZE));
      }

      const chunkSystemPrompt = buildSystemPrompt(type, language, genres, tone);
      const allSceneScores: Record<string, unknown>[] = [];

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const chunkUserPrompt = buildChunkUserPrompt(chunk, ci, chunks.length, type, language);
        const chunkMaxTokens = getChunkOutputTokens(chunk.length);

        console.log(`[analyze-plot] chunk ${ci + 1}/${chunks.length} | scenes: ${chunk.length}`);

        const chunkResult = await callDeepSeek(deepseekApiKey, chunkSystemPrompt, chunkUserPrompt, chunkMaxTokens);
        totalPromptTokens += chunkResult.usage.prompt_tokens || 0;
        totalCompletionTokens += chunkResult.usage.completion_tokens || 0;

        const chunkRaw = parseJSON(chunkResult.content);
        const chunkSceneScores = remapChunkSceneScores(chunkRaw);
        allSceneScores.push(...chunkSceneScores);
      }

      const globalSystemPrompt = buildGlobalSystemPrompt(type, language, genres, tone);
      const globalUserPrompt = buildGlobalUserPrompt(chapters, scenes, type, language);
      const globalMaxTokens = 8192;

      console.log(`[analyze-plot] global analysis | scenes: ${scenes.length}`);
      const globalResult = await callDeepSeek(deepseekApiKey, globalSystemPrompt, globalUserPrompt, globalMaxTokens);
      totalPromptTokens += globalResult.usage.prompt_tokens || 0;
      totalCompletionTokens += globalResult.usage.completion_tokens || 0;

      const globalRaw = parseJSON(globalResult.content);
      const globalAnalysis = remapAnalysis(globalRaw);

      analysis = {
        ...globalAnalysis,
        scene_scores: allSceneScores,
      };
    }

    const sceneScores: Array<{
      ai_tension?: number;
      filler_ratio?: number;
      conflict_intensity_score?: number;
      setup_payoff_tag?: string;
      scene_index?: number;
      chapter_index?: number;
      order_index?: number;
    }> = Array.isArray(analysis.scene_scores) ? analysis.scene_scores as Array<{
      ai_tension?: number;
      filler_ratio?: number;
      conflict_intensity_score?: number;
      setup_payoff_tag?: string;
      scene_index?: number;
      chapter_index?: number;
      order_index?: number;
    }> : [];

    if (sceneScores.length > 0) {
      const tensions = sceneScores.map(s => s.ai_tension ?? 0);
      const fillers = sceneScores.map(s => s.filler_ratio ?? 0);
      const conflicts = sceneScores.map(s => s.conflict_intensity_score ?? 0);
      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const tensionMean = mean(tensions);
      const variance = mean(tensions.map(t => Math.pow(t - tensionMean, 2)));

      const setupScenes = sceneScores.filter(s => s.setup_payoff_tag === 'setup');
      const payoffScenes = sceneScores.filter(s => s.setup_payoff_tag === 'payoff');
      const aiPairs = Array.isArray((analysis.additional_metrics as Record<string, unknown>)?.setup_payoff_pairs)
        ? (analysis.additional_metrics as Record<string, unknown>).setup_payoff_pairs
        : setupScenes.slice(0, payoffScenes.length).map((s, i) => ({
            setup_scene_index: s.scene_index ?? 0,
            payoff_scene_index: payoffScenes[i]?.scene_index ?? 0,
            element: '',
          }));

      analysis.additional_metrics = {
        setup_payoff_pairs: aiPairs,
        unused_setups: setupScenes
          .filter(s => !(aiPairs as Array<{ setup_scene_index: number }>).some((p) => p.setup_scene_index === s.scene_index))
          .map(s => ({ scene_index: s.scene_index, chapter_index: s.chapter_index })),
        filler_density_score: Math.round(mean(fillers) * 100) / 100,
        conflict_density_score: Math.round(mean(conflicts) * 100) / 100,
        emotional_volatility_index: Math.round(Math.min(1, Math.sqrt(variance) * 2) * 100) / 100,
        unresolved_elements_count: Array.isArray(analysis.unresolved_elements) ? analysis.unresolved_elements.length : 0,
      };
    }

    const { data: deductResult, error: deductError } = await supabase.rpc("log_and_deduct_tokens", {
      p_user_id: user.id,
      p_feature: "analyze_plot",
      p_provider: "deepseek",
      p_model: "deepseek-chat",
      p_prompt_tokens: totalPromptTokens,
      p_completion_tokens: totalCompletionTokens,
      p_multiplier: MULTIPLIER,
      p_request_metadata: { plot_project_id, language, project_type: type, chapters_count: chapters.length, scenes_count: scenes.length, chunked: useChunking },
      p_response_metadata: { quality_score: analysis.overall_quality || 0 },
    });

    if (deductError) throw new Error("Failed to process token usage");

    if (!deductResult.success) {
      return new Response(
        JSON.stringify({ error: language === 'ar' ? 'رصيد التوكنز غير كافٍ' : 'Insufficient token balance', required: deductResult.required, available: deductResult.available }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("plot_analysis").delete().eq("plot_project_id", plot_project_id);
    const { error: insertError } = await supabase.from("plot_analysis").insert({
      plot_project_id,
      analysis_json: analysis,
      quality_score: Math.round((analysis.overall_quality as number || 0) * 100),
    });
    if (insertError) throw new Error("Failed to save analysis");

    supabase.from("plot_projects").update({ last_analysis_at: new Date().toISOString() }).eq("id", plot_project_id);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        tokens_used: deductResult.tokens_deducted,
        tokens_remaining: deductResult.tokens_remaining,
        usage: {
          prompt_tokens: deductResult.prompt_tokens,
          completion_tokens: deductResult.completion_tokens,
          total_tokens: deductResult.total_tokens,
          multiplier: deductResult.multiplier,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[analyze-plot] error:", error);
    let statusCode = 500;
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("authorization")) statusCode = 401;
      else if (errorMessage.includes("token balance") || errorMessage.includes("Insufficient")) statusCode = 402;
    }
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
