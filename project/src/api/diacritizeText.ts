import { invokeWithAuth } from '../lib/supabaseClient';

export type ArabicToolMode =
  | "light"
  | "full"
  | "correction_with_diacritics"
  | "proofread"
  | "proofread_advanced"
  | "punctuation"
  | "light_with_punctuation"
  | "full_with_punctuation";

const MAX_WORDS_PER_CHUNK = 2000;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function splitIntoChunks(text: string, maxWords: number): string[] {
  const words = text.split(/(\s+)/);
  const chunks: string[] = [];
  let currentChunk = '';
  let wordCount = 0;

  for (const token of words) {
    const isWord = token.trim().length > 0;
    if (isWord) wordCount++;

    currentChunk += token;

    if (wordCount >= maxWords) {
      const lastSentenceEnd = Math.max(
        currentChunk.lastIndexOf('.\n'),
        currentChunk.lastIndexOf('.\r'),
        currentChunk.lastIndexOf('. '),
        currentChunk.lastIndexOf('.\t'),
        currentChunk.lastIndexOf('\n'),
      );

      if (lastSentenceEnd > currentChunk.length * 0.5) {
        chunks.push(currentChunk.substring(0, lastSentenceEnd + 1).trimEnd());
        currentChunk = currentChunk.substring(lastSentenceEnd + 1).trimStart();
        wordCount = currentChunk.trim().split(/\s+/).filter(w => w.length > 0).length;
      } else {
        chunks.push(currentChunk.trimEnd());
        currentChunk = '';
        wordCount = 0;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trimEnd());
  }

  return chunks;
}

export async function diacritizeText(
  text: string,
  mode: ArabicToolMode,
  language: string
): Promise<{ diacritizedText: string; tokens_left?: number; tokens_used?: number } | { error: string; type?: string }> {
  const wordCount = countWords(text);

  if (wordCount > MAX_WORDS_PER_CHUNK) {
    const chunks = splitIntoChunks(text, MAX_WORDS_PER_CHUNK);
    const results: string[] = [];
    let totalTokensUsed = 0;
    let tokensLeft = 0;

    for (const chunk of chunks) {
      const result = await processSingleChunk(chunk, mode, language);
      if ('error' in result) return result;
      results.push(result.diacritizedText);
      totalTokensUsed += result.tokens_used || 0;
      tokensLeft = result.tokens_left || 0;
    }

    return {
      diacritizedText: results.join('\n'),
      tokens_used: totalTokensUsed,
      tokens_left: tokensLeft,
    };
  }

  return processSingleChunk(text, mode, language);
}

async function processSingleChunk(
  text: string,
  mode: ArabicToolMode,
  language: string
): Promise<{ diacritizedText: string; tokens_left?: number; tokens_used?: number } | { error: string; type?: string }> {
  const { data, error, requiresAuth } = await invokeWithAuth('diacritize-text', {
    body: { text, mode, language },
  });

  if (requiresAuth) {
    return { error: 'يجب تسجيل الدخول لاستخدام أدوات اللغة العربية' };
  }

  if (error) {
    return { error: error.message || 'حدث خطأ أثناء معالجة النص' };
  }

  if (data?.type === 'LIMIT_REACHED') {
    return { error: data.error || 'انتهى رصيدك من التوكنز', type: 'LIMIT_REACHED' };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return data;
}
