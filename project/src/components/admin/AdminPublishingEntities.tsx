import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseCountries, serializeCountries } from '../../features/marketing/marketingService';
import Input from '../Input';
import Button from '../Button';

const ENTITY_TYPES = [
  { value: 'publisher', label: 'Publisher' },
  { value: 'production_company', label: 'Production Company' },
  { value: 'agency', label: 'Agency' },
  { value: 'festival', label: 'Festival' },
];

const PUBLICATION_TYPES = [
  { value: 'print', label: 'Print' },
  { value: 'digital', label: 'Digital' },
  { value: 'print_digital', label: 'Print & Digital' },
];

const PROJECT_TYPES = [
  { value: 'novel', label: 'Novel' },
  { value: 'short_stories', label: 'Short Stories' },
  { value: 'film_screenplay', label: 'Film Screenplay' },
  { value: 'theatre', label: 'Theatre' },
  { value: 'radio_series', label: 'Radio Series' },
  { value: 'children_book', label: "Children's Book" },
];

const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia',
  'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt',
  'El Salvador', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Guatemala', 'Honduras', 'Hungary', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kuwait', 'Kyrgyzstan', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Malaysia',
  'Maldives', 'Malta', 'Mauritania', 'Mexico', 'Moldova', 'Mongolia', 'Morocco', 'Mozambique',
  'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'North Korea',
  'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'South Africa', 'South Korea',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tajikistan', 'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Turkmenistan', 'UAE',
  'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other',
].sort();

interface PublishingCategory {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
}

interface PublishingEntity {
  id: string;
  name: string;
  logo_url: string;
  description: string;
  country: string;
  country_ids?: string[];
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
  category_ids?: string[];
}

const EMPTY_ENTITY: Omit<PublishingEntity, 'id' | 'created_at' | 'updated_at'> & { id: string; created_at: string; updated_at: string } = {
  id: '',
  name: '',
  logo_url: '',
  description: '',
  country: '',
  country_ids: [],
  entity_type: 'publisher',
  accepts_submissions: false,
  submission_email: '',
  submission_link: '',
  publication_type: 'print',
  project_types_supported: [],
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  category_ids: [],
};

interface AdminMultiCountryPickerProps {
  selected: string[];
  onChange: (val: string[]) => void;
}

