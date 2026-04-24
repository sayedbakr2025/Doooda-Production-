import type { KdpMetadata } from './kdpMetadataGenerator';
import type { KdpTrimSize } from './kdpPrintEngine';
import { estimatePageCount } from './kdpPrintEngine';

export type ComplianceSeverity = 'pass' | 'warning' | 'error';

export interface ComplianceCheck {
  code: string;
  category: 'content' | 'metadata' | 'technical' | 'pricing';
  labelEn: string;
  labelAr: string;
  severity: ComplianceSeverity;
  detailEn: string;
  detailAr: string;
}

export interface KdpComplianceResult {
  checks: ComplianceCheck[];
  kdpReady: boolean;
  errorCount: number;
  warningCount: number;
  passCount: number;
}

const VALID_TRIM_SIZES: KdpTrimSize[] = ['5x8', '6x9', '8.5x11'];

const KDP_MIN_PAGES = 24;
const KDP_MAX_PAGES = 828;
const KDP_MIN_DESCRIPTION_WORDS = 150;
const KDP_MAX_DESCRIPTION_WORDS = 4000;
const KDP_REQUIRED_KEYWORDS = 7;
const KDP_MIN_CATEGORIES = 2;
const KDP_MAX_CATEGORIES = 3;

const ISBN_RE = /^(?:97[89]\d{10}|\d{9}[\dX])$/;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkPageCount(
  wordCount: number,
  trimSize: KdpTrimSize | string
): ComplianceCheck {
  const ts = VALID_TRIM_SIZES.includes(trimSize as KdpTrimSize)
    ? (trimSize as KdpTrimSize)
    : '6x9';
  const pages = estimatePageCount(wordCount, ts);

  if (pages < KDP_MIN_PAGES) {
    return {
      code: 'PAGE_COUNT_LOW',
      category: 'technical',
      labelEn: 'Minimum Page Count',
      labelAr: 'الحد الأدنى لعدد الصفحات',
      severity: 'error',
      detailEn: `Estimated ${pages} pages. KDP requires at least ${KDP_MIN_PAGES} pages. Add more content.`,
      detailAr: `العدد المقدّر ${pages} صفحة. KDP يتطلب ${KDP_MIN_PAGES} صفحة على الأقل. أضف المزيد من المحتوى.`,
    };
  }
  if (pages > KDP_MAX_PAGES) {
    return {
      code: 'PAGE_COUNT_HIGH',
      category: 'technical',
      labelEn: 'Maximum Page Count',
      labelAr: 'الحد الأقصى لعدد الصفحات',
      severity: 'error',
      detailEn: `Estimated ${pages} pages. KDP allows a maximum of ${KDP_MAX_PAGES} pages. Split into volumes.`,
      detailAr: `العدد المقدّر ${pages} صفحة. KDP يسمح بحد أقصى ${KDP_MAX_PAGES} صفحة. قسّم الكتاب إلى أجزاء.`,
    };
  }
  return {
    code: 'PAGE_COUNT_OK',
    category: 'technical',
    labelEn: 'Page Count',
    labelAr: 'عدد الصفحات',
    severity: 'pass',
    detailEn: `Estimated ${pages} pages — within KDP range (${KDP_MIN_PAGES}–${KDP_MAX_PAGES}).`,
    detailAr: `العدد المقدّر ${pages} صفحة — ضمن النطاق المسموح به (${KDP_MIN_PAGES}–${KDP_MAX_PAGES}).`,
  };
}

