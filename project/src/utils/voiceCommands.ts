function normalizeArabic(word: string): string {
  return word
    .replace(/[هة]/g, 'ة')
    .replace(/[اأإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

export const arabicCommands: Record<string, string> = {
  "فاصلة": "،",
  "فاصله": "،",
  "نقطة": ".",
  "نقطه": ".",
  "فاصلة منقوطة": "؛",
  "فاصله منقوطه": "؛",
  "نقطتان": ":",
  "نقطتين": ":",
  "نقطتان راسيتان": ":",
  "نقطتين راسيتين": ":",
  "نقطه راسيه": ":",
  "نقطة رأسية": ":",
  "علامة استفهام": "؟",
  "علامه استفهام": "؟",
  "علامة تعجب": "!",
  "علامه تعجب": "!",
  "شرطة": "-",
  "شرطه": "-",
  "شرطة طويلة": "—",
  "شرطه طويله": "—",
  "شرطة تحتية": "_",
  "شرطه تحتيه": "_",
  "فتح قوس": "(",
  "غلق قوس": ")",
  "قوس مفتوح": "(",
  "قوس مقفول": ")",
  "قوس مقفل": ")",
  "فتح قوس مربع": "[",
  "غلق قوس مربع": "]",
  "فتح قوس مزخرف": "{",
  "غلق قوس مزخرف": "}",
  "علامة اقتباس": "\"",
  "علامه اقتباس": "\"",
  "علامة اقتباس مفردة": "'",
  "علامه اقتباس مفرده": "'",
  "ثلاث نقاط": "…",
  "ثلاث نقط": "…",
  "نقاط": "…",
  "سطر": "\n",
  "سطر جديد": "\n",
  "فقرة": "\n\n",
  "فقره": "\n\n",
  "مسافة": " ",
  "مسافه": " ",
};

export const englishCommands: Record<string, string> = {
  "comma": ",",
  "period": ".",
  "semicolon": ";",
  "colon": ":",
  "question mark": "?",
  "exclamation mark": "!",
  "exclamation": "!",
  "dash": "-",
  "long dash": "—",
  "underscore": "_",
  "open parenthesis": "(",
  "close parenthesis": ")",
  "open bracket": "[",
  "close bracket": "]",
  "open brace": "{",
  "close brace": "}",
  "double quote": "\"",
  "single quote": "'",
  "ellipsis": "…",
  "new line": "\n",
  "newline": "\n",
};

const normalizedArabicMap = new Map<string, string>();
for (const [key, value] of Object.entries(arabicCommands)) {
  normalizedArabicMap.set(normalizeArabic(key), value);
}

export function resolveCommand(command: string, lang: 'ar-EG' | 'en-US'): string | null {
  if (lang === 'en-US') {
    return englishCommands[command] ?? null;
  }
  const stripped = command.replace(/^ال/, '');
  return normalizedArabicMap.get(normalizeArabic(stripped)) ?? null;
}
