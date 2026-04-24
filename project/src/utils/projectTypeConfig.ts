import type { ProjectType } from '../types';

export interface ProjectTypeConfig {
  type: ProjectType;
  labelAr: string;
  labelEn: string;
  icon: string;
  containerLabelAr: string;
  containerLabelEn: string;
  containerLabelPluralAr: string;
  containerLabelPluralEn: string;
  addContainerLabelAr: string;
  addContainerLabelEn: string;
  unitLabelAr: string;
  unitLabelEn: string;
  unitLabelPluralAr: string;
  unitLabelPluralEn: string;
  addUnitLabelAr: string;
  addUnitLabelEn: string;
  hasScriptFields: boolean;
  hasSoundFields: boolean;
  hasChildrenFields: boolean;
  hasReferences: boolean;
  hasLevel2: boolean;
  structureNote?: { ar: string; en: string };
}

export const PROJECT_TYPE_CONFIGS: Record<ProjectType, ProjectTypeConfig> = {
  novel: {
    type: 'novel',
    labelAr: 'رواية',
    labelEn: 'Novel',
    icon: '📖',
    containerLabelAr: 'فصل',
    containerLabelEn: 'Chapter',
    containerLabelPluralAr: 'الفصول',
    containerLabelPluralEn: 'Chapters',
    addContainerLabelAr: 'إضافة فصل',
    addContainerLabelEn: 'Add Chapter',
    unitLabelAr: 'مشهد',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: false,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: true,
  },
  short_story: {
    type: 'short_story',
    labelAr: 'قصة قصيرة',
    labelEn: 'Short Story',
    icon: '📝',
    containerLabelAr: 'فصل',
    containerLabelEn: 'Chapter',
    containerLabelPluralAr: 'الفصول',
    containerLabelPluralEn: 'Chapters',
    addContainerLabelAr: 'إضافة فصل',
    addContainerLabelEn: 'Add Chapter',
    unitLabelAr: 'مشهد',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: false,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: true,
  },
  long_story: {
    type: 'long_story',
    labelAr: 'قصة طويلة',
    labelEn: 'Long Story',
    icon: '📃',
    containerLabelAr: 'فصل',
    containerLabelEn: 'Chapter',
    containerLabelPluralAr: 'الفصول',
    containerLabelPluralEn: 'Chapters',
    addContainerLabelAr: 'إضافة فصل',
    addContainerLabelEn: 'Add Chapter',
    unitLabelAr: 'مشهد',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: false,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: true,
  },
  book: {
    type: 'book',
    labelAr: 'كتاب',
    labelEn: 'Book',
    icon: '📚',
    containerLabelAr: 'فصل',
    containerLabelEn: 'Chapter',
    containerLabelPluralAr: 'الفصول',
    containerLabelPluralEn: 'Chapters',
    addContainerLabelAr: 'إضافة فصل',
    addContainerLabelEn: 'Add Chapter',
    unitLabelAr: 'عنوان فرعي',
    unitLabelEn: 'Subheading',
    unitLabelPluralAr: 'العناوين الفرعية',
    unitLabelPluralEn: 'Subheadings',
    addUnitLabelAr: 'إضافة عنوان فرعي',
    addUnitLabelEn: 'Add Subheading',
    hasScriptFields: false,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: true,
    hasLevel2: true,
  },
  film_script: {
    type: 'film_script',
    labelAr: 'سيناريو فيلم',
    labelEn: 'Film Script',
    icon: '🎬',
    containerLabelAr: 'مشهد',
    containerLabelEn: 'Scene',
    containerLabelPluralAr: 'المشاهد',
    containerLabelPluralEn: 'Scenes',
    addContainerLabelAr: 'إضافة مشهد',
    addContainerLabelEn: 'Add Scene',
    unitLabelAr: 'مشهد',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: true,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: false,
    structureNote: {
      ar: 'يتكون السيناريو من مشاهد متتالية بترويسة احترافية (بدون طبقة فصول)',
      en: 'Film script uses flat scene structure (no chapters layer)',
    },
  },
  tv_series: {
    type: 'tv_series',
    labelAr: 'مسلسل تلفزيوني',
    labelEn: 'TV Series',
    icon: '📺',
    containerLabelAr: 'حلقة',
    containerLabelEn: 'Episode',
    containerLabelPluralAr: 'الحلقات',
    containerLabelPluralEn: 'Episodes',
    addContainerLabelAr: 'إضافة حلقة',
    addContainerLabelEn: 'Add Episode',
    unitLabelAr: 'مشهد',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: true,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: true,
    structureNote: {
      ar: 'يتكون المسلسل من حلقات ومشاهد مع تتبع قوس الحلقة',
      en: 'Series contains Episodes and Scenes with episode arc tracking',
    },
  },
  theatre_play: {
    type: 'theatre_play',
    labelAr: 'مسرحية',
    labelEn: 'Theatre Play',
    icon: '🎭',
    containerLabelAr: 'فصل مسرحي',
    containerLabelEn: 'Act',
    containerLabelPluralAr: 'الفصول المسرحية',
    containerLabelPluralEn: 'Acts',
    addContainerLabelAr: 'إضافة فصل مسرحي',
    addContainerLabelEn: 'Add Act',
    unitLabelAr: 'مشهد مسرحي',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد المسرحية',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد مسرحي',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: false,
    hasSoundFields: false,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: true,
    structureNote: {
      ar: 'تتكون المسرحية من فصول مسرحية ومشاهد بدون أدوات كاميرا',
      en: 'Play contains Acts and Scenes without camera tools',
    },
  },
  radio_series: {
    type: 'radio_series',
    labelAr: 'مسلسل إذاعي',
    labelEn: 'Radio Series',
    icon: '📻',
    containerLabelAr: 'حلقة',
    containerLabelEn: 'Episode',
    containerLabelPluralAr: 'الحلقات',
    containerLabelPluralEn: 'Episodes',
    addContainerLabelAr: 'إضافة حلقة',
    addContainerLabelEn: 'Add Episode',
    unitLabelAr: 'مشهد إذاعي',
    unitLabelEn: 'Scene',
    unitLabelPluralAr: 'المشاهد الإذاعية',
    unitLabelPluralEn: 'Scenes',
    addUnitLabelAr: 'إضافة مشهد إذاعي',
    addUnitLabelEn: 'Add Scene',
    hasScriptFields: false,
    hasSoundFields: true,
    hasChildrenFields: false,
    hasReferences: false,
    hasLevel2: true,
    structureNote: {
      ar: 'يتكون المسلسل الإذاعي من حلقات ومشاهد مع مؤثرات صوتية',
      en: 'Radio series contains Episodes and Scenes with sound cues',
    },
  },
  children_story: {
    type: 'children_story',
    labelAr: 'قصة أطفال',
    labelEn: "Children's Story",
    icon: '🧒',
    containerLabelAr: 'صفحة',
    containerLabelEn: 'Page',
    containerLabelPluralAr: 'الصفحات',
    containerLabelPluralEn: 'Pages',
    addContainerLabelAr: 'إضافة صفحة',
    addContainerLabelEn: 'Add Page',
    unitLabelAr: 'صفحة',
    unitLabelEn: 'Page',
    unitLabelPluralAr: 'الصفحات',
    unitLabelPluralEn: 'Pages',
    addUnitLabelAr: 'إضافة صفحة',
    addUnitLabelEn: 'Add Page',
    hasScriptFields: false,
    hasSoundFields: false,
    hasChildrenFields: true,
    hasReferences: false,
    hasLevel2: false,
    structureNote: {
      ar: 'تتكون قصة الأطفال من صفحات مستقلة بتخطيط مزدوج',
      en: "Children's story uses standalone pages with dual-page spread layout",
    },
  },
};