function checkTrimSize(trimSize: string): ComplianceCheck {
  if (!trimSize || !trimSize.trim()) {
    return {
      code: 'TRIM_SIZE_MISSING',
      category: 'technical',
      labelEn: 'Trim Size',
      labelAr: 'حجم الكتاب',
      severity: 'warning',
      detailEn: 'No trim size selected. Choose a standard KDP trim size (e.g. 6" × 9").',
      detailAr: 'لم يُحدَّد حجم الكتاب. اختر حجمًا قياسيًا من KDP (مثلاً 6 × 9 بوصة).',
    };
  }
  const knownSizes = [
    '5x8', '5.5x8.5', '6x9', '6.14x9.21', '7x10', '8.5x11',
  ];
  if (!knownSizes.includes(trimSize)) {
    return {
      code: 'TRIM_SIZE_NONSTANDARD',
      category: 'technical',
      labelEn: 'Trim Size Compatibility',
      labelAr: 'توافق حجم الكتاب',
      severity: 'warning',
      detailEn: `"${trimSize}" may not be a standard KDP trim size. Verify at kdp.amazon.com.`,
      detailAr: `"${trimSize}" قد لا يكون حجمًا قياسيًا في KDP. تحقق على kdp.amazon.com.`,
    };
  }
  return {
    code: 'TRIM_SIZE_OK',
    category: 'technical',
    labelEn: 'Trim Size',
    labelAr: 'حجم الكتاب',
    severity: 'pass',
    detailEn: `Trim size "${trimSize}" is a valid KDP size.`,
    detailAr: `حجم "${trimSize}" صالح في KDP.`,
  };
}

function checkDescription(description: string): ComplianceCheck {
  const words = countWords(description);
  if (!description.trim() || words === 0) {
    return {
      code: 'DESCRIPTION_MISSING',
      category: 'metadata',
      labelEn: 'Book Description',
      labelAr: 'وصف الكتاب',
      severity: 'error',
      detailEn: 'Book description is required for KDP listing.',
      detailAr: 'وصف الكتاب مطلوب لقائمة KDP.',
    };
  }
  if (words < KDP_MIN_DESCRIPTION_WORDS) {
    return {
      code: 'DESCRIPTION_SHORT',
      category: 'metadata',
      labelEn: 'Description Length',
      labelAr: 'طول الوصف',
      severity: 'warning',
      detailEn: `Description has ${words} words. KDP recommends at least ${KDP_MIN_DESCRIPTION_WORDS} words to improve discoverability.`,
      detailAr: `الوصف يحتوي على ${words} كلمة. يُوصي KDP بـ${KDP_MIN_DESCRIPTION_WORDS} كلمة على الأقل لتحسين الظهور.`,
    };
  }
  if (words > KDP_MAX_DESCRIPTION_WORDS) {
    return {
      code: 'DESCRIPTION_LONG',
      category: 'metadata',
      labelEn: 'Description Length',
      labelAr: 'طول الوصف',
      severity: 'error',
      detailEn: `Description has ${words} words. KDP maximum is ${KDP_MAX_DESCRIPTION_WORDS} words.`,
      detailAr: `الوصف يحتوي على ${words} كلمة. الحد الأقصى في KDP هو ${KDP_MAX_DESCRIPTION_WORDS} كلمة.`,
    };
  }
  return {
    code: 'DESCRIPTION_OK',
    category: 'metadata',
    labelEn: 'Description Length',
    labelAr: 'طول الوصف',
    severity: 'pass',
    detailEn: `${words} words — meets KDP requirements.`,
    detailAr: `${words} كلمة — يستوفي متطلبات KDP.`,
  };
}

