type ProjectType = 'novel' | 'short_story' | 'long_story' | 'book' | 'film_script' | 'tv_series' | 'theatre_play' | 'radio_series' | 'children_story';

interface PlotSceneLike {
  chapter_index: number;
  order_index: number;
  title?: string;
  summary?: string;
  hook?: string;
  tension_level?: number | null;
  pace_level?: number | null;
  has_climax?: boolean | null;
}

interface RawSceneScore {
  chapter_index: number;
  scene_index: number;
  writer_tension?: number;
  ai_tension?: number;
  writer_pace?: number;
  ai_pace?: number;
  accuracy_score?: number;
  causality_score?: number;
  dramatic_progress_score?: number;
  filler_ratio?: number;
  conflict_intensity_score?: number;
  setup_payoff_tag?: string;
  build_up_score?: number;
  has_climax?: boolean;
  scene_purpose?: string;
  recommendation?: string;
  comment?: string;
}

type SceneClassification =
  | 'core'
  | 'supportive'
  | 'setup'
  | 'breathing'
  | 'transition'
  | 'weak_impact'
  | 'potential_filler';

interface NarrativeDimensions {
  plot_progression: number;
  character_development: number;
  information_value: number;
  emotional_function: number;
  conflict_presence: number;
  narrative_necessity: number;
}

interface NarrativeDebug {
  legacy_filler_ratio: number;
  recomputed_filler_ratio: number;
  impact_score: number;
  low_impact_score: number;
  keyword_hits: Record<string, number>;
  thresholds: {
    potentialFiller: number;
    lowImpact: number;
    warningRunLength: number;
    stallRatio: number;
  };
}

interface NarrativeAssessment {
  classification: SceneClassification;
  classification_label_ar: string;
  classification_label_en: string;
  scene_purpose: 'conflict' | 'setup' | 'payoff' | 'transition';
  filler_ratio: number;
  tags: string[];
  tags_ar: string[];
  tags_en: string[];
  reasons_ar: string[];
  reasons_en: string[];
  recommendation: string;
  recommendation_ar: string;
  recommendation_en: string;
  comment: string;
  comment_ar: string;
  comment_en: string;
  narrative_dimensions: NarrativeDimensions;
  debug: NarrativeDebug;
}

interface ProcessedWarning {
  type: string;
  message: string;
  indices: number[];
}

interface ProcessedFillerScene {
  chapter_index: number;
  scene_index: number;
  reason: string;
}

interface ProcessedResults {
  scene_scores: Array<RawSceneScore & NarrativeAssessment>;
  filler_scenes: ProcessedFillerScene[];
  structural_warnings: string[];
  ui_warnings: ProcessedWarning[];
  debug_summary: Record<string, unknown>;
}

const CLAMP = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const ARABIC_KEYWORDS = {
  plot: ['يكتشف', 'يقرر', 'يهرب', 'يواجه', 'يفقد', 'ينقذ', 'يكشف', 'يتغير', 'تتحول', 'ينقلب', 'يتصاعد', 'صدام', 'قرار', 'خطة', 'مواجهة', 'خطر', 'سر'],
  character: ['يشعر', 'تتغير مشاعره', 'علاقته', 'ندم', 'خوف', 'حب', 'غضب', 'حزن', 'قلق', 'تردد', 'صراع داخلي', 'مصالحة', 'اعتراف', 'حنين'],
  information: ['يكشف', 'سر', 'معلومة', 'دليل', 'خيط', 'تلميح', 'تمهيد', 'يوضح', 'يفسر', 'يتذكر', 'خلفية', 'وعد', 'لغز'],
  breathing: ['هدوء', 'يهدأ', 'استراحة', 'يتأمل', 'يصمت', 'مواساة', 'احتواء', 'يتنفس', 'راحة', 'بعد الصدمة', 'فضفضة', 'لحظة إنسانية'],
  transition: ['ينتقل', 'في الطريق', 'بعد ذلك', 'لاحقًا', 'ثم', 'في اليوم التالي', 'يغادر', 'يصل', 'يعبر', 'يتوجه', 'انتقال'],
  world: ['المدينة', 'القرية', 'المكان', 'العالم', 'الطقس', 'البيت', 'الشارع', 'الأجواء', 'الوصف', 'البيئة', 'القواعد'],
  conflict: ['صراع', 'خلاف', 'تهديد', 'خطر', 'مطاردة', 'يهاجم', 'يرفض', 'يصطدم', 'خصم', 'عدو', 'ضغط'],
  relationship: ['بينهما', 'علاقتهما', 'أمه', 'أبيه', 'صديقه', 'حبيبته', 'حبيبها', 'عائلته', 'رفيقه', 'حوار'],
};

