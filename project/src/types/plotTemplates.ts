export type PlotTemplateCategory =
  | 'formal'
  | 'thematic'
  | 'conflict'
  | 'modern'
  | 'hybrid';

export interface PlotStage {
  key: string;
  label: string;
  guidance: string;
  default_tension: number;
  default_pace: number;
  is_climax_stage: boolean;
}

export interface PlotTemplate {
  id: string;
  name: string;
  category: PlotTemplateCategory;
  description: string;
  stages: PlotStage[];
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlotTemplateListItem {
  id: string;
  name: string;
  category: PlotTemplateCategory;
  description: string;
  is_premium: boolean;
  stage_count?: number;
  climax_count?: number;
}