function checkKeywords(keywords: string[]): ComplianceCheck {
  const count = keywords.filter((k) => k.trim()).length;
  if (count === 0) {
    return {
      code: 'KEYWORDS_MISSING',
      category: 'metadata',
      labelEn: 'Keywords',
      labelAr: 'الكلمات المفتاحية',
      severity: 'error',
      detailEn: `No keywords provided. KDP requires exactly ${KDP_REQUIRED_KEYWORDS} keywords.`,
      detailAr: `لم تُحدَّد كلمات مفتاحية. KDP يتطلب ${KDP_REQUIRED_KEYWORDS} كلمات مفتاحية بالضبط.`,
    };
  }
  if (count < KDP_REQUIRED_KEYWORDS) {
    return {
      code: 'KEYWORDS_INSUFFICIENT',
      category: 'metadata',
      labelEn: 'Keywords Count',
      labelAr: 'عدد الكلمات المفتاحية',
      severity: 'error',
      detailEn: `${count} of ${KDP_REQUIRED_KEYWORDS} keywords provided. Add ${KDP_REQUIRED_KEYWORDS - count} more.`,
      detailAr: `${count} من ${KDP_REQUIRED_KEYWORDS} كلمات مفتاحية. أضف ${KDP_REQUIRED_KEYWORDS - count} أكثر.`,
    };
  }
  return {
    code: 'KEYWORDS_OK',
    category: 'metadata',
    labelEn: 'Keywords',
    labelAr: 'الكلمات المفتاحية',
    severity: 'pass',
    detailEn: `${count} keywords provided — meets KDP requirement.`,
    detailAr: `${count} كلمات مفتاحية — يستوفي متطلب KDP.`,
  };
}

function checkCategories(categories: string[]): ComplianceCheck {
  const count = categories.filter((c) => c.trim()).length;
  if (count < KDP_MIN_CATEGORIES) {
    return {
      code: 'CATEGORIES_INSUFFICIENT',
      category: 'metadata',
      labelEn: 'Categories',
      labelAr: 'التصنيفات',
      severity: 'error',
      detailEn: `${count} category selected. KDP requires ${KDP_MIN_CATEGORIES}–${KDP_MAX_CATEGORIES} categories.`,
      detailAr: `${count} تصنيف محدد. KDP يتطلب ${KDP_MIN_CATEGORIES}–${KDP_MAX_CATEGORIES} تصنيفات.`,
    };
  }
  if (count > KDP_MAX_CATEGORIES) {
    return {
      code: 'CATEGORIES_EXCESS',
      category: 'metadata',
      labelEn: 'Categories Count',
      labelAr: 'عدد التصنيفات',
      severity: 'warning',
      detailEn: `${count} categories selected. KDP allows a maximum of ${KDP_MAX_CATEGORIES}.`,
      detailAr: `${count} تصنيفات محددة. KDP يسمح بحد أقصى ${KDP_MAX_CATEGORIES}.`,
    };
  }
  return {
    code: 'CATEGORIES_OK',
    category: 'metadata',
    labelEn: 'Categories',
    labelAr: 'التصنيفات',
    severity: 'pass',
    detailEn: `${count} categories — meets KDP requirement.`,
    detailAr: `${count} تصنيفات — يستوفي متطلب KDP.`,
  };
}

function checkIsbn(isbn: string): ComplianceCheck {
  if (!isbn || !isbn.trim()) {
    return {
      code: 'ISBN_MISSING',
      category: 'metadata',
      labelEn: 'ISBN',
      labelAr: 'الرقم الدولي ISBN',
      severity: 'warning',
      detailEn: 'No ISBN provided. KDP will assign a free ISBN, or you can provide your own.',
      detailAr: 'لم يُدخَل رقم ISBN. سيمنحك KDP رقمًا مجانيًا، أو يمكنك استخدام رقمك الخاص.',
    };
  }
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!ISBN_RE.test(cleaned)) {
    return {
      code: 'ISBN_INVALID',
      category: 'metadata',
      labelEn: 'ISBN Format',
      labelAr: 'تنسيق ISBN',
      severity: 'error',
      detailEn: `"${isbn}" is not a valid ISBN-10 or ISBN-13 format.`,
      detailAr: `"${isbn}" ليس تنسيق ISBN-10 أو ISBN-13 صالحًا.`,
    };
  }
  return {
    code: 'ISBN_OK',
    category: 'metadata',
    labelEn: 'ISBN',
    labelAr: 'الرقم الدولي ISBN',
    severity: 'pass',
    detailEn: 'Valid ISBN format.',
    detailAr: 'تنسيق ISBN صالح.',
  };
}