const ENGLISH_KEYWORDS = {
  plot: ['discovers', 'decides', 'escapes', 'confronts', 'loses', 'saves', 'reveals', 'changes', 'turns', 'escalates', 'plan', 'decision', 'danger', 'secret'],
  character: ['feels', 'regret', 'fear', 'love', 'anger', 'sadness', 'anxiety', 'hesitates', 'internal conflict', 'reconciles', 'admits', 'longing'],
  information: ['reveal', 'secret', 'information', 'clue', 'hint', 'setup', 'explains', 'remembers', 'backstory', 'promise', 'mystery'],
  breathing: ['calm', 'quiet', 'rest', 'reflects', 'silence', 'comfort', 'recovery', 'breathes', 'relief', 'aftershock', 'human moment'],
  transition: ['transition', 'on the way', 'after that', 'later', 'then', 'next day', 'leaves', 'arrives', 'crosses', 'heads to'],
  world: ['city', 'village', 'place', 'world', 'weather', 'house', 'street', 'atmosphere', 'description', 'setting', 'rules'],
  conflict: ['conflict', 'argument', 'threat', 'danger', 'chase', 'attacks', 'refuses', 'clashes', 'enemy', 'pressure'],
  relationship: ['between them', 'relationship', 'mother', 'father', 'friend', 'lover', 'family', 'companion', 'dialogue'],
};

const CLASSIFICATION_AR: Record<SceneClassification, string> = {
  core: 'محوري',
  supportive: 'داعم',
  setup: 'تمهيدي',
  breathing: 'تنفيسي',
  transition: 'انتقالي',
  weak_impact: 'ضعيف التأثير',
  potential_filler: 'حشوي محتمل',
};

const CLASSIFICATION_EN: Record<SceneClassification, string> = {
  core: 'Core scene',
  supportive: 'Supportive scene',
  setup: 'Setup scene',
  breathing: 'Breathing scene',
  transition: 'Transition scene',
  weak_impact: 'Weak impact scene',
  potential_filler: 'Potential filler',
};

function normalizeText(input?: string | null): string {
  return (input ?? '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordScore(text: string, keywords: string[]): number {
  if (!text) return 0;
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) hits++;
  }
  return CLAMP(hits / Math.max(3, Math.min(6, keywords.length / 2)));
}

function buildTagSet(tags: string[]): string[] {
  return Array.from(new Set(tags.filter(Boolean)));
}

function selectPurpose(
  classification: SceneClassification,
  dims: NarrativeDimensions,
  keywordHits: Record<string, number>,
): 'conflict' | 'setup' | 'payoff' | 'transition' {
  if (classification === 'core' || dims.conflict_presence >= 0.64) return 'conflict';
  if (classification === 'setup' || dims.information_value >= 0.62) return 'setup';
  if (dims.plot_progression >= 0.58 && dims.narrative_necessity >= 0.62) return 'payoff';
  if (keywordHits.transition > 0 || classification === 'transition' || classification === 'breathing') return 'transition';
  return 'transition';
}

function sceneTagsAr(dims: NarrativeDimensions, classification: SceneClassification): string[] {
  const tags: string[] = [];
  if (dims.character_development >= 0.48) tags.push('تطور شخصية');
  if (dims.information_value >= 0.52) tags.push('كشف معلومات');
  if (dims.plot_progression >= 0.58 || dims.conflict_presence >= 0.62) tags.push('تصعيد');
  if (classification === 'setup') tags.push('تمهيد');
  if (classification === 'transition') tags.push('انتقال');
  if (classification === 'breathing') tags.push('تنفيس');
  if (classification === 'potential_filler' || classification === 'weak_impact') tags.push('أثر محدود');
  return buildTagSet(tags);
}

