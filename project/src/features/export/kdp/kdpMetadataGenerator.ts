import type { ProjectType } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';

export interface KdpContributor {
  name: string;
  role: string;
}

export interface KdpMetadata {
  title: string;
  subtitle: string;
  authorName: string;
  contributors: KdpContributor[];
  seriesName: string;
  editionNumber: string;
  language: string;
  description: string;
  keywords: string[];
  categories: string[];
  isbn: string;
  publicationDate: string;
  trimSize: string;
  bleedEnabled: boolean;
  interiorType: 'black_white' | 'premium_color';
}

export const EMPTY_METADATA: KdpMetadata = {
  title: '',
  subtitle: '',
  authorName: '',
  contributors: [],
  seriesName: '',
  editionNumber: '',
  language: 'ar',
  description: '',
  keywords: [],
  categories: [],
  isbn: '',
  publicationDate: '',
  trimSize: '',
  bleedEnabled: false,
  interiorType: 'black_white',
};

export interface KdpMetadataValidationIssue {
  field: string;
  messageEn: string;
  messageAr: string;
  severity: 'error' | 'warning';
}

export function validateKdpMetadata(m: KdpMetadata): KdpMetadataValidationIssue[] {
  const issues: KdpMetadataValidationIssue[] = [];

  if (!m.title.trim()) {
    issues.push({ field: 'title', severity: 'error', messageEn: 'Title is required', messageAr: 'العنوان مطلوب' });
  }

  const descWordCount = m.description.trim().split(/\s+/).filter(Boolean).length;
  if (descWordCount < 150) {
    issues.push({
      field: 'description',
      severity: 'error',
      messageEn: `Description must be at least 150 words (currently ${descWordCount})`,
      messageAr: `الوصف يجب أن يكون 150 كلمة على الأقل (حاليًا ${descWordCount})`,
    });
  }

  if (m.keywords.length < 7) {
    issues.push({
      field: 'keywords',
      severity: 'error',
      messageEn: `7 keywords required (currently ${m.keywords.length})`,
      messageAr: `مطلوب 7 كلمات مفتاحية (حاليًا ${m.keywords.length})`,
    });
  }

  if (m.categories.length < 2) {
    issues.push({
      field: 'categories',
      severity: 'error',
      messageEn: `At least 2 categories required (currently ${m.categories.length})`,
      messageAr: `مطلوب تصنيفان على الأقل (حاليًا ${m.categories.length})`,
    });
  }

  if (!m.trimSize.trim()) {
    issues.push({
      field: 'trimSize',
      severity: 'warning',
      messageEn: 'Trim size is required for print publishing',
      messageAr: 'حجم الطباعة مطلوب للنشر الورقي',
    });
  }

  return issues;
}

const CATEGORY_MAP: Record<ProjectType, { en: string[]; ar: string[] }> = {
  novel: {
    en: ['Fiction > General', 'Fiction > Literary'],
    ar: ['روايات', 'أدب عربي'],
  },
  short_story: {
    en: ['Fiction > Short Stories', 'Fiction > Literary Collections'],
    ar: ['قصص قصيرة', 'مجموعات أدبية'],
  },
  long_story: {
    en: ['Fiction > General', 'Fiction > Literary'],
    ar: ['روايات', 'أدب عربي'],
  },
  book: {
    en: ['Nonfiction > General', 'Self-Help & Personal Development'],
    ar: ['كتب عامة', 'تطوير الذات'],
  },
  film_script: {
    en: ['Arts & Entertainment > Screenwriting', 'Fiction > Media Tie-In'],
    ar: ['فنون > كتابة السيناريو', 'نصوص درامية'],
  },
  tv_series: {
    en: ['Arts & Entertainment > Screenwriting', 'Fiction > Media Tie-In'],
    ar: ['فنون > كتابة السيناريو', 'نصوص تلفزيونية'],
  },
  theatre_play: {
    en: ['Drama > General', 'Arts & Entertainment > Theater'],
    ar: ['مسرحيات', 'فنون مسرحية'],
  },
  radio_series: {
    en: ['Arts & Entertainment > Radio', 'Fiction > General'],
    ar: ['أعمال إذاعية', 'نصوص درامية'],
  },
  children_story: {
    en: ["Children's Books > Fiction", "Children's Books > Animals"],
    ar: ['قصص أطفال', 'أدب الأطفال'],
  },
};

export function getDefaultCategories(
  projectType: ProjectType,
  language: 'ar' | 'en'
): string[] {
  return CATEGORY_MAP[projectType]?.[language] ?? [];
}

