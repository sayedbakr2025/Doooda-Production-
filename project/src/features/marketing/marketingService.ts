import { supabase } from '../../lib/supabaseClient';
import type { PublishingEntity, PublisherFilters, PublishersPage, PublishingCategory } from './types';

export const PAGE_SIZE = 20;

export function parseCountries(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return [trimmed].filter(Boolean);
}

export function serializeCountries(countries: string[]): string {
  if (countries.length === 0) return '';
  if (countries.length === 1) return countries[0];
  return JSON.stringify(countries);
}

export async function getPublishingCategories(): Promise<PublishingCategory[]> {
  const { data, error } = await supabase
    .from('publishing_categories')
    .select('id, name, name_en, slug')
    .order('name');
  if (error) throw error;
  return (data ?? []) as PublishingCategory[];
}

export async function getPublishingCountries(entityType?: string): Promise<string[]> {
  let query = supabase
    .from('publishing_entities')
    .select('country')
    .eq('is_active', true)
    .not('country', 'is', null);
  if (entityType) {
    query = query.eq('entity_type', entityType);
  }
  const { data, error } = await query;
  if (error) throw error;
  const all: string[] = [];
  (data ?? []).forEach((r: { country: string }) => {
    parseCountries(r.country).forEach((c) => all.push(c));
  });
  return Array.from(new Set(all)).sort();
}

export async function searchPublishers(
  filters: PublisherFilters,
  page: number
): Promise<PublishersPage> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('publishing_entities')
    .select(
      `id, name, logo_url, description, country, country_en, entity_type,
       accepts_submissions, submission_email, submission_link, publication_type,
       project_types_supported, is_active, sort_order, created_at, updated_at,
       publishing_entity_categories!left(category_id, publishing_categories!left(id, name, name_en, slug))`,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .eq('entity_type', filters.entityType || 'publisher');

  if (filters.projectType) {
    query = query.contains('project_types_supported', [filters.projectType]);
  }
  if (filters.publicationType) {
    query = query.eq('publication_type', filters.publicationType);
  }
  if (filters.acceptsSubmissionsOnly) {
    query = query.eq('accepts_submissions', true);
  }

  query = query.order('sort_order', { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  let entities: PublishingEntity[] = (data ?? []).map((row: Record<string, unknown>) => {
    const cats = ((row.publishing_entity_categories as Array<Record<string, unknown>> | null) ?? [])
      .map((pivot) => {
        const cat = pivot.publishing_categories as Record<string, unknown> | null;
        return cat ? { id: cat.id as string, name: cat.name as string, name_en: cat.name_en as string | undefined, slug: cat.slug as string } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string; slug: string }>;

    const { publishing_entity_categories: _ignored, ...rest } = row;
    const countries = parseCountries(rest.country as string);
    return { ...rest, categories: cats, countries } as PublishingEntity;
  });

  const activeCountries = (filters.countries ?? []).filter(Boolean);
  if (activeCountries.length > 0) {
    entities = entities.filter((e) =>
      activeCountries.some((fc) => (e.countries ?? []).includes(fc))
    );
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    entities = entities.filter((e) =>
      filters.categoryIds!.some((cid) => (e.categories ?? []).some((c) => c.id === cid))
    );
  }

  return {
    entities,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getUserPlan(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.plan ?? 'free';
}

export async function getUserTokenBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('tokens_balance')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.tokens_balance ?? 0;
}

export async function deductTokens(userId: string, amount: number, reason: string): Promise<void> {
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('tokens_balance')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const current = userData?.tokens_balance ?? 0;
  if (current < amount) {
    throw new Error('insufficient_tokens');
  }

  const { error } = await supabase
    .from('users')
    .update({ tokens_balance: current - amount })
    .eq('id', userId);

  if (error) throw error;

  await supabase.from('token_usage').insert({
    user_id: userId,
    tokens_used: amount,
    reason,
  });
}

export function estimateTranslationTokens(wordCount: number): number {
  return Math.ceil(wordCount * 2.5);
}
