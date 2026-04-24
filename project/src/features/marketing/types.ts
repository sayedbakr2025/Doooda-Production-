export interface PublishingEntity {
  id: string;
  name: string;
  logo_url: string;
  description: string;
  country: string;
  country_en?: string;
  countries?: string[];
  entity_type: string;
  accepts_submissions: boolean;
  submission_email: string;
  submission_link: string;
  publication_type: string;
  project_types_supported: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  categories?: PublishingCategory[];
}

export interface PublishingCategory {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
}

export interface PublisherFilters {
  entityType?: string;
  country?: string;
  countries?: string[];
  projectType?: string;
  categoryIds?: string[];
  publicationType?: 'print' | 'digital' | 'print_digital' | '';
  acceptsSubmissionsOnly?: boolean;
}

export interface PublishersPage {
  entities: PublishingEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExportSettings {
  showChapterTitles: boolean;
  showSceneTitles: boolean;
  chapterNewPage: boolean;
  sceneNewPage: boolean;
  blankPageAfterChapter: boolean;
  includeCoverPage: boolean;
}

export type ExportFormat = 'word' | 'pdf' | 'kindle' | 'print69' | 'screenplay' | 'kdp';

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  showChapterTitles: true,
  showSceneTitles: true,
  chapterNewPage: true,
  sceneNewPage: false,
  blankPageAfterChapter: false,
  includeCoverPage: true,
};

export type Publisher = PublishingEntity;