function sceneTagsEn(dims: NarrativeDimensions, classification: SceneClassification): string[] {
  const tags: string[] = [];
  if (dims.character_development >= 0.48) tags.push('Character Growth');
  if (dims.information_value >= 0.52) tags.push('Information Reveal');
  if (dims.plot_progression >= 0.58 || dims.conflict_presence >= 0.62) tags.push('Escalation');
  if (classification === 'setup') tags.push('Setup');
  if (classification === 'transition') tags.push('Transition');
  if (classification === 'breathing') tags.push('Breathing');
  if (classification === 'potential_filler' || classification === 'weak_impact') tags.push('Low Impact');
  return buildTagSet(tags);
}

function buildCommentAr(classification: SceneClassification, dims: NarrativeDimensions): string {
  switch (classification) {
    case 'core':
      return 'هذا المقطع يؤدي وظيفة درامية محورية ويترك أثرًا واضحًا في مسار الحكاية.';
    case 'supportive':
      return dims.character_development >= dims.plot_progression
        ? 'هذا المقطع يدعم السرد عبر تعميق الشخصيات أكثر من دفع الحدث المباشر.'
        : 'هذا المقطع يدعم البناء العام ويضيف قيمة سردية ملموسة.';
    case 'setup':
      return 'هذا المقطع تمهيدي؛ قيمته الأساسية في الإعداد لما سيأتي لا في الانفجار الدرامي الفوري.';
    case 'breathing':
      return 'هذا المقطع يعمل كتنفيس عاطفي وتنظيم للإيقاع أكثر من كونه حشوًا مباشرًا.';
    case 'transition':
      return 'هذا المقطع يؤدي وظيفة انتقالية تربط بين محطات السرد وتحافظ على سلاسة الحركة.';
    case 'weak_impact':
      return 'هذا المقطع مفهوم وظيفيًا، لكن أثره الحالي محدود ويحتاج إلى نقطة تحول أو معلومة أعمق.';
    case 'potential_filler':
      return 'هذا المقطع يقترب من الحشو المحتمل لأن أثره السردي والعاطفي ما يزال ضعيفًا.';
  }
}

function buildCommentEn(classification: SceneClassification, dims: NarrativeDimensions): string {
  switch (classification) {
    case 'core':
      return 'This unit plays a clear dramatic role and leaves a visible mark on the story.';
    case 'supportive':
      return dims.character_development >= dims.plot_progression
        ? 'This unit supports the story mainly by deepening character rather than pushing overt action.'
        : 'This unit contributes meaningful support to the overall structure.';
    case 'setup':
      return 'This is a setup unit; its value lies in preparation more than immediate dramatic explosion.';
    case 'breathing':
      return 'This unit functions as emotional breathing space rather than direct filler.';
    case 'transition':
      return 'This unit serves a connective transitional role between stronger dramatic beats.';
    case 'weak_impact':
      return 'This unit is functionally understandable, but its impact is currently limited.';
    case 'potential_filler':
      return 'This unit risks feeling like filler because both narrative and emotional impact remain low.';
  }
}

function buildRecommendationAr(classification: SceneClassification, dims: NarrativeDimensions): string {
  switch (classification) {
    case 'core':
      return 'حافظ على هذا الدور المحوري، ويمكن تقوية نتيجته اللاحقة بإبراز أثره على المشهد التالي.';
    case 'supportive':
      return dims.character_development >= dims.plot_progression
        ? 'يفضل تثبيت التحول العاطفي هنا بجملة أو فعل ينعكس لاحقًا على قرارات الشخصية.'
        : 'يمكن رفع قيمة هذا المقطع بربطه أوضح بنتيجة لاحقة أو رهان درامي قادم.';
    case 'setup':
      return 'يفضل ترك إشارة أوضح إلى العائد المنتظر حتى يظهر التمهيد كمقصود لا كإبطاء.';
    case 'breathing':
      return 'إن أردت رفع التفاعل، أضف تحولًا شعوريًا صغيرًا أو تلميحًا يكافئ هدوء الإيقاع.';
    case 'transition':
      return 'يمكن تقوية الانتقال بإضافة معلومة ضاغطة أو تغير طفيف يمنع الإحساس بالسكون.';
    case 'weak_impact':
      return 'يفضل إضافة تحول عاطفي أو حدث مؤثر أو كشف معلومة يمنح المقطع وزنًا أوضح.';
    case 'potential_filler':
      return 'يفضل تقليص هذا المقطع أو منحه وظيفة محددة: كشف، تصعيد، أو تحول شخصي واضح.';
  }
}

