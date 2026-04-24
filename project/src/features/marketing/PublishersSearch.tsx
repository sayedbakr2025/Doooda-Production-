import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../utils/translations';
import {
  searchPublishers,
  getPublishingCategories,
  getPublishingCountries,
  PAGE_SIZE,
} from './marketingService';
import type { PublishingEntity, PublisherFilters, PublishingCategory } from './types';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Mail, ChevronDown, X } from 'lucide-react';

const PROJECT_TYPES = [
  { value: 'novel', ar: 'رواية', en: 'Novel' },
  { value: 'short_stories', ar: 'قصص قصيرة', en: 'Short Stories' },
  { value: 'film_screenplay', ar: 'سيناريو سينمائي', en: 'Film Screenplay' },
  { value: 'theatre', ar: 'مسرح', en: 'Theatre' },
  { value: 'radio_series', ar: 'مسلسل إذاعي', en: 'Radio Series' },
  { value: 'children_book', ar: 'كتاب أطفال', en: "Children's Book" },
];

const PUBLICATION_TYPES = [
  { value: '', ar: 'الكل', en: 'All' },
  { value: 'print', ar: 'طباعة', en: 'Print' },
  { value: 'digital', ar: 'رقمي', en: 'Digital' },
  { value: 'print_digital', ar: 'طباعة ورقمي', en: 'Both' },
];

const ENTITY_TYPES = [
  { value: 'publisher', ar: 'دار نشر', en: 'Publisher' },
  { value: 'production_company', ar: 'شركة إنتاج', en: 'Production Company' },
  { value: 'agency', ar: 'وكالة', en: 'Agency' },
  { value: 'festival', ar: 'مهرجان', en: 'Festival' },
];

const EMPTY_FILTERS: PublisherFilters = {
  entityType: 'publisher',
  country: '',
  countries: [],
  projectType: '',
  categoryIds: [],
  publicationType: '',
  acceptsSubmissionsOnly: false,
};

