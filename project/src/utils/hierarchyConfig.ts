import type { ProjectType, HierarchyLevel, LiteraryTypeConfig } from '../types';
import { PROJECT_TYPE_CONFIGS } from './projectTypeConfig';

type LevelKey = 'containerLabelEn' | 'containerLabelAr' | 'containerLabelPluralEn' | 'containerLabelPluralAr' | 'unitLabelEn' | 'unitLabelAr' | 'unitLabelPluralEn' | 'unitLabelPluralAr' | 'containerIcon' | 'unitIcon' | 'addContainerLabelEn' | 'addContainerLabelAr' | 'addUnitLabelEn' | 'addUnitLabelAr';

function getLevelsFromConfig(projectType: ProjectType): HierarchyLevel[] {
  const config = PROJECT_TYPE_CONFIGS[projectType];
  if (!config) return [];

  const level1: HierarchyLevel = {
    level: 1,
    singular: config.containerLabelEn,
    plural: config.containerLabelPluralEn,
    singularAr: config.containerLabelAr,
    pluralAr: config.containerLabelPluralAr,
    icon: config.icon,
  };

  if (config.hasLevel2) {
    const level2: HierarchyLevel = {
      level: 2,
      singular: config.unitLabelEn,
      plural: config.unitLabelPluralEn,
      singularAr: config.unitLabelAr,
      pluralAr: config.unitLabelPluralAr,
    icon: config.icon,
    };
    return [level1, level2];
  }

  return [level1];
}

function getLevelsFromDB(dbConfig: LiteraryTypeConfig): HierarchyLevel[] {
  const levels: HierarchyLevel[] = [];

  if (dbConfig.levels && dbConfig.levels.length > 0) {
    return dbConfig.levels;
  }

  levels.push({
    level: 1,
    singular: (dbConfig as any).level_1_singular_en ?? 'Chapter',
    plural: (dbConfig as any).level_1_plural_en ?? 'Chapters',
    singularAr: (dbConfig as any).level_1_singular_ar ?? 'فصل',
    pluralAr: (dbConfig as any).level_1_plural_ar ?? 'الفصول',
    icon: (dbConfig as any).level_1_icon ?? '📄',
  });

  if (dbConfig.hasLevel2 && (dbConfig as any).level_2_singular_en) {
    levels.push({
      level: 2,
      singular: (dbConfig as any).level_2_singular_en,
      plural: (dbConfig as any).level_2_plural_en,
      singularAr: (dbConfig as any).level_2_singular_ar,
      pluralAr: (dbConfig as any).level_2_plural_ar,
    icon: (dbConfig as any).level_2_icon ?? '🎬',
    });
  }

  return levels;
}

export function getHierarchyLevels(projectType: ProjectType): HierarchyLevel[] {
  return getLevelsFromConfig(projectType);
}

export function getHierarchyLevelsFromDB(dbConfig: LiteraryTypeConfig): HierarchyLevel[] {
  return getLevelsFromDB(dbConfig);
}

export function getMaxLevel(projectType: ProjectType): number {
  const config = PROJECT_TYPE_CONFIGS[projectType];
  if (!config) return 1;
  return config.hasLevel2 ? 2 : 1;
}

export function getLevelLabel(
  projectType: ProjectType,
  level: number,
  singular: boolean = true,
  lang: 'en' | 'ar' = 'en'
): string {
  const levels = getHierarchyLevels(projectType);
  const lvl = levels.find(l => l.level === level);
  if (!lvl) return '';

  if (lang === 'ar') {
    return singular ? lvl.singularAr : lvl.pluralAr;
  }
  return singular ? lvl.singular : lvl.plural;
}

export function getAddLabel(
  projectType: ProjectType,
  level: number,
  lang: 'en' | 'ar' = 'en'
): string {
  const config = PROJECT_TYPE_CONFIGS[projectType];
  if (!config) return '';

  if (level === 1) {
    return lang === 'ar' ? config.addContainerLabelAr : config.addContainerLabelEn;
  }
  if (level === 2) {
    return lang === 'ar' ? config.addUnitLabelAr : config.addUnitLabelEn;
  }
  return '';
}

export function buildLiteraryTypeConfigFromDB(raw: any): LiteraryTypeConfig {
  return {
    id: raw.id,
    projectType: raw.project_type as ProjectType,
    levels: getLevelsFromDB(raw),
    hasLevel2: raw.has_level_2 ?? raw.hasLevel2 ?? true,
    hasScriptFields: raw.has_script_fields ?? raw.hasScriptFields ?? false,
    hasSoundFields: raw.has_sound_fields ?? raw.hasSoundFields ?? false,
    hasChildrenFields: raw.has_children_fields ?? raw.hasChildrenFields ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
  };
}

export function getLiteraryTypeConfigFromProjectType(projectType: ProjectType): LiteraryTypeConfig {
  const config = PROJECT_TYPE_CONFIGS[projectType];
  if (!config) {
    return getLiteraryTypeConfigFromProjectType('novel');
  }

  return {
    id: '',
    projectType,
    levels: getLevelsFromConfig(projectType),
    hasLevel2: config.hasLevel2,
    hasScriptFields: config.hasScriptFields,
    hasSoundFields: config.hasSoundFields,
    hasChildrenFields: config.hasChildrenFields,
    createdAt: '',
    updatedAt: '',
  };
}

export type { LevelKey };