function buildRecommendationEn(classification: SceneClassification, dims: NarrativeDimensions): string {
  switch (classification) {
    case 'core':
      return 'Keep the scene central, and consider clarifying its aftereffect on the next beat.';
    case 'supportive':
      return dims.character_development >= dims.plot_progression
        ? 'Consider anchoring the emotional shift in a line or action that echoes later.'
        : 'You can strengthen this beat by tying it more explicitly to a later consequence.';
    case 'setup':
      return 'Consider signaling the future payoff more clearly so the setup feels intentional.';
    case 'breathing':
      return 'If you want more engagement, add a small emotional turn or a light foreshadowing note.';
    case 'transition':
      return 'You can strengthen the transition with a small turn, pressure point, or key detail.';
    case 'weak_impact':
      return 'Consider adding an emotional turn, a key event, or a meaningful information reveal.';
    case 'potential_filler':
      return 'Consider trimming the beat or giving it a distinct function: reveal, escalation, or character shift.';
  }
}

function buildReasonsAr(
  classification: SceneClassification,
  dims: NarrativeDimensions,
  keywordHits: Record<string, number>,
): string[] {
  const reasons: string[] = [];
  if (dims.plot_progression >= 0.58) reasons.push('يتضمن تغيرًا دراميًا ملموسًا في مسار الأحداث.');
  if (dims.character_development >= 0.5) reasons.push('يمنح الشخصيات مساحة تطور أو كشفًا داخليًا معتبرًا.');
  if (dims.information_value >= 0.55) reasons.push('يضيف معلومة أو تمهيدًا له قيمة لاحقة.');
  if (classification === 'breathing') reasons.push('الإيقاع الهادئ هنا يؤدي وظيفة تنفيس عاطفي لا توقفًا سرديًا خالصًا.');
  if (classification === 'transition') reasons.push('وظيفته الأساسية الربط والعبور بين محطات أقوى دراميًا.');
  if (classification === 'weak_impact') reasons.push('لا يزال التغيير الدرامي فيه محدودًا مقارنة بطول حضوره.');
  if (classification === 'potential_filler') reasons.push('يعتمد أكثر على الوصف أو الحركة الدنيا من دون أثر سردي كاف.');
  if (keywordHits.world > 0 && dims.emotional_function >= 0.45) reasons.push('يبني الأجواء أو العالم بما يخدم المزاج العام.');
  return buildTagSet(reasons).slice(0, 3);
}

function buildReasonsEn(
  classification: SceneClassification,
  dims: NarrativeDimensions,
  keywordHits: Record<string, number>,
): string[] {
  const reasons: string[] = [];
  if (dims.plot_progression >= 0.58) reasons.push('It contains tangible dramatic change.');
  if (dims.character_development >= 0.5) reasons.push('It gives character growth or meaningful inner revelation.');
  if (dims.information_value >= 0.55) reasons.push('It adds information or setup with later value.');
  if (classification === 'breathing') reasons.push('Its quiet rhythm functions as emotional recovery rather than pure drag.');
  if (classification === 'transition') reasons.push('Its main role is connective movement between stronger beats.');
  if (classification === 'weak_impact') reasons.push('Its current dramatic change remains limited relative to its space.');
  if (classification === 'potential_filler') reasons.push('It leans on description or low movement without enough narrative payoff.');
  if (keywordHits.world > 0 && dims.emotional_function >= 0.45) reasons.push('It supports atmosphere or worldbuilding with clear tonal value.');
  return buildTagSet(reasons).slice(0, 3);
}