function AdminMultiCountryPicker({ selected, onChange }: AdminMultiCountryPickerProps) {
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

  const filtered = ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  function toggle(c: string) {
    onChange(selected.includes(c) ? selected.filter((s) => s !== c) : [...selected, c]);
  }

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ ...inputStyle, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <span style={{ color: selected.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
          {selected.length === 0 ? 'Select countries...' : `${selected.length} selected`}
        </span>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
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
              <button type="button" onClick={() => toggle(c)} style={{ lineHeight: 0 }}>
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '240px', display: 'flex', flexDirection: 'column', minWidth: '220px' }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <input
              autoFocus
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', width: '100%' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className="w-full flex items-center gap-2 text-sm hover:opacity-80"
                style={{
                  padding: '8px 12px',
                  backgroundColor: selected.includes(c) ? 'rgba(59,130,246,0.08)' : 'transparent',
                  color: 'var(--color-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selected.includes(c) ? 'var(--color-accent)' : 'transparent',
                    border: `2px solid ${selected.includes(c) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {selected.includes(c) && (
                    <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPublishingEntities() {
  const [entities, setEntities] = useState<PublishingEntity[]>([]);
  const [categories, setCategories] = useState<PublishingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEntity, setEditingEntity] = useState<PublishingEntity | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryNameEn, setEditingCategoryNameEn] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [entitiesRes, categoriesRes] = await Promise.all([
        supabase.from('publishing_entities').select('*').order('sort_order', { ascending: true }).order('name'),
        supabase.from('publishing_categories').select('*').order('name'),
      ]);
      setEntities(entitiesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error('Failed to load publishing entities', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEntityCategories = async (entityId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('publishing_entity_categories')
      .select('category_id')
      .eq('entity_id', entityId);
    return (data || []).map((r: { category_id: string }) => r.category_id);
  };

  const handleCreate = () => {
    setEditingEntity({ ...EMPTY_ENTITY });
    setIsCreating(true);
  };

  const handleEdit = async (entity: PublishingEntity) => {
    const categoryIds = await loadEntityCategories(entity.id);
    const country_ids = parseCountries(entity.country);
    setEditingEntity({ ...entity, category_ids: categoryIds, country_ids });
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editingEntity || !editingEntity.name.trim()) return;
    setSaving(true);
    try {
      const { category_ids, country_ids, id, created_at, updated_at, ...fields } = editingEntity;
      const country = serializeCountries(country_ids ?? []);
      const payload = { ...fields, country, updated_at: new Date().toISOString() };

      let entityId = id;

      if (isCreating) {
        const { data, error } = await supabase
          .from('publishing_entities')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select('id')
          .single();
        if (error) throw error;
        entityId = data.id;
      } else {
        const { error } = await supabase
          .from('publishing_entities')
          .update(payload)
          .eq('id', entityId);
        if (error) throw error;
        await supabase.from('publishing_entity_categories').delete().eq('entity_id', entityId);
      }

      if (category_ids && category_ids.length > 0) {
        const pivotRows = category_ids.map((catId) => ({ entity_id: entityId, category_id: catId }));
        const { error } = await supabase.from('publishing_entity_categories').insert(pivotRows);
        if (error) throw error;
      }

      setEditingEntity(null);
      setIsCreating(false);
      await loadAll();
    } catch (err) {
      console.error('Failed to save entity', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (entity: PublishingEntity) => {
    try {
      await supabase
        .from('publishing_entities')
        .update({ is_active: !entity.is_active, updated_at: new Date().toISOString() })
        .eq('id', entity.id);
      setEntities((prev) =>
        prev.map((e) => (e.id === entity.id ? { ...e, is_active: !entity.is_active } : e))
      );
    } catch (err) {
      console.error('Failed to toggle active', err);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const name_en = newCategoryNameEn.trim() || undefined;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setAddingCategory(true);
    try {
      const { data, error } = await supabase
        .from('publishing_categories')
        .insert([{ name, name_en, slug }])
        .select()
        .single();
      if (error) throw error;
      setCategories((prev) => [...prev, data]);
      if (editingEntity && data) {
        setEditingEntity({
          ...editingEntity,
          category_ids: [...(editingEntity.category_ids || []), data.id],
        });
      }
      setNewCategoryName('');
      setNewCategoryNameEn('');
    } catch (err) {
      console.error('Failed to create category', err);
    } finally {
      setAddingCategory(false);
    }
  };

  const toggleProjectType = (value: string) => {
    if (!editingEntity) return;
    const current = editingEntity.project_types_supported;
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setEditingEntity({ ...editingEntity, project_types_supported: updated });
  };

  const toggleCategory = (id: string) => {
    if (!editingEntity) return;
    const current = editingEntity.category_ids || [];
    const updated = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
    setEditingEntity({ ...editingEntity, category_ids: updated });
  };

  const handleUpdateCategoryNameEn = async (catId: string) => {
    try {
      await supabase
        .from('publishing_categories')
        .update({ name_en: editingCategoryNameEn.trim() || null })
        .eq('id', catId);
      setCategories((prev) =>
        prev.map((c) => c.id === catId ? { ...c, name_en: editingCategoryNameEn.trim() || undefined } : c)
      );
      setEditingCategoryId(null);
      setEditingCategoryNameEn('');
    } catch (err) {
      console.error('Failed to update category', err);
    }
  };

  const countries = Array.from(
    new Set(entities.flatMap((e) => parseCountries(e.country)).filter(Boolean))
  ).sort();

  const filtered = entities.filter((e) => {
    const matchSearch =
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = !filterType || e.entity_type === filterType;
    const matchCountry = !filterCountry || parseCountries(e.country).includes(filterCountry);
    return matchSearch && matchType && matchCountry;
  });

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span style={{ color: 'var(--color-text-tertiary)' }}>Loading publishing directory...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Publishing Directory
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {entities.length} entities
          </p>
        </div>
        <Button onClick={handleCreate}>Add Entity</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search by name or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...selectStyle, width: '100%' }}
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} style={selectStyle}>
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <table className="min-w-full">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Country</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Accepts</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  No entities found.
                </td>
              </tr>
            ) : (
              filtered.map((entity, idx) => (
                <tr
                  key={entity.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {entity.logo_url ? (
                        <img
                          src={entity.logo_url}
                          alt={entity.name}
                          className="w-8 h-8 rounded object-cover"
                          style={{ border: '1px solid var(--color-border)' }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)' }}
                        >
                          {entity.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {entity.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                    >
                      {ENTITY_TYPES.find((t) => t.value === entity.entity_type)?.label || entity.entity_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {parseCountries(entity.country).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: entity.accepts_submissions ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)',
                        color: entity.accepts_submissions ? '#16a34a' : 'var(--color-text-tertiary)',
                      }}
                    >
                      {entity.accepts_submissions ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleActive(entity)}
                      className="px-2 py-0.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: entity.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: entity.is_active ? '#16a34a' : 'var(--color-error)',
                      }}
                    >
                      {entity.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleEdit(entity)}
                      className="text-sm font-medium mr-4 hover:opacity-80"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(entity)}
                      className="text-sm font-medium hover:opacity-80"
                      style={{ color: entity.is_active ? 'var(--color-error)' : 'var(--color-success, #16a34a)' }}
                    >
                      {entity.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowCategoryManager((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
          style={{ color: 'var(--color-accent)' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 12h.01M7 17h.01M13 7h4M13 12h4M13 17h4" />
          </svg>
          {showCategoryManager ? 'Hide Category Manager' : 'Manage Category Translations'}
          <svg
            width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ transform: showCategoryManager ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCategoryManager && (
          <div
            className="mt-3 rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div
              className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
            >
              Publishing Categories
            </div>
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center gap-4 px-5 py-3"
                style={{ borderBottom: idx < categories.length - 1 ? '1px solid var(--color-border)' : 'none' }}
              >
                <div className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {cat.name}
                </div>
                {editingCategoryId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="English name..."
                      value={editingCategoryNameEn}
                      onChange={(e) => setEditingCategoryNameEn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCategoryNameEn(cat.id);
                        if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryNameEn(''); }
                      }}
                      style={{ ...selectStyle, flex: 1, padding: '5px 10px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCategoryNameEn(cat.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingCategoryId(null); setEditingCategoryNameEn(''); }}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm flex-1" style={{ color: cat.name_en ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', fontStyle: cat.name_en ? 'normal' : 'italic' }}>
                      {cat.name_en || 'No English name'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryNameEn(cat.name_en || ''); }}
                      className="text-xs font-medium hover:opacity-80"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 overflow-y-auto z-50">
          <div
            className="rounded-xl w-full max-w-2xl my-8"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {isCreating ? 'Add Publishing Entity' : `Edit: ${editingEntity.name}`}
              </h3>
              <button
                onClick={() => { setEditingEntity(null); setIsCreating(false); }}
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    label="Name *"
                    value={editingEntity.name}
                    onChange={(e) => setEditingEntity({ ...editingEntity, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Entity Type
                  </label>
                  <select
                    value={editingEntity.entity_type}
                    onChange={(e) => setEditingEntity({ ...editingEntity, entity_type: e.target.value })}
                    style={{ ...selectStyle, width: '100%' }}
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Countries
                  </label>
                  <AdminMultiCountryPicker
                    selected={editingEntity.country_ids ?? []}
                    onChange={(val) => setEditingEntity({ ...editingEntity, country_ids: val })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Publication Type
                  </label>
                  <select
                    value={editingEntity.publication_type}
                    onChange={(e) => setEditingEntity({ ...editingEntity, publication_type: e.target.value })}
                    style={{ ...selectStyle, width: '100%' }}
                  >
                    {PUBLICATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <Input
                    label="Logo URL"
                    value={editingEntity.logo_url}
                    onChange={(e) => setEditingEntity({ ...editingEntity, logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Description
                  </label>
                  <textarea
                    value={editingEntity.description}
                    onChange={(e) => setEditingEntity({ ...editingEntity, description: e.target.value })}
                    rows={3}
                    className="w-full input-field resize-none"
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ backgroundColor: editingEntity.accepts_submissions ? 'var(--color-accent)' : 'var(--color-border)' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      style={{ transform: editingEntity.accepts_submissions ? 'translateX(20px)' : 'translateX(2px)' }}
                    />
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={editingEntity.accepts_submissions}
                      onChange={(e) => setEditingEntity({ ...editingEntity, accepts_submissions: e.target.checked })}
                    />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Accepts Submissions
                  </span>
                </label>
              </div>

              {editingEntity.accepts_submissions && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Submission Email"
                    type="email"
                    value={editingEntity.submission_email}
                    onChange={(e) => setEditingEntity({ ...editingEntity, submission_email: e.target.value })}
                    placeholder="submissions@example.com"
                  />
                  <Input
                    label="Submission Link"
                    value={editingEntity.submission_link}
                    onChange={(e) => setEditingEntity({ ...editingEntity, submission_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Project Types Supported
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TYPES.map((pt) => {
                    const selected = editingEntity.project_types_supported.includes(pt.value);
                    return (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => toggleProjectType(pt.value)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                          color: selected ? '#fff' : 'var(--color-text-secondary)',
                          border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        }}
                      >
                        {pt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Categories
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map((cat) => {
                    const selected = (editingEntity.category_ids || []).includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex flex-col items-center leading-tight"
                        style={{
                          backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                          color: selected ? '#fff' : 'var(--color-text-secondary)',
                          border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        }}
                      >
                        <span>{cat.name}</span>
                        {cat.name_en && (
                          <span style={{ opacity: 0.75, fontSize: '10px' }}>{cat.name_en}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اسم التصنيف (عربي)..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    style={{ ...selectStyle, flex: 1 }}
                    dir="rtl"
                  />
                  <input
                    type="text"
                    placeholder="English name..."
                    value={newCategoryNameEn}
                    onChange={(e) => setNewCategoryNameEn(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    style={{ ...selectStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  >
                    {addingCategory ? '...' : 'Add'}
                  </button>
                </div>
              </div>

              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ backgroundColor: editingEntity.is_active ? 'var(--color-accent)' : 'var(--color-border)' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      style={{ transform: editingEntity.is_active ? 'translateX(20px)' : 'translateX(2px)' }}
                    />
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={editingEntity.is_active}
                      onChange={(e) => setEditingEntity({ ...editingEntity, is_active: e.target.checked })}
                    />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Active (visible to writers)
                  </span>
                </label>
              </div>
            </div>

            <div
              className="flex gap-3 px-6 py-4"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : isCreating ? 'Create Entity' : 'Save Changes'}
              </Button>
              <button
                onClick={() => { setEditingEntity(null); setIsCreating(false); }}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