export function getProjectTypeConfig(projectType: ProjectType): ProjectTypeConfig {
  return PROJECT_TYPE_CONFIGS[projectType] ?? PROJECT_TYPE_CONFIGS['novel'];
}

export function isScriptType(projectType: ProjectType): boolean {
  return projectType === 'film_script' || projectType === 'tv_series';
}

export function isSeriesType(projectType: ProjectType): boolean {
  return projectType === 'tv_series' || projectType === 'radio_series';
}

export function isTheatreType(projectType: ProjectType): boolean {
  return projectType === 'theatre_play';
}

export function isRadioType(projectType: ProjectType): boolean {
  return projectType === 'radio_series';
}

export function isChildrenType(projectType: ProjectType): boolean {
  return projectType === 'children_story';
}

export function formatSceneHeader(scene: {
  scene_type?: string | null;
  location?: string | null;
  time_of_day?: string | null;
}): string {
  if (!scene.scene_type && !scene.location) return '';
  const parts = [
    scene.scene_type || 'INT',
    scene.location ? `. ${scene.location.toUpperCase()}` : '',
    scene.time_of_day ? ` – ${scene.time_of_day}` : '',
  ];
  return parts.join('');
}

export const ALL_PROJECT_TYPES: ProjectType[] = [
  'novel',
  'short_story',
  'long_story',
  'book',
  'film_script',
  'tv_series',
  'theatre_play',
  'radio_series',
  'children_story',
];
