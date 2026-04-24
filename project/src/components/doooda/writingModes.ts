export type WritingModeId = 'explain' | 'review' | 'idea';

export interface WritingMode {
  id: WritingModeId;
  icon: string;
  promptEn: string;
  promptAr: string;
}

export const WRITING_MODES: Record<WritingModeId, WritingMode> = {
  explain: {
    id: 'explain',
    icon: 'BookOpen',
    promptEn: `Your current focus: Clarify and explain.
- Break down concepts step-by-step when helpful
- Prioritize comprehension over completeness
- Be calm, clear, and patient
- Do not lecture or over-teach
- Do not sound academic
- Lead with understanding: "Let's break this down clearly..."`,
    promptAr: `تركيزك الحالي: التوضيح والشرح.
- فكّك المفاهيم خطوة بخطوة لما يكون مفيد
- أعطي الأولوية للفهم على الاكتمال
- كُن هادئ، واضح، وصبور
- ما تتكلمش بأسلوب محاضرة أو تعليم مبالغ فيه
- ما تبانش أكاديمي
- ابدأ بالفهم: "خلّينا نفهم الفكرة بهدوء..."`,
  },
  review: {
    id: 'review',
    icon: 'Pencil',
    promptEn: `Your current focus: Review and refine writing.
- Evaluate clarity, rhythm, consistency, and tone
- Be constructive and gentle
- Give specific, actionable suggestions
- All suggestions are optional, never forceful
- Never judge harshly or rewrite everything unless asked
- Lead with what works: "This part works well. You could strengthen it by..."`,
    promptAr: `تركيزك الحالي: مراجعة وتحسين الكتابة.
- قيّم الوضوح، الإيقاع، الاتساق، والنبرة
- كُن بنّاء ولطيف
- قدّم اقتراحات محددة وقابلة للتنفيذ
- كل الاقتراحات اختيارية، مش إجبارية
- ما تنتقدش بقسوة ولا تعيد كتابة كل حاجة إلا لو اتطلب منك
- ابدأ بالنقاط القوية: "النقطة دي قوية، ممكن تتضح أكتر لو..."`,
  },
  idea: {
    id: 'idea',
    icon: 'Lightbulb',
    promptEn: `Your current focus: Generate ideas and spark creativity.
- Offer multiple possibilities, not one answer
- Be open-ended and exploratory
- Suggest, do not direct
- Encourage experimentation
- Never force one direction
- Lead with possibilities: "We could explore a few directions..."`,
    promptAr: `تركيزك الحالي: توليد أفكار وإشعال الإبداع.
- قدّم احتمالات متعددة، مش إجابة واحدة
- كُن مفتوح واستكشافي
- اقترح، ما توجّهش
- شجّع التجريب
- ما تفرضش اتجاه واحد
- ابدأ بالاحتمالات: "ممكن نفكر في كذا احتمال..."`,
  },
};

export const DEFAULT_MODE: WritingModeId = 'explain';
export const MODE_ORDER: WritingModeId[] = ['explain', 'review', 'idea'];

const EXPLAIN_PATTERNS_EN = [
  /what\s+(is|does|are|do|means?)/i,
  /explain/i,
  /how\s+(does|do|is|can|to)/i,
  /why\s+(is|does|do|are|did)/i,
  /tell\s+me\s+about/i,
  /what's\s+the\s+(meaning|difference)/i,
  /can\s+you\s+(clarify|explain)/i,
  /i\s+don'?t\s+understand/i,
];

const EXPLAIN_PATTERNS_AR = [
  /إيه\s+معنى/,
  /يعني\s+إيه/,
  /ممكن\s+توضح/,
  /فهّمني/,
  /إزاي/,
  /ليه\s+/,
  /مش\s+فاهم/,
  /وضّح/,
];

const REVIEW_PATTERNS_EN = [
  /review/i,
  /what\s+do\s+you\s+think/i,
  /how\s+('s|is)\s+(this|my|the)\s+(writing|text|paragraph|chapter|scene)/i,
  /feedback/i,
  /improve/i,
  /better/i,
  /fix/i,
  /opinion/i,
  /any\s+(issues|problems|suggestions)/i,
];

const REVIEW_PATTERNS_AR = [
  /رأيك/,
  /إيه\s+رأيك/,
  /حسّن/,
  /عدّل/,
  /فيه\s+مشكلة/,
  /ملاحظات/,
  /تحسين/,
  /أفضل/,
];

const IDEA_PATTERNS_EN = [
  /idea/i,
  /suggest/i,
  /what\s+if/i,
  /brainstorm/i,
  /alternatives?/i,
  /help\s+me\s+(think|come\s+up)/i,
  /i('m|\s+am)\s+stuck/i,
  /options?/i,
  /could\s+(i|we|it)\s+be/i,
  /what\s+else/i,
];

const IDEA_PATTERNS_AR = [
  /فكرة/,
  /اقترح/,
  /عاوز\s+فكرة/,
  /بدائل/,
  /ممكن\s+نفكر/,
  /لو\s+/,
  /إيه\s+الاحتمالات/,
  /مش\s+عارف\s+أكتب/,
  /واقف/,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function inferWritingMode(text: string): WritingModeId | null {
  const t = text.trim();
  if (!t) return null;

  const scores: Record<WritingModeId, number> = { explain: 0, review: 0, idea: 0 };

  if (matchesAny(t, EXPLAIN_PATTERNS_EN) || matchesAny(t, EXPLAIN_PATTERNS_AR)) scores.explain++;
  if (matchesAny(t, REVIEW_PATTERNS_EN) || matchesAny(t, REVIEW_PATTERNS_AR)) scores.review++;
  if (matchesAny(t, IDEA_PATTERNS_EN) || matchesAny(t, IDEA_PATTERNS_AR)) scores.idea++;

  const max = Math.max(scores.explain, scores.review, scores.idea);
  if (max === 0) return null;

  if (scores.explain === max) return 'explain';
  if (scores.review === max) return 'review';
  return 'idea';
}
