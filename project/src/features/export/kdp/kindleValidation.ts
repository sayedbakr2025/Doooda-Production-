import type { EpubManifest, EpubChapter } from './kindleEpubEngine';

export type KindleIssueSeverity = 'error' | 'warning';

export interface KindleIssue {
  code: string;
  severity: KindleIssueSeverity;
  messageEn: string;
  messageAr: string;
  chapterId?: string;
  chapterTitle?: string;
}

export interface KindleValidationResult {
  passed: boolean;
  issues: KindleIssue[];
}

const INLINE_STYLE_RE = /\s+style="[^"]*"/i;
const BROKEN_ANCHOR_RE = /href="#([^"]+)"/g;
const EMPTY_HREF_RE = /href=["']["']/;

function hasInlineStyles(html: string): boolean {
  return INLINE_STYLE_RE.test(html);
}

function collectAnchors(html: string): Set<string> {
  const ids = new Set<string>();
  const idRe = /id="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(html)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

function collectHrefs(html: string): string[] {
  const hrefs: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(BROKEN_ANCHOR_RE.source, 'g');
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

export function runKindleValidation(manifest: EpubManifest): KindleValidationResult {
  const issues: KindleIssue[] = [];

  if (manifest.chapters.length === 0) {
    issues.push({
      code: 'NO_CHAPTERS',
      severity: 'error',
      messageEn: 'No chapters found. The ePub requires at least one chapter.',
      messageAr: 'لا توجد فصول. يتطلب ملف ePub فصلًا واحدًا على الأقل.',
    });
    return { passed: false, issues };
  }

  const emptyChapters = manifest.chapters.filter(
    (ch) => !ch.contentHtml && ch.scenes.every((s) => !s.contentHtml)
  );

  emptyChapters.forEach((ch) => {
    issues.push({
      code: 'EMPTY_CHAPTER',
      severity: 'error',
      messageEn: `Chapter "${ch.title}" is empty. Kindle does not allow empty chapters.`,
      messageAr: `الفصل "${ch.title}" فارغ. Kindle لا يسمح بفصول فارغة.`,
      chapterId: ch.id,
      chapterTitle: ch.title,
    });
  });

  const allChapterIds = new Set(manifest.chapters.map((ch) => ch.id));

  manifest.chapters.forEach((ch) => {
    const allHtml = [ch.contentHtml, ...ch.scenes.map((s) => s.contentHtml)].join('\n');

    if (hasInlineStyles(allHtml)) {
      issues.push({
        code: 'INLINE_STYLES',
        severity: 'warning',
        messageEn: `Chapter "${ch.title}" contains inline styles. Kindle ignores inline styles — they have been stripped automatically.`,
        messageAr: `الفصل "${ch.title}" يحتوي على أنماط مضمّنة. Kindle يتجاهل الأنماط المضمّنة — تم حذفها تلقائيًا.`,
        chapterId: ch.id,
        chapterTitle: ch.title,
      });
    }

    const localIds = collectAnchors(allHtml);
    const hrefs = collectHrefs(allHtml);
    hrefs.forEach((href) => {
      if (!localIds.has(href) && !allChapterIds.has(href)) {
        issues.push({
          code: 'BROKEN_LINK',
          severity: 'warning',
          messageEn: `Broken anchor link "#${href}" in chapter "${ch.title}".`,
          messageAr: `رابط مكسور "#${href}" في الفصل "${ch.title}".`,
          chapterId: ch.id,
          chapterTitle: ch.title,
        });
      }
    });

    if (EMPTY_HREF_RE.test(allHtml)) {
      issues.push({
        code: 'EMPTY_HREF',
        severity: 'warning',
        messageEn: `Chapter "${ch.title}" has a link with an empty href.`,
        messageAr: `الفصل "${ch.title}" يحتوي على رابط فارغ.`,
        chapterId: ch.id,
        chapterTitle: ch.title,
      });
    }
  });

  if (!manifest.title || !manifest.title.trim()) {
    issues.push({
      code: 'MISSING_TITLE',
      severity: 'error',
      messageEn: 'Book title is required for a valid ePub.',
      messageAr: 'عنوان الكتاب مطلوب لملف ePub صالح.',
    });
  }

  if (!manifest.author || !manifest.author.trim()) {
    issues.push({
      code: 'MISSING_AUTHOR',
      severity: 'warning',
      messageEn: 'No author name provided. Kindle listings require an author.',
      messageAr: 'لم يُحدَّد اسم المؤلف. قوائم Kindle تتطلب اسم مؤلف.',
    });
  }

  const errors = issues.filter((i) => i.severity === 'error');
  return { passed: errors.length === 0, issues };
}

export function summarizeKindleValidation(
  result: KindleValidationResult,
  lang: 'ar' | 'en'
): string {
  if (result.passed && result.issues.length === 0) {
    return lang === 'ar'
      ? 'ملف ePub جاهز للتصدير — لا توجد مشاكل.'
      : 'ePub is ready to export — no issues found.';
  }
  const errors = result.issues.filter((i) => i.severity === 'error').length;
  const warnings = result.issues.filter((i) => i.severity === 'warning').length;
  return lang === 'ar'
    ? `${errors} خطأ · ${warnings} تحذير`
    : `${errors} error(s) · ${warnings} warning(s)`;
}

export function chapterWordCount(ch: EpubChapter): number {
  return ch.wordCount;
}