function checkBlankPages(pageCount: number): ComplianceCheck {
  if (pageCount % 2 !== 0) {
    return {
      code: 'BLANK_PAGES_WARNING',
      category: 'technical',
      labelEn: 'Blank Pages',
      labelAr: 'الصفحات الفارغة',
      severity: 'warning',
      detailEn: `Odd page count (${pageCount}). KDP may add a blank page at the end. This is normal.`,
      detailAr: `عدد الصفحات فردي (${pageCount}). قد يضيف KDP صفحة فارغة في النهاية. هذا طبيعي.`,
    };
  }
  return {
    code: 'BLANK_PAGES_OK',
    category: 'technical',
    labelEn: 'Blank Pages',
    labelAr: 'الصفحات الفارغة',
    severity: 'pass',
    detailEn: 'Even page count — no unexpected blank pages.',
    detailAr: 'عدد الصفحات زوجي — لا صفحات فارغة غير متوقعة.',
  };
}

function checkTitle(title: string): ComplianceCheck {
  if (!title.trim()) {
    return {
      code: 'TITLE_MISSING',
      category: 'metadata',
      labelEn: 'Book Title',
      labelAr: 'عنوان الكتاب',
      severity: 'error',
      detailEn: 'Book title is required.',
      detailAr: 'عنوان الكتاب مطلوب.',
    };
  }
  if (title.trim().length < 3) {
    return {
      code: 'TITLE_SHORT',
      category: 'metadata',
      labelEn: 'Book Title',
      labelAr: 'عنوان الكتاب',
      severity: 'warning',
      detailEn: 'Title is very short. Consider a more descriptive title.',
      detailAr: 'العنوان قصير جدًا. فكر في عنوان أكثر وصفًا.',
    };
  }
  return {
    code: 'TITLE_OK',
    category: 'metadata',
    labelEn: 'Book Title',
    labelAr: 'عنوان الكتاب',
    severity: 'pass',
    detailEn: 'Title is present.',
    detailAr: 'العنوان موجود.',
  };
}

function checkAuthor(authorName: string): ComplianceCheck {
  if (!authorName.trim()) {
    return {
      code: 'AUTHOR_MISSING',
      category: 'metadata',
      labelEn: 'Author Name',
      labelAr: 'اسم المؤلف',
      severity: 'error',
      detailEn: 'Author name is required for KDP publishing.',
      detailAr: 'اسم المؤلف مطلوب للنشر على KDP.',
    };
  }
  return {
    code: 'AUTHOR_OK',
    category: 'metadata',
    labelEn: 'Author Name',
    labelAr: 'اسم المؤلف',
    severity: 'pass',
    detailEn: 'Author name provided.',
    detailAr: 'اسم المؤلف موجود.',
  };
}

export function runKdpComplianceValidation(
  metadata: KdpMetadata,
  totalWordCount: number
): KdpComplianceResult {
  const trimSize = metadata.trimSize || '6x9';
  const pageCountCheck = checkPageCount(totalWordCount, trimSize);
  const estimatedPages = parseInt(
    pageCountCheck.detailEn.match(/Estimated (\d+)/)?.[1] ?? '0',
    10
  ) || 1;

  const checks: ComplianceCheck[] = [
    checkTitle(metadata.title),
    checkAuthor(metadata.authorName),
    checkDescription(metadata.description),
    checkKeywords(metadata.keywords),
    checkCategories(metadata.categories),
    checkIsbn(metadata.isbn),
    pageCountCheck,
    checkTrimSize(trimSize),
    checkBlankPages(estimatedPages),
  ];

  const errorCount = checks.filter((c) => c.severity === 'error').length;
  const warningCount = checks.filter((c) => c.severity === 'warning').length;
  const passCount = checks.filter((c) => c.severity === 'pass').length;
  const kdpReady = errorCount === 0 && warningCount === 0;

  return { checks, kdpReady, errorCount, warningCount, passCount };
}
