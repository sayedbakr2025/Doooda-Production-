import type { ProjectType } from '../types';

export type FontFamily =
  | 'Amiri'
  | 'Courier New'
  | 'Georgia'
  | 'Garamond'
  | 'Times New Roman'
  | 'Arial'
  | 'Tajawal';

export type LineSpacing = 'single' | '1.5' | 'double';

export type MarginSize = 'narrow' | 'normal' | 'wide';

export interface PrintReadyOptions {
  enabled: boolean;
  authorName: string;
}

export const PRINT_READY_DEFAULTS: PrintReadyOptions = {
  enabled: false,
  authorName: '',
};

export interface KindleOptions {
  enabled: boolean;
  authorName: string;
  description: string;
}

export const KINDLE_DEFAULTS: KindleOptions = {
  enabled: false,
  authorName: '',
  description: '',
};

export interface ScreenplayOptions {
  enabled: boolean;
  showSceneNumbers: boolean;
  authorName: string;
  contactInfo: string;
}

export const SCREENPLAY_DEFAULTS: ScreenplayOptions = {
  enabled: false,
  showSceneNumbers: true,
  authorName: '',
  contactInfo: '',
};

export type LayoutType =
  | 'narrative'
  | 'screenplay'
  | 'theatre'
  | 'radio'
  | 'children';

export interface PageBehavior {
  chapterBreak: boolean;
  sceneBreak: boolean;
  sceneNumbering: boolean;
  tocEnabled: boolean;
  illustrationPlaceholders: boolean;
  wideSpread: boolean;
}

export interface ExportPreset {
  projectType: ProjectType;
  labelAr: string;
  labelEn: string;
  font: FontFamily;
  fontSize: number;
  lineSpacing: LineSpacing;
  margins: MarginSize;
  layoutType: LayoutType;
  pageBehavior: PageBehavior;
  containerLabel: { ar: string; en: string };
  noteAr: string;
  noteEn: string;
}

const DEFAULT_PAGE_BEHAVIOR: PageBehavior = {
  chapterBreak: true,
  sceneBreak: false,
  sceneNumbering: false,
  tocEnabled: false,
  illustrationPlaceholders: false,
  wideSpread: false,
};