function assessScene(
  score: RawSceneScore,
  scene: PlotSceneLike | undefined,
  lang: 'ar' | 'en',
): NarrativeAssessment {
  const text = normalizeText([scene?.title, scene?.summary, scene?.hook].filter(Boolean).join(' '));
  const keywords = text.match(/[\u0600-\u06FF]/) ? ARABIC_KEYWORDS : ENGLISH_KEYWORDS;
  const keywordHits = {
    plot: keywordScore(text, keywords.plot),
    character: keywordScore(text, keywords.character),
    information: keywordScore(text, keywords.information),
    breathing: keywordScore(text, keywords.breathing),
    transition: keywordScore(text, keywords.transition),
    world: keywordScore(text, keywords.world),
    conflict: keywordScore(text, keywords.conflict),
    relationship: keywordScore(text, keywords.relationship),
  };

  const aiTension = CLAMP(score.ai_tension ?? 0);
  const aiPace = CLAMP(score.ai_pace ?? 0);
  const buildUp = CLAMP(score.build_up_score ?? 0);
  const causality = CLAMP(score.causality_score ?? 0);
  const progress = CLAMP(score.dramatic_progress_score ?? 0);
  const legacyFiller = CLAMP(score.filler_ratio ?? 0);
  const setupTag = (score.setup_payoff_tag ?? '').toString().toLowerCase();
  const hasClimax = Boolean(score.has_climax ?? scene?.has_climax);
  const writerTension = score.writer_tension != null
    ? CLAMP(score.writer_tension / 10)
    : scene?.tension_level != null
    ? CLAMP(scene.tension_level / 10)
    : aiTension;
  const writerPace = score.writer_pace != null
    ? CLAMP(score.writer_pace / 10)
    : scene?.pace_level != null
    ? CLAMP(scene.pace_level / 10)
    : aiPace;

  const plotProgression = CLAMP((progress * 0.45) + (causality * 0.2) + (buildUp * 0.15) + (keywordHits.plot * 0.2));
  const characterDevelopment = CLAMP((keywordHits.character * 0.45) + (keywordHits.relationship * 0.2) + ((1 - Math.abs(writerTension - aiTension)) * 0.1) + ((1 - Math.abs(writerPace - aiPace)) * 0.05) + ((1 - aiPace) * 0.2));
  const informationValue = CLAMP((keywordHits.information * 0.4) + (keywordHits.world * 0.12) + ((setupTag === 'setup' || setupTag === 'payoff') ? 0.28 : 0) + ((scene?.hook ? 0.08 : 0)) + (causality * 0.12));
  const emotionalFunction = CLAMP((keywordHits.breathing * 0.4) + (keywordHits.world * 0.18) + (characterDevelopment * 0.17) + ((1 - aiTension) * 0.12) + ((1 - aiPace) * 0.13));
  const conflictPresence = CLAMP((aiTension * 0.52) + (buildUp * 0.15) + (keywordHits.conflict * 0.23) + (keywordHits.character * 0.1));
  const narrativeNecessity = CLAMP(
    (plotProgression * 0.28) +
    (characterDevelopment * 0.18) +
    (informationValue * 0.18) +
    (emotionalFunction * 0.12) +
    (conflictPresence * 0.14) +
    (hasClimax ? 0.1 : 0.06 * Math.max(plotProgression, informationValue, characterDevelopment))
  );

  const dims: NarrativeDimensions = {
    plot_progression: plotProgression,
    character_development: characterDevelopment,
    information_value: informationValue,
    emotional_function: emotionalFunction,
    conflict_presence: conflictPresence,
    narrative_necessity: narrativeNecessity,
  };

  const impactScore = CLAMP(
    (plotProgression * 0.27) +
    (characterDevelopment * 0.18) +
    (informationValue * 0.17) +
    (emotionalFunction * 0.15) +
    (conflictPresence * 0.11) +
    (narrativeNecessity * 0.12)
  );

  const lowImpactScore = CLAMP(1 - impactScore);
  const potentialFillerScore = CLAMP(
    (legacyFiller * 0.2) +
    ((1 - plotProgression) * 0.18) +
    ((1 - characterDevelopment) * 0.12) +
    ((1 - informationValue) * 0.14) +
    ((1 - narrativeNecessity) * 0.24) +
    ((1 - emotionalFunction) * 0.05) +
    ((1 - conflictPresence) * 0.07)
  );

  let classification: SceneClassification;
  if (hasClimax || plotProgression >= 0.72 || (conflictPresence >= 0.7 && narrativeNecessity >= 0.62)) {
    classification = 'core';
  } else if (informationValue >= 0.6 && setupTag !== 'payoff' && plotProgression < 0.64) {
    classification = 'setup';
  } else if (emotionalFunction >= 0.56 && aiTension <= 0.55 && (keywordHits.breathing >= 0.2 || characterDevelopment >= 0.44)) {
    classification = 'breathing';
  } else if (keywordHits.transition >= 0.35 && narrativeNecessity >= 0.44) {
    classification = 'transition';
  } else if (narrativeNecessity >= 0.58 || characterDevelopment >= 0.5 || informationValue >= 0.52) {
    classification = 'supportive';
  } else if (potentialFillerScore >= 0.64 && lowImpactScore >= 0.58 && keywordHits.transition < 0.35 && emotionalFunction < 0.5) {
    classification = 'potential_filler';
  } else if (impactScore < 0.44 || narrativeNecessity < 0.44) {
    classification = 'weak_impact';
  } else {
    classification = 'supportive';
  }

  const purpose = selectPurpose(classification, dims, {
    plot: Math.round(keywordHits.plot * 10),
    character: Math.round(keywordHits.character * 10),
    information: Math.round(keywordHits.information * 10),
    breathing: Math.round(keywordHits.breathing * 10),
    transition: Math.round(keywordHits.transition * 10),
    world: Math.round(keywordHits.world * 10),
    conflict: Math.round(keywordHits.conflict * 10),
    relationship: Math.round(keywordHits.relationship * 10),
  });

  const tagsAr = sceneTagsAr(dims, classification);
  const tagsEn = sceneTagsEn(dims, classification);
  const reasonsAr = buildReasonsAr(classification, dims, {
    plot: Math.round(keywordHits.plot * 10),
    character: Math.round(keywordHits.character * 10),
    information: Math.round(keywordHits.information * 10),
    breathing: Math.round(keywordHits.breathing * 10),
    transition: Math.round(keywordHits.transition * 10),
    world: Math.round(keywordHits.world * 10),
    conflict: Math.round(keywordHits.conflict * 10),
    relationship: Math.round(keywordHits.relationship * 10),
  });
  const reasonsEn = buildReasonsEn(classification, dims, {
    plot: Math.round(keywordHits.plot * 10),
    character: Math.round(keywordHits.character * 10),
    information: Math.round(keywordHits.information * 10),
    breathing: Math.round(keywordHits.breathing * 10),
    transition: Math.round(keywordHits.transition * 10),
    world: Math.round(keywordHits.world * 10),
    conflict: Math.round(keywordHits.conflict * 10),
    relationship: Math.round(keywordHits.relationship * 10),
  });

  const commentAr = buildCommentAr(classification, dims);
  const commentEn = buildCommentEn(classification, dims);
  const recommendationAr = buildRecommendationAr(classification, dims);
  const recommendationEn = buildRecommendationEn(classification, dims);

  return {
    classification,
    classification_label_ar: CLASSIFICATION_AR[classification],
    classification_label_en: CLASSIFICATION_EN[classification],
    scene_purpose: purpose,
    filler_ratio: Number(potentialFillerScore.toFixed(2)),
    tags: lang === 'ar' ? tagsAr : tagsEn,
    tags_ar: tagsAr,
    tags_en: tagsEn,
    reasons_ar: reasonsAr,
    reasons_en: reasonsEn,
    recommendation: lang === 'ar' ? recommendationAr : recommendationEn,
    recommendation_ar: recommendationAr,
    recommendation_en: recommendationEn,
    comment: lang === 'ar' ? commentAr : commentEn,
    comment_ar: commentAr,
    comment_en: commentEn,
    narrative_dimensions: Object.fromEntries(
      Object.entries(dims).map(([key, value]) => [key, Number(value.toFixed(2))]),
    ) as NarrativeDimensions,
    debug: {
      legacy_filler_ratio: Number(legacyFiller.toFixed(2)),
      recomputed_filler_ratio: Number(potentialFillerScore.toFixed(2)),
      impact_score: Number(impactScore.toFixed(2)),
      low_impact_score: Number(lowImpactScore.toFixed(2)),
      keyword_hits: Object.fromEntries(
        Object.entries(keywordHits).map(([key, value]) => [key, Number(value.toFixed(2))]),
      ),
      thresholds: {
        potentialFiller: 0.64,
        lowImpact: 0.58,
        warningRunLength: 3,
        stallRatio: 0.3,
      },
    },
  };
}