export default function PublishersSearch() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [entities, setEntities] = useState<PublishingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [filters, setFilters] = useState<PublisherFilters>(EMPTY_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<PublisherFilters>(EMPTY_FILTERS);

  const [countries, setCountries] = useState<string[]>([]);
  const [categories, setCategories] = useState<PublishingCategory[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getPublishingCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getPublishingCountries(filters.entityType)
      .then((c) => setCountries(c))
      .catch(() => {});
  }, [filters.entityType]);

  const load = useCallback(
    (activeFilters: PublisherFilters, activePage: number) => {
      setLoading(true);
      searchPublishers(activeFilters, activePage)
        .then((result) => {
          setEntities(result.entities);
          setTotal(result.total);
        })
        .catch(() => {
          setEntities([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    load(filters, page);
  }, [filters, page, load]);

  function applyFilters() {
    setPage(0);
    setFilters(pendingFilters);
  }

  function resetFilters() {
    setPendingFilters(EMPTY_FILTERS);
    setPage(0);
    setFilters(EMPTY_FILTERS);
  }

  function toggleCategory(id: string) {
    setPendingFilters((prev) => {
      const current = prev.categoryIds ?? [];
      return {
        ...prev,
        categoryIds: current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
      };
    });
  }

  function copyEmail(email: string, id: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters =
    (filters.entityType !== 'publisher' && !!filters.entityType) ||
    (filters.countries ?? []).length > 0 ||
    !!filters.projectType ||
    (filters.categoryIds ?? []).length > 0 ||
    !!filters.publicationType ||
    !!filters.acceptsSubmissionsOnly;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex flex-col gap-5">

      <div className="flex gap-1.5 flex-wrap">
        {ENTITY_TYPES.map((et) => {
          const active = (pendingFilters.entityType ?? 'publisher') === et.value;
          return (
            <button
              key={et.value}
              type="button"
              onClick={() => {
                setPendingFilters((p) => ({ ...p, entityType: et.value, country: '', countries: [] }));
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {isRTL ? et.ar : et.en}
            </button>
          );
        })}
      </div>

      <div
        className="rounded-xl p-4 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'الدول' : 'Countries'}
            </label>
            <MultiCountryPicker
              countries={countries}
              selected={pendingFilters.countries ?? []}
              onChange={(val) => setPendingFilters((p) => ({ ...p, countries: val }))}
              isRTL={isRTL}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'نوع المشروع' : 'Project Type'}
            </label>
            <select
              value={pendingFilters.projectType ?? ''}
              onChange={(e) => setPendingFilters((p) => ({ ...p, projectType: e.target.value }))}
              className="px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="">{isRTL ? 'كل الأنواع' : 'All Types'}</option>
              {PROJECT_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{isRTL ? pt.ar : pt.en}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'التصنيفات' : 'Categories'}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = (pendingFilters.categoryIds ?? []).includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: selected ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {isRTL ? cat.name : (cat.name_en || cat.name)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'نوع الإصدار' : 'Publication Type'}
          </label>
          <div className="flex gap-2 flex-wrap">
            {PUBLICATION_TYPES.map((pt) => {
              const selected = (pendingFilters.publicationType ?? '') === pt.value;
              return (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPendingFilters((p) => ({ ...p, publicationType: pt.value as PublisherFilters['publicationType'] }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: selected ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {isRTL ? pt.ar : pt.en}
                </button>
              );
            })}
          </div>
        </div>

        <label
          className="flex items-center gap-2.5 cursor-pointer w-fit"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          <div
            className="relative w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: pendingFilters.acceptsSubmissionsOnly ? 'var(--color-accent)' : 'transparent',
              border: `2px solid ${pendingFilters.acceptsSubmissionsOnly ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            {pendingFilters.acceptsSubmissionsOnly && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <input
              type="checkbox"
              checked={!!pendingFilters.acceptsSubmissionsOnly}
              onChange={(e) => setPendingFilters((p) => ({ ...p, acceptsSubmissionsOnly: e.target.checked }))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('marketing.publishers.filter.accepts', language)}
          </span>
        </label>

        <div className="flex gap-2 pt-1" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <button
            onClick={applyFilters}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {isRTL ? 'تطبيق الفلاتر' : 'Apply Filters'}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {isRTL ? 'إعادة ضبط' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {isRTL
            ? `${total} نتيجة`
            : `${total} result${total !== 1 ? 's' : ''}`}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div
            className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : entities.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <span className="text-2xl">🔍</span>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('marketing.publishers.noResults', language)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              isRTL={isRTL}
              language={language as Language}
              copiedId={copiedId}
              onCopyEmail={copyEmail}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg transition-opacity disabled:opacity-30"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL
              ? `${page + 1} من ${totalPages}`
              : `${page + 1} / ${totalPages}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg transition-opacity disabled:opacity-30"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}

interface MultiCountryPickerProps {
  countries: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  isRTL: boolean;
}

function MultiCountryPicker({ countries, selected, onChange, isRTL }: MultiCountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = countries.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  function toggle(c: string) {
    onChange(selected.includes(c) ? selected.filter((s) => s !== c) : [...selected, c]);
  }

  const label = selected.length === 0
    ? (isRTL ? 'كل الدول' : 'All Countries')
    : selected.length === 1
      ? selected[0]
      : isRTL ? `${selected.length} دول` : `${selected.length} countries`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm focus:outline-none"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: selected.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {c}
              <button
                type="button"
                onClick={() => toggle(c)}
                className="hover:opacity-70"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '220px', display: 'flex', flexDirection: 'column' }}
        >
          <div className="p-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <input
              autoFocus
              type="text"
              placeholder={isRTL ? 'بحث...' : 'Search...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-lg focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs px-3 py-2 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL ? 'لا توجد نتائج' : 'No results'}
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 text-start"
                  style={{
                    backgroundColor: selected.includes(c) ? 'rgba(var(--color-accent-rgb, 59,130,246),0.1)' : 'transparent',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: selected.includes(c) ? 'var(--color-accent)' : 'transparent',
                      border: `2px solid ${selected.includes(c) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    {selected.includes(c) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {c}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Language = 'ar' | 'en';

interface EntityCardProps {
  entity: PublishingEntity;
  isRTL: boolean;
  language: Language;
  copiedId: string | null;
  onCopyEmail: (email: string, id: string) => void;
}

function EntityCard({ entity, isRTL, language, copiedId, onCopyEmail }: EntityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayName = entity.name;
  const displayCountries = (entity.countries ?? []).length > 0
    ? entity.countries!
    : isRTL ? [entity.country] : [entity.country_en || entity.country];
  const displayCountry = displayCountries.filter(Boolean).join(', ');

  const publicationLabel = {
    print: isRTL ? 'طباعة' : 'Print',
    digital: isRTL ? 'رقمي' : 'Digital',
    print_digital: isRTL ? 'طباعة ورقمي' : 'Print & Digital',
  }[entity.publication_type] ?? entity.publication_type;

  const projectTypeLabel = (value: string) => {
    const found = PROJECT_TYPES.find((p) => p.value === value);
    return found ? (isRTL ? found.ar : found.en) : value;
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            {entity.logo_url ? (
              <img
                src={entity.logo_url}
                alt={displayName}
                className="w-12 h-12 rounded-lg object-cover"
                style={{ border: '1px solid var(--color-border)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {displayName}
              </h4>
              {entity.accepts_submissions && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
                >
                  {isRTL ? 'يقبل الطلبات' : 'Accepts'}
                </span>
              )}
            </div>

            {displayCountry && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {displayCountry}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {entity.publication_type && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  {publicationLabel}
                </span>
              )}
              {(entity.project_types_supported ?? []).slice(0, 3).map((pt) => (
                <span
                  key={pt}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                >
                  {projectTypeLabel(pt)}
                </span>
              ))}
              {(entity.project_types_supported ?? []).length > 3 && (
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  +{entity.project_types_supported.length - 3}
                </span>
              )}
            </div>

            {(entity.categories ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(entity.categories ?? []).slice(0, 4).map((cat) => (
                  <span
                    key={cat.id}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    {isRTL ? cat.name : (cat.name_en || cat.name)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {expanded && entity.description && (
          <p className="text-xs leading-relaxed mt-3 pt-3" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
            {entity.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          {entity.description && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {expanded
                ? (isRTL ? 'إخفاء' : 'Hide')
                : (isRTL ? 'عرض التفاصيل' : 'View Details')}
            </button>
          )}

          {entity.submission_email && (
            <button
              onClick={() => onCopyEmail(entity.submission_email, entity.id + '_email')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: copiedId === entity.id + '_email' ? 'rgba(34,197,94,0.12)' : 'var(--color-muted)',
                color: copiedId === entity.id + '_email' ? '#16a34a' : 'var(--color-text-secondary)',
                border: `1px solid ${copiedId === entity.id + '_email' ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
              }}
            >
              <Copy size={12} />
              {copiedId === entity.id + '_email'
                ? (isRTL ? 'تم النسخ' : 'Copied!')
                : t('marketing.publishers.copyEmail', language)}
            </button>
          )}

          {entity.submission_link && (
            <a
              href={entity.submission_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              <ExternalLink size={12} />
              {t('marketing.publishers.submitLink', language)}
            </a>
          )}

          {entity.submission_email && !entity.submission_link && (
            <a
              href={`mailto:${entity.submission_email}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <Mail size={12} />
              {t('marketing.publishers.email', language)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