export function suggestKeywords(
  title: string,
  projectType: ProjectType,
  language: 'ar' | 'en'
): string[] {
  const typeKeywords: Record<ProjectType, { en: string[]; ar: string[] }> = {
    novel: { en: ['novel', 'fiction', 'story', 'book', 'literature'], ar: ['رواية', 'قصة', 'أدب', 'كتاب', 'روائي'] },
    short_story: { en: ['short story', 'fiction', 'tales', 'anthology'], ar: ['قصة قصيرة', 'حكايات', 'مجموعة قصصية'] },
    long_story: { en: ['story', 'fiction', 'narrative', 'novel'], ar: ['قصة', 'أدب', 'سرد', 'رواية'] },
    book: { en: ['book', 'nonfiction', 'guide', 'knowledge'], ar: ['كتاب', 'معلومات', 'ثقافة', 'تعليم'] },
    film_script: { en: ['screenplay', 'script', 'film', 'cinema', 'movie'], ar: ['سيناريو', 'فيلم', 'سينما', 'نص درامي'] },
    tv_series: { en: ['TV series', 'script', 'drama', 'television'], ar: ['مسلسل', 'سيناريو', 'دراما', 'تلفزيون'] },
    theatre_play: { en: ['play', 'theatre', 'drama', 'stage'], ar: ['مسرحية', 'مسرح', 'دراما', 'عرض مسرحي'] },
    radio_series: { en: ['radio', 'audio drama', 'series'], ar: ['إذاعة', 'مسلسل إذاعي', 'دراما صوتية'] },
    children_story: { en: ["children's book", 'kids', 'story', 'illustrated', 'young readers'], ar: ['قصة أطفال', 'كتاب أطفال', 'حكاية', 'أدب ناشئة'] },
  };

  const base = typeKeywords[projectType]?.[language] ?? [];

  const titleWords = title
    .split(/[\s،,\-\/]+/)
    .filter((w) => w.length > 3)
    .slice(0, 2);

  return [...titleWords, ...base].slice(0, 7);
}

export async function generateAiDescription(
  projectTitle: string,
  projectIdea: string | undefined,
  projectType: ProjectType,
  language: 'ar' | 'en'
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const typeLabel = language === 'ar'
    ? { novel: 'رواية', short_story: 'قصة قصيرة', long_story: 'قصة', book: 'كتاب', film_script: 'سيناريو فيلم', tv_series: 'مسلسل تلفزيوني', theatre_play: 'مسرحية', radio_series: 'مسلسل إذاعي', children_story: 'قصة أطفال' }[projectType]
    : { novel: 'novel', short_story: 'short story', long_story: 'story', book: 'book', film_script: 'film script', tv_series: 'TV series', theatre_play: 'theatre play', radio_series: 'radio series', children_story: "children's book" }[projectType];

  const prompt = language === 'ar'
    ? `اكتب وصفًا تسويقيًا جذابًا لمنصة Amazon KDP لـ${typeLabel} بعنوان "${projectTitle}"${projectIdea ? `، فكرة العمل: ${projectIdea}` : ''}. الوصف يجب أن يكون بين 150-300 كلمة، مقنع، يبرز نقاط الجذب الرئيسية، مناسب لصفحة المنتج على Amazon. أجب فقط بنص الوصف بدون أي مقدمات.`
    : `Write a compelling Amazon KDP marketing description for a ${typeLabel} titled "${projectTitle}"${projectIdea ? `. Premise: ${projectIdea}` : ''}. The description should be 150-300 words, persuasive, highlight key selling points, and be suitable for an Amazon product page. Reply with only the description text, no preamble.`;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ask-doooda`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      language,
      mode: 'idea',
      projectType,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'AI description generation failed');
  }

  const result = await response.json();
  return result.reply || '';
}

export async function loadKdpMetadataFromDb(projectId: string): Promise<KdpMetadata | null> {
  const { data, error } = await supabase
    .from('kdp_metadata')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: data.title ?? '',
    subtitle: data.subtitle ?? '',
    authorName: data.author_name ?? '',
    contributors: (data.contributors as KdpContributor[]) ?? [],
    seriesName: data.series_name ?? '',
    editionNumber: data.edition_number ?? '',
    language: data.language ?? 'ar',
    description: data.description ?? '',
    keywords: (data.keywords as string[]) ?? [],
    categories: (data.categories as string[]) ?? [],
    isbn: data.isbn ?? '',
    publicationDate: data.publication_date ?? '',
    trimSize: data.trim_size ?? '',
    bleedEnabled: data.bleed_enabled ?? false,
    interiorType: (data.interior_type as 'black_white' | 'premium_color') ?? 'black_white',
  };
}

export async function saveKdpMetadataToDb(projectId: string, m: KdpMetadata): Promise<void> {
  const payload = {
    project_id: projectId,
    title: m.title,
    subtitle: m.subtitle,
    author_name: m.authorName,
    contributors: m.contributors,
    series_name: m.seriesName,
    edition_number: m.editionNumber,
    language: m.language,
    description: m.description,
    keywords: m.keywords,
    categories: m.categories,
    isbn: m.isbn,
    publication_date: m.publicationDate || null,
    trim_size: m.trimSize,
    bleed_enabled: m.bleedEnabled,
    interior_type: m.interiorType,
  };

  const { error } = await supabase
    .from('kdp_metadata')
    .upsert(payload, { onConflict: 'project_id' });

  if (error) throw new Error(error.message);
}