function buildWarnings(
  sceneScores: Array<RawSceneScore & NarrativeAssessment>,
  lang: 'ar' | 'en',
): { structuralWarnings: string[]; uiWarnings: ProcessedWarning[] } {
  const uiWarnings: ProcessedWarning[] = [];
  const structuralWarnings: string[] = [];

  let runStart = -1;
  for (let i = 0; i < sceneScores.length; i++) {
    const cls = sceneScores[i].classification;
    const isLowImpact = cls === 'weak_impact' || cls === 'potential_filler';
    if (isLowImpact) {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      const runLength = i - runStart;
      if (runLength >= 3) {
        const message = lang === 'ar'
          ? 'يوجد تباطؤ ملحوظ في تقدم الأحداث هنا.'
          : 'There is a noticeable slowdown in story progression here.';
        uiWarnings.push({
          type: 'low_impact_run',
          message,
          indices: Array.from({ length: runLength }, (_, offset) => runStart + offset),
        });
        structuralWarnings.push(message);
      }
      runStart = -1;
    }
  }
  if (runStart !== -1) {
    const runLength = sceneScores.length - runStart;
    if (runLength >= 3) {
      const message = lang === 'ar'
        ? 'الإيقاع هادئ لفترة طويلة نسبيًا.'
        : 'The pacing stays quiet for a relatively long stretch.';
      uiWarnings.push({
        type: 'low_impact_run',
        message,
        indices: Array.from({ length: runLength }, (_, offset) => runStart + offset),
      });
      structuralWarnings.push(message);
    }
  }

  const lowImpactCount = sceneScores.filter(s => s.classification === 'weak_impact' || s.classification === 'potential_filler').length;
  const stallRatio = sceneScores.length > 0 ? lowImpactCount / sceneScores.length : 0;
  if (stallRatio >= 0.3) {
    const message = lang === 'ar'
      ? 'هذا الجزء يعتمد أكثر على الوصف من التغيير الدرامي.'
      : 'This stretch relies more on description than on dramatic change.';
    uiWarnings.push({
      type: 'pacing_stall',
      message,
      indices: sceneScores
        .map((scene, index) => ({ scene, index }))
        .filter(({ scene }) => scene.classification === 'weak_impact' || scene.classification === 'potential_filler')
        .map(({ index }) => index),
    });
    structuralWarnings.push(message);
  }

  return {
    structuralWarnings: buildTagSet(structuralWarnings),
    uiWarnings,
  };
}

