import { supabase } from '../lib/supabaseClient';
import type {
  PlotTemplate,
  PlotTemplateCategory,
  PlotStage,
} from '../types/plotTemplates';

export async function fetchAllTemplates(): Promise<PlotTemplate[]> {
  const { data, error } = await supabase
    .from('plot_templates')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching plot templates:', error);
    throw error;
  }

  return data || [];
}

export async function fetchTemplatesByCategory(
  category: PlotTemplateCategory
): Promise<PlotTemplate[]> {
  const { data, error } = await supabase
    .from('plot_templates')
    .select('*')
    .eq('category', category)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching templates by category:', error);
    throw error;
  }

  return data || [];
}

export async function fetchFreeTemplates(): Promise<PlotTemplate[]> {
  const { data, error } = await supabase
    .from('plot_templates')
    .select('*')
    .eq('is_premium', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching free templates:', error);
    throw error;
  }

  return data || [];
}

export async function fetchTemplateById(
  templateId: string
): Promise<PlotTemplate | null> {
  const { data, error } = await supabase
    .from('plot_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template by id:', error);
    throw error;
  }

  return data;
}

export function getCategoryLabel(
  category: PlotTemplateCategory,
  locale: 'ar' | 'en' = 'en'
): string {
  const labels: Record<PlotTemplateCategory, { ar: string; en: string }> = {
    formal: { ar: 'البنية الكلاسيكية', en: 'Formal Structure' },
    thematic: { ar: 'البنية الموضوعية', en: 'Thematic Structure' },
    conflict: { ar: 'البنية الصراعية', en: 'Conflict Structure' },
    modern: { ar: 'البنية الحديثة', en: 'Modern Structure' },
    hybrid: { ar: 'البنية المختلطة', en: 'Hybrid Structure' },
  };

  return labels[category][locale];
}

export function getStageCount(template: PlotTemplate): number {
  return template.stages.length;
}

export function getClimaxCount(template: PlotTemplate): number {
  return template.stages.filter((stage) => stage.is_climax_stage).length;
}

export function getTensionLabel(
  level: number,
  locale: 'ar' | 'en' = 'en'
): string {
  const labels: Record<number, { ar: string; en: string }> = {
    1: { ar: 'منخفض', en: 'Low' },
    2: { ar: 'متوسط', en: 'Medium' },
    3: { ar: 'عالي', en: 'High' },
  };

  return labels[level]?.[locale] || '';
}

export function getPaceLabel(
  level: number,
  locale: 'ar' | 'en' = 'en'
): string {
  const labels: Record<number, { ar: string; en: string }> = {
    1: { ar: 'بطيء', en: 'Slow' },
    2: { ar: 'متوسط', en: 'Medium' },
    3: { ar: 'سريع', en: 'Fast' },
  };

  return labels[level]?.[locale] || '';
}

export async function applyTemplateToProject(
  plotProjectId: string,
  templateId: string
): Promise<void> {
  const template = await fetchTemplateById(templateId);

  if (!template) {
    throw new Error('Template not found');
  }

  const stages = template.stages as PlotStage[];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    const cleanedTitle = stage.label
      .replace(/^المرحلة\s+(الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة):\s*/i, '')
      .replace(/\s*\/\s*Act\s+\d+:\s*/i, ' / ')
      .trim();

    const { error } = await supabase.from('plot_chapters').insert({
      plot_project_id: plotProjectId,
      order_index: i + 1,
      title: cleanedTitle,
      summary: stage.guidance,
      tension_level: stage.default_tension,
      pace_level: stage.default_pace,
      has_climax: stage.is_climax_stage,
      system_notes: `Created from template: ${template.name}`,
    });

    if (error) {
      console.error('Error creating plot chapter:', error);
      throw error;
    }
  }
}

export function validateStage(stage: any): boolean {
  return (
    typeof stage.key === 'string' &&
    stage.key.length > 0 &&
    typeof stage.label === 'string' &&
    stage.label.length > 0 &&
    typeof stage.guidance === 'string' &&
    stage.guidance.length > 0 &&
    typeof stage.default_tension === 'number' &&
    stage.default_tension >= 1 &&
    stage.default_tension <= 3 &&
    typeof stage.default_pace === 'number' &&
    stage.default_pace >= 1 &&
    stage.default_pace <= 3 &&
    typeof stage.is_climax_stage === 'boolean'
  );
}

export function validateTemplate(template: any): boolean {
  if (
    !template ||
    typeof template.name !== 'string' ||
    template.name.length === 0 ||
    typeof template.description !== 'string' ||
    template.description.length === 0 ||
    !['formal', 'thematic', 'conflict', 'modern', 'hybrid'].includes(
      template.category
    ) ||
    !Array.isArray(template.stages) ||
    template.stages.length === 0
  ) {
    return false;
  }

  return template.stages.every(validateStage);
}
