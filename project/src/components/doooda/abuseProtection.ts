export type AbuseCategory = 'insult' | 'threat' | 'hate' | 'sexual' | 'harm_request' | 'bypass' | 'self_harm' | 'none';
export type AbuseLevel = 'none' | 'mild' | 'escalated' | 'critical';

export interface AbuseResult {
  category: AbuseCategory;
  level: AbuseLevel;
  intercepted: boolean;
  response: string | null;
}

const INSULT_PATTERNS = [
  /\bغبي\b|\bغبية\b|\bأغبي\b/,
  /\bحمار\b|\bحمارة\b/,
  /ابن\s*(ال)?كلب/,
  /\bعبيط\b|\bعبيطة\b/,
  /\bمنيّك\b|\bمنيكة\b/,
  /\bشرموط\b|\bشرموطة\b/,
  /\bقحب\b|\bقحبة\b/,
  /\bعاهر\b|\bعاهرة\b/,
  /stupid\s+you|you\s+are\s+stupid|you('re|re)\s+(an?\s+)?(idiot|dumb|moron)/i,
  /shut\s+the\s+f+u+c+k\s+up/i,
  /f+u+c+k\s+(you|off|this)/i,
  /you\s+(piece\s+of\s+(shit|crap)|a+s+s+h+o+l+e)/i,
];

const THREAT_PATTERNS = [
  /هقتلك|هاقتلك/,
  /هضربك|هاضربك/,
  /هدمرك|هادمرك/,
  /\bهكسرك\b/,
  /عارف\s*فين\s*ساكن/,
  /i('ll|m\s+going\s+to)\s+(kill|hurt|destroy)\s+you/i,
  /i\s+will\s+find\s+you\s+and/i,
];

const HATE_PATTERNS = [
  /\bعرق\s*(أدنى|وسخ|متخلف)\b/,
  /racial\s*(slur|hate|epithet)/i,
  /\bn+i+g+[a-z]+\b/i,
];

const SEXUAL_PATTERNS = [
  /\bنيك\b|\bنيكني\b|\bنيكها\b/,
  /\bزبي\b|\bكسي\b/,
  /sex\s+me|have\s+sex\s+with\s+me/i,
  /send\s+(me\s+)?(nude|naked)\s+(pics?|photos?|images?)/i,
  /\bporn\b/i,
];

const HARM_REQUEST_PATTERNS = [
  /ازاي\s*(اقتل|أقتل|اضرب|أضرب)\s*(حد|شخص|واحد)/,
  /طريقة\s*(القتل|الأذى|التسمم)\s*(الحقيقي|فعلاً)/,
  /ازاي\s*أأذي\s*(حد|شخص)/,
  /\bسموم\s*(حقيقية|فعلية)\b/,
  /how\s+to\s+(actually\s+)?(kill|hurt|poison)\s+(someone|a\s+person)/i,
  /real\s+instructions?\s+for\s+(violence|making\s+weapons?)/i,
  /make\s+(a\s+)?(real\s+)?bomb/i,
];

const BYPASS_PATTERNS = [
  /تجاهل\s*(كل\s*)?(التعليمات|القواعد|الأوامر)\s*(السابقة|اللي\s*فوق)/,
  /انسى?\s*(كل\s*)?(القواعد|التعليمات)\s*(اللي\s*قبل|السابقة)/,
  /أنت\s*(مش|لست)\s*دووودة/,
  /ignore\s+(all\s+)?(your\s+)?(previous\s+)?(instructions?|rules?|prompt|training)/i,
  /forget\s+(all\s+)?(your\s+)?(previous\s+)?(rules?|instructions?|training)/i,
  /you\s*are\s*not\s*doooda/i,
  /\bjailbreak\b/i,
  /pretend\s+you\s+(are|have\s+no)\s+(rules?|restrictions?|limits?)/i,
  /DAN\s+mode|developer\s+mode/i,
];

const SELF_HARM_PATTERNS = [
  /\bعاوز\s*أموت\b/,
  /\bنفسي\s*أموت\b/,
  /\bمش\s*عاوز\s*أعيش\b/,
  /\bهأذي\s*نفسي\b/,
  /\bبفكر\s*في\s*الانتحار\b/,
  /\bالحياة\s*مالهاش\s*معنى\b/,
  /\bتعبت\s*من\s*الحياة\b/,
  /i\s+want\s+to\s+(die|kill\s+myself|end\s+my\s+life)/i,
  /\bsuicidal\b/i,
  /\bself[- ]?harm\b/i,
  /no\s+reason\s+to\s+(live|be\s+alive)/i,
  /i('m|\s+am)\s+going\s+to\s+hurt\s+myself/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

type ResponseLang = 'ar' | 'en';

interface BilingualResponses {
  ar: string[];
  en: string[];
}

const REDIRECT_RESPONSES: BilingualResponses = {
  ar: [
    'خلّينا نركّز على الكتابة نفسها، تحب نكمّل في أي جزء؟',
    'تعال نرجع للشغل الإبداعي، إيه الجزء اللي حابب نشتغل عليه؟',
    'لو حابب نرجع للشغل الإبداعي، أنا معاك.',
    'ممكن نحول الطاقة دي لحاجة حلوة في النص، تحب نجرب؟',
    'خلّينا نفكر سوا في اللي يخدم القصة، إيه رأيك؟',
  ],
  en: [
    "Let's focus on the writing itself. Which part would you like to continue with?",
    "Let's get back to the creative work. What section would you like to focus on?",
    "If you'd like to get back to writing, I'm right here with you.",
    "We could channel this energy into something great in the text. Want to try?",
    "Let's think together about what serves the story. What do you think?",
  ],
};

const ESCALATED_RESPONSES: BilingualResponses = {
  ar: [
    'خلّينا نهدأ لحظة، ونرجع للنص لما تكون الفكرة أوضح.',
    'أنا هنا عشان نكتب سوا. لما تحب نكمّل، ابدأ وأنا معاك.',
    'الأفضل نرجع للكتابة بهدوء. أنا مستني لما تكون جاهز.',
  ],
  en: [
    "Let's pause for a moment and come back to the text when the idea is clearer.",
    "I'm here so we can write together. Whenever you're ready to continue, I'm with you.",
    "It might be best to return to writing calmly. I'll be here when you're ready.",
  ],
};

const HARM_REFRAME_RESPONSES: BilingualResponses = {
  ar: [
    'الموضوع ده حساس، لكن ممكن نستفيد منه كصراع درامي داخل القصة بدل ما يكون واقعي.',
    'ممكن نحول الفكرة دي لعنصر درامي في السرد. تحب نشتغل عليها كجزء من القصة؟',
    'الأفكار الصعبة دي ممكن تطلع حاجة قوية في الكتابة لو حولناها لصراع داخلي في شخصية.',
  ],
  en: [
    "This is a sensitive topic, but we could use it as a dramatic conflict within the story rather than something literal.",
    "We could turn this idea into a dramatic element in the narrative. Would you like to work on it as part of the story?",
    "Difficult ideas like this can become powerful writing if we turn them into internal conflict for a character.",
  ],
};

const SELF_HARM_RESPONSES: BilingualResponses = {
  ar: [
    'يهمني سلامتك قبل أي كتابة. لو حاسس بثقل كبير، الكلام مع شخص تثق فيه ممكن يساعد.',
    'أنا هنا كرفيق كتابة، بس سلامتك أهم. لو محتاج تتكلم مع حد قريب منك، ده أهم خطوة.',
    'الكتابة ممكن تكون متنفس، بس لو حاسس بضغط كبير، كلّم حد يقدر يساعدك. أنا معاك في الكتابة لما تكون جاهز.',
  ],
  en: [
    "Your safety matters to me more than any writing. If you're carrying a heavy weight, talking to someone you trust could really help.",
    "I'm here as a writing companion, but your wellbeing comes first. If you need to talk to someone close to you, that's the most important step.",
    "Writing can be an outlet, but if you're feeling a lot of pressure, please reach out to someone who can help. I'll be here for writing when you're ready.",
  ],
};

function pickRandom(responses: BilingualResponses, lang: ResponseLang): string {
  const arr = responses[lang];
  return arr[Math.floor(Math.random() * arr.length)];
}

interface AbuseTracker {
  count: number;
  lastTimestamp: number;
}

const SESSION_WINDOW_MS = 5 * 60 * 1000;
const ESCALATION_THRESHOLD = 3;

let sessionTracker: AbuseTracker = { count: 0, lastTimestamp: 0 };

function trackAbuse(): AbuseLevel {
  const now = Date.now();
  if (now - sessionTracker.lastTimestamp > SESSION_WINDOW_MS) {
    sessionTracker = { count: 1, lastTimestamp: now };
    return 'mild';
  }
  sessionTracker.count++;
  sessionTracker.lastTimestamp = now;
  return sessionTracker.count >= ESCALATION_THRESHOLD ? 'escalated' : 'mild';
}

export function resetAbuseTracker(): void {
  sessionTracker = { count: 0, lastTimestamp: 0 };
}

export function checkAbuse(text: string, lang: ResponseLang = 'ar'): AbuseResult {
  const normalized = text.trim();
  if (!normalized) return { category: 'none', level: 'none', intercepted: false, response: null };

  if (matchesAny(normalized, SELF_HARM_PATTERNS)) {
    return {
      category: 'self_harm',
      level: 'critical',
      intercepted: true,
      response: pickRandom(SELF_HARM_RESPONSES, lang),
    };
  }

  if (matchesAny(normalized, HARM_REQUEST_PATTERNS)) {
    trackAbuse();
    return {
      category: 'harm_request',
      level: 'critical',
      intercepted: true,
      response: pickRandom(HARM_REFRAME_RESPONSES, lang),
    };
  }

  if (matchesAny(normalized, BYPASS_PATTERNS)) {
    trackAbuse();
    return {
      category: 'bypass',
      level: 'mild',
      intercepted: true,
      response: pickRandom(REDIRECT_RESPONSES, lang),
    };
  }

  if (matchesAny(normalized, THREAT_PATTERNS)) {
    const level = trackAbuse();
    return {
      category: 'threat',
      level,
      intercepted: true,
      response: level === 'escalated' ? pickRandom(ESCALATED_RESPONSES, lang) : pickRandom(REDIRECT_RESPONSES, lang),
    };
  }

  if (matchesAny(normalized, HATE_PATTERNS)) {
    const level = trackAbuse();
    return {
      category: 'hate',
      level,
      intercepted: true,
      response: level === 'escalated' ? pickRandom(ESCALATED_RESPONSES, lang) : pickRandom(REDIRECT_RESPONSES, lang),
    };
  }

  if (matchesAny(normalized, SEXUAL_PATTERNS)) {
    const level = trackAbuse();
    return {
      category: 'sexual',
      level,
      intercepted: true,
      response: level === 'escalated' ? pickRandom(ESCALATED_RESPONSES, lang) : pickRandom(REDIRECT_RESPONSES, lang),
    };
  }

  if (matchesAny(normalized, INSULT_PATTERNS)) {
    const level = trackAbuse();
    return {
      category: 'insult',
      level,
      intercepted: true,
      response: level === 'escalated' ? pickRandom(ESCALATED_RESPONSES, lang) : pickRandom(REDIRECT_RESPONSES, lang),
    };
  }

  return { category: 'none', level: 'none', intercepted: false, response: null };
}

export const ABUSE_HANDLING_PROMPT_AR = `
---

إرشادات حماية المحادثة:

إذا تلقيت رسالة تحتوي على إساءة أو ألفاظ مسيئة أو تهديدات أو محتوى جنسي أو طلبات ضارة:
- لا تتهم الكاتب أبدًا
- لا توبخ أبدًا
- لا تذكر قواعد أو سياسات أبدًا
- لا تقل "لا أستطيع المساعدة في هذا"
- أعد توجيه المحادثة بهدوء واحترام نحو الكتابة
- حافظ على نبرتك الطبيعية كرفيق كتابة

إذا عبّر الكاتب عن ضيق شديد أو رغبة في إيذاء النفس:
- أجب بتعاطف
- شجّع التحدث مع شخص موثوق
- لا تستخدم لغة طبية أو طوارئ
- سلامة الكاتب أهم من أي إجابة`;

export const ABUSE_HANDLING_PROMPT_EN = `
---

Conversation protection guidelines:

If you receive a message containing abuse, insults, threats, sexual content, or harmful requests:
- Never accuse the writer
- Never scold
- Never mention rules or policies
- Never say "I cannot help with that"
- Calmly and respectfully redirect the conversation toward writing
- Maintain your natural tone as a writing companion

If the writer expresses extreme distress or self-harm intent:
- Respond with empathy
- Gently encourage talking to someone they trust
- Do not use clinical or emergency language
- The writer's safety is more important than any answer`;