export function applyNarrativeDiagnostics(params: {
  sceneScores: RawSceneScore[];
  scenes: PlotSceneLike[];
  language: 'ar' | 'en';
  projectType: ProjectType;
  log?: (message: string, payload?: unknown) => void;
}): ProcessedResults {
  const { sceneScores, scenes, language, projectType, log } = params;

  const sceneMap = new Map<string, PlotSceneLike>();
  for (const scene of scenes) {
    sceneMap.set(`${scene.chapter_index}:${scene.order_index}`, scene);
  }

  const processed = sceneScores.map((score) => {
    const scene = sceneMap.get(`${score.chapter_index}:${score.scene_index}`);
    const assessment = assessScene(score, scene, language);
    const merged = {
      ...score,
      ...assessment,
      scene_purpose: assessment.scene_purpose,
      filler_ratio: assessment.filler_ratio,
      recommendation: assessment.recommendation,
      comment: assessment.comment,
    };

    log?.(
      `[critic-debug] c${score.chapter_index}s${score.scene_index} ${assessment.classification} old=${assessment.debug.legacy_filler_ratio} new=${assessment.debug.recomputed_filler_ratio} impact=${assessment.debug.impact_score}`,
      {
        projectType,
        dimensions: assessment.narrative_dimensions,
        tags: assessment.tags_ar,
        reasons: assessment.reasons_ar,
      },
    );

    return merged;
  });

  const fillerScenes = processed
    .filter((scene) => scene.classification === 'potential_filler')
    .map((scene) => ({
      chapter_index: scene.chapter_index,
      scene_index: scene.scene_index,
      reason: language === 'ar'
        ? scene.reasons_ar[0] ?? 'يفتقد هذا المقطع إلى وظيفة سردية واضحة.'
        : scene.reasons_en[0] ?? 'This unit lacks a clear narrative function.',
    }));

  const { structuralWarnings, uiWarnings } = buildWarnings(processed, language);
  log?.('[critic-debug] warning-summary', {
    structuralWarnings,
    uiWarnings,
  });

  return {
    scene_scores: processed,
    filler_scenes: fillerScenes,
    structural_warnings: structuralWarnings,
    ui_warnings: uiWarnings,
    debug_summary: {
      scene_count: processed.length,
      potential_filler_count: fillerScenes.length,
      weak_impact_count: processed.filter((scene) => scene.classification === 'weak_impact').length,
      classifications: processed.reduce<Record<string, number>>((acc, scene) => {
        acc[scene.classification] = (acc[scene.classification] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };
}
