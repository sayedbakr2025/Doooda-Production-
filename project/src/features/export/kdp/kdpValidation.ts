import type { Chapter, Scene } from '../../../types';

export interface KdpIssue {
  severity: 'error' | 'warning';
  code: string;
  messageEn: string;
  messageAr: string;
  chapterId?: string;
  chapterTitle?: string;
}

export interface KdpValidationResult {
  passed: boolean;
  issues: KdpIssue[];
}

const MIN_WORD_COUNT_NOVEL = 10000;
const MIN_WORD_COUNT_SHORT = 2000;
const SHORT_SCENE_THRESHOLD = 30;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function runKdpValidation(
  chapters: Chapter[],
  scenesMap: Record<string, Scene[]>,
  projectType: string,
  totalWordCount: number
): KdpValidationResult {
  const issues: KdpIssue[] = [];

  const activeChapters = chapters.filter((c) => c.is_active !== false);

  if (activeChapters.length === 0) {
    issues.push({
      severity: 'error',
      code: 'NO_CHAPTERS',
      messageEn: 'No chapters found. Your book needs at least one chapter.',
      messageAr: 'لا توجد فصول. الكتاب بحاجة إلى فصل واحد على الأقل.',
    });
  }

  const emptyChapters = activeChapters.filter((ch) => {
    const scenes = scenesMap[ch.id] || [];
    const activeScenes = scenes.filter((s) => s.is_active !== false);
    const hasChapterContent = ch.content && countWords(ch.content) > 5;
    const hasScenesContent = activeScenes.some((s) => s.content && countWords(s.content) > 5);
    return !hasChapterContent && !hasScenesContent;
  });

  emptyChapters.forEach((ch) => {
    issues.push({
      severity: 'warning',
      code: 'EMPTY_CHAPTER',
      messageEn: `"${ch.title}" appears to be empty.`,
      messageAr: `الفصل "${ch.title}" يبدو فارغًا.`,
      chapterId: ch.id,
      chapterTitle: ch.title,
    });
  });

  activeChapters.forEach((ch) => {
    const scenes = scenesMap[ch.id] || [];
    const activeScenes = scenes.filter((s) => s.is_active !== false);
    activeScenes.forEach((sc) => {
      const words = sc.content ? countWords(sc.content) : 0;
      if (words > 0 && words < SHORT_SCENE_THRESHOLD) {
        issues.push({
          severity: 'warning',
          code: 'SHORT_SCENE',
          messageEn: `Scene "${sc.title}" in "${ch.title}" is very short (${words} words). Consider expanding or merging.`,
          messageAr: `المشهد "${sc.title}" في "${ch.title}" قصير جدًا (${words} كلمة). يُنصح بتوسيعه أو دمجه.`,
          chapterId: ch.id,
          chapterTitle: ch.title,
        });
      }
    });
  });

  const headings = activeChapters.map((ch) => ch.title.trim().toLowerCase());
  const seen = new Set<string>();
  headings.forEach((h, i) => {
    if (seen.has(h)) {
      issues.push({
        severity: 'warning',
        code: 'REPEATED_HEADING',
        messageEn: `Duplicate chapter title found: "${activeChapters[i].title}".`,
        messageAr: `عنوان فصل مكرر: "${activeChapters[i].title}".`,
        chapterId: activeChapters[i].id,
        chapterTitle: activeChapters[i].title,
      });
    }
    seen.add(h);
  });

  const minWords = projectType === 'short_story' ? MIN_WORD_COUNT_SHORT : MIN_WORD_COUNT_NOVEL;
  if (totalWordCount < minWords) {
    issues.push({
      severity: 'warning',
      code: 'LOW_WORD_COUNT',
      messageEn: `Total word count (${totalWordCount.toLocaleString()}) is below the recommended minimum for KDP (${minWords.toLocaleString()} words).`,
      messageAr: `عدد الكلمات الإجمالي (${totalWordCount.toLocaleString()}) أقل من الحد الأدنى الموصى به في KDP (${minWords.toLocaleString()} كلمة).`,
    });
  }

  issues.push({
    severity: 'warning',
    code: 'NO_COVER',
    messageEn: 'No cover image included. KDP requires a cover image (2,560 × 1,600 px recommended) uploaded separately.',
    messageAr: 'لا توجد صورة غلاف. يتطلب KDP رفع صورة غلاف منفصلة (2560 × 1600 بكسل مُوصى به).',
  });

  const errors = issues.filter((i) => i.severity === 'error');
  return {
    passed: errors.length === 0,
    issues,
  };
}