const PRESETS: Record<ProjectType, ExportPreset> = {
  novel: {
    projectType: 'novel',
    labelAr: 'رواية',
    labelEn: 'Novel',
    font: 'Amiri',
    fontSize: 16,
    lineSpacing: '1.5',
    margins: 'normal',
    layoutType: 'narrative',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      tocEnabled: true,
    },
    containerLabel: { ar: 'الفصل', en: 'Chapter' },
    noteAr: 'الخط الكلاسيكي للروايات – فصل جديد في كل صفحة',
    noteEn: 'Classic novel format – each chapter starts on a new page',
  },

  short_story: {
    projectType: 'short_story',
    labelAr: 'قصة قصيرة',
    labelEn: 'Short Story',
    font: 'Amiri',
    fontSize: 16,
    lineSpacing: '1.5',
    margins: 'normal',
    layoutType: 'narrative',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: false,
      tocEnabled: false,
    },
    containerLabel: { ar: 'الفصل', en: 'Chapter' },
    noteAr: 'تدفق سردي متواصل بدون فواصل صفحات',
    noteEn: 'Continuous narrative flow without page breaks',
  },

  long_story: {
    projectType: 'long_story',
    labelAr: 'قصة طويلة',
    labelEn: 'Long Story',
    font: 'Amiri',
    fontSize: 16,
    lineSpacing: '1.5',
    margins: 'normal',
    layoutType: 'narrative',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      tocEnabled: false,
    },
    containerLabel: { ar: 'الفصل', en: 'Chapter' },
    noteAr: 'سرد موسّع مع فواصل فصول',
    noteEn: 'Extended narrative with chapter breaks',
  },

  book: {
    projectType: 'book',
    labelAr: 'كتاب',
    labelEn: 'Book',
    font: 'Amiri',
    fontSize: 16,
    lineSpacing: '1.5',
    margins: 'normal',
    layoutType: 'narrative',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      tocEnabled: true,
    },
    containerLabel: { ar: 'الفصل', en: 'Chapter' },
    noteAr: 'تنسيق كتاب أكاديمي مع فهرس المحتويات',
    noteEn: 'Academic book format with table of contents',
  },

  film_script: {
    projectType: 'film_script',
    labelAr: 'سيناريو فيلم',
    labelEn: 'Film Script',
    font: 'Courier New',
    fontSize: 12,
    lineSpacing: 'single',
    margins: 'wide',
    layoutType: 'screenplay',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: false,
      sceneBreak: false,
      sceneNumbering: true,
    },
    containerLabel: { ar: 'الفصل', en: 'Act' },
    noteAr: 'المعيار الاحترافي للسيناريو – ترويسات مشاهد INT./EXT.',
    noteEn: 'Industry-standard screenplay format – INT./EXT. scene headings',
  },

  tv_series: {
    projectType: 'tv_series',
    labelAr: 'مسلسل تلفزيوني',
    labelEn: 'TV Series',
    font: 'Courier New',
    fontSize: 12,
    lineSpacing: 'single',
    margins: 'wide',
    layoutType: 'screenplay',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      sceneBreak: false,
      sceneNumbering: true,
    },
    containerLabel: { ar: 'الحلقة', en: 'Episode' },
    noteAr: 'كل حلقة تبدأ في صفحة جديدة مع ترقيم مشاهد',
    noteEn: 'Each episode starts on a new page with scene numbering',
  },

  theatre_play: {
    projectType: 'theatre_play',
    labelAr: 'مسرحية',
    labelEn: 'Theatre Play',
    font: 'Georgia',
    fontSize: 12,
    lineSpacing: '1.5',
    margins: 'wide',
    layoutType: 'theatre',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      sceneBreak: false,
      sceneNumbering: false,
    },
    containerLabel: { ar: 'الفصل المسرحي', en: 'Act' },
    noteAr: 'أسماء الشخصيات بارزة – الإرشادات المسرحية بخط مائل',
    noteEn: 'Character names bold – stage directions in italics',
  },

  radio_series: {
    projectType: 'radio_series',
    labelAr: 'مسلسل إذاعي',
    labelEn: 'Radio Series',
    font: 'Courier New',
    fontSize: 12,
    lineSpacing: '1.5',
    margins: 'normal',
    layoutType: 'radio',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      sceneBreak: false,
      sceneNumbering: true,
    },
    containerLabel: { ar: 'الحلقة', en: 'Episode' },
    noteAr: 'علامات المؤثرات الصوتية [SFX:] والموسيقى [MUSIC:] مضمّنة',
    noteEn: 'Sound effect markers [SFX:] and [MUSIC:] included',
  },

  children_story: {
    projectType: 'children_story',
    labelAr: 'قصة أطفال',
    labelEn: "Children's Story",
    font: 'Tajawal',
    fontSize: 18,
    lineSpacing: 'double',
    margins: 'wide',
    layoutType: 'children',
    pageBehavior: {
      ...DEFAULT_PAGE_BEHAVIOR,
      chapterBreak: true,
      wideSpread: true,
      illustrationPlaceholders: true,
      tocEnabled: false,
    },
    containerLabel: { ar: 'الفصل', en: 'Chapter' },
    noteAr: 'خط كبير – هوامش واسعة – مساحات للرسوم',
    noteEn: 'Large font – wide margins – illustration placeholders',
  },
};

export function getPresetByProjectType(projectType: ProjectType): ExportPreset {
  return PRESETS[projectType] ?? PRESETS['novel'];
}

export function getAllPresets(): ExportPreset[] {
  return Object.values(PRESETS);
}

export const FONT_OPTIONS: { value: FontFamily; labelAr: string; labelEn: string }[] = [
  { value: 'Amiri', labelAr: 'أميري (عربي)', labelEn: 'Amiri (Arabic)' },
  { value: 'Tajawal', labelAr: 'تجوال (عربي)', labelEn: 'Tajawal (Arabic)' },
  { value: 'Garamond', labelAr: 'جارامند (أدبي)', labelEn: 'Garamond (Literary)' },
  { value: 'Times New Roman', labelAr: 'تايمز نيو رومان', labelEn: 'Times New Roman' },
  { value: 'Courier New', labelAr: 'كورييه (سيناريو)', labelEn: 'Courier New (Screenplay)' },
  { value: 'Georgia', labelAr: 'جورجيا', labelEn: 'Georgia' },
  { value: 'Arial', labelAr: 'أريال', labelEn: 'Arial' },
];

export const SPACING_OPTIONS: { value: LineSpacing; labelAr: string; labelEn: string }[] = [
  { value: 'single', labelAr: 'مفرد', labelEn: 'Single' },
  { value: '1.5', labelAr: '١.٥', labelEn: '1.5' },
  { value: 'double', labelAr: 'مزدوج', labelEn: 'Double' },
];

export const MARGIN_OPTIONS: { value: MarginSize; labelAr: string; labelEn: string }[] = [
  { value: 'narrow', labelAr: 'ضيق', labelEn: 'Narrow' },
  { value: 'normal', labelAr: 'عادي', labelEn: 'Normal' },
  { value: 'wide', labelAr: 'واسع', labelEn: 'Wide' },
];

export const MARGIN_VALUES: Record<MarginSize, string> = {
  narrow: '15mm',
  normal: '25mm',
  wide: '35mm',
};

export const LINE_SPACING_VALUES: Record<LineSpacing, number> = {
  single: 1.0,
  '1.5': 1.5,
  double: 2.0,
};
