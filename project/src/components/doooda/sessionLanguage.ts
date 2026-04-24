export type SessionLang = 'ar' | 'en';

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_RANGE = /[a-zA-Z]/g;

export function detectTextLanguage(text: string): SessionLang | null {
  const cleaned = text.replace(/[\d\s\p{P}\p{S}]/gu, '');
  if (!cleaned) return null;

  const arabicCount = (cleaned.match(ARABIC_RANGE) || []).length;
  const latinCount = (cleaned.match(LATIN_RANGE) || []).length;
  const total = arabicCount + latinCount;

  if (total === 0) return null;

  const arabicRatio = arabicCount / total;
  if (arabicRatio > 0.6) return 'ar';
  if (arabicRatio < 0.4) return 'en';

  return null;
}

const SWITCH_TO_AR_PATTERNS = [
  /جاوب(ني)?\s*(بال)?عربي/,
  /كمّ?ل\s*(بال)?عربي/,
  /خلّ?ينا\s*نكمّ?ل\s*(بال)?عربي/,
  /اتكلم\s*عربي/,
  /بالعربي\s*(من\s*فضلك|لو\s*سمحت)?/,
  /answer\s+in\s+arabic/i,
  /reply\s+in\s+arabic/i,
  /respond\s+in\s+arabic/i,
  /switch\s+to\s+arabic/i,
  /continue\s+in\s+arabic/i,
  /speak\s+arabic/i,
  /in\s+arabic\s*(please)?$/i,
];

const SWITCH_TO_EN_PATTERNS = [
  /جاوب(ني)?\s*(بال)?إنجليزي/,
  /جاوب(ني)?\s*(بال)?انجليزي/,
  /كمّ?ل\s*(بال)?(إنجليزي|انجليزي)/,
  /خلّ?ينا\s*نكمّ?ل\s*(بال)?(إنجليزي|انجليزي)/,
  /اتكلم\s*(إنجليزي|انجليزي)/,
  /بال(إنجليزي|انجليزي)\s*(من\s*فضلك|لو\s*سمحت)?/,
  /answer\s+in\s+english/i,
  /reply\s+in\s+english/i,
  /respond\s+in\s+english/i,
  /switch\s+to\s+english/i,
  /continue\s+in\s+english/i,
  /speak\s+english/i,
  /let'?s?\s+(continue|go)\s+in\s+english/i,
  /in\s+english\s*(please)?$/i,
];

export function detectLanguageOverride(text: string): SessionLang | null {
  const trimmed = text.trim();
  if (SWITCH_TO_AR_PATTERNS.some((p) => p.test(trimmed))) return 'ar';
  if (SWITCH_TO_EN_PATTERNS.some((p) => p.test(trimmed))) return 'en';
  return null;
}

export function isDominanceClear(text: string): boolean {
  const cleaned = text.replace(/[\d\s\p{P}\p{S}]/gu, '');
  if (!cleaned) return true;

  const arabicCount = (cleaned.match(ARABIC_RANGE) || []).length;
  const latinCount = (cleaned.match(LATIN_RANGE) || []).length;
  const total = arabicCount + latinCount;

  if (total === 0) return true;

  const arabicRatio = arabicCount / total;
  return arabicRatio > 0.6 || arabicRatio < 0.4;
}

export function getClarificationQuestion(currentLang: SessionLang): string {
  return currentLang === 'ar'
    ? 'تحب نكمّل بالعربي ولا بالإنجليزي؟'
    : 'Would you like to continue in Arabic or English?';
}
