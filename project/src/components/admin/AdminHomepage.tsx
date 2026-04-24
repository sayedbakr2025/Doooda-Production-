import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Save, RefreshCw, Globe } from 'lucide-react';

interface ContentRow {
  id: string;
  section: string;
  key: string;
  value_ar: string;
  value_en: string;
  is_active: boolean;
  sort_order: number;
}

const SECTION_LABELS: Record<string, string> = {
  nav: 'Navigation',
  hero: 'Hero Section',
  why: 'Why Doooda (Features)',
  critic: 'Doooda Critic',
  academy: 'Academy',
  marketing: 'Marketing & Publishing',
  pricing: 'Pricing',
  cta: 'Call To Action',
  footer: 'Footer',
};

export default function AdminHomepage() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [editValues, setEditValues] = useState<Record<string, { ar: string; en: string }>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    setLoading(true);
    const { data } = await supabase
      .from('homepage_content')
      .select('*')
      .order('section')
      .order('sort_order');

    if (data) {
      setRows(data);
      const initial: Record<string, { ar: string; en: string }> = {};
      data.forEach((row: ContentRow) => {
        initial[row.id] = { ar: row.value_ar, en: row.value_en };
      });
      setEditValues(initial);
    }
    setLoading(false);
  }

  async function saveRow(row: ContentRow) {
    const vals = editValues[row.id];
    if (!vals) return;
    setSaving(row.id);
    const { error } = await supabase
      .from('homepage_content')
      .update({ value_ar: vals.ar, value_en: vals.en })
      .eq('id', row.id);

    if (!error) {
      setSaved(prev => ({ ...prev, [row.id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [row.id]: false })), 2000);
    }
    setSaving(null);
  }

  async function toggleActive(row: ContentRow) {
    await supabase
      .from('homepage_content')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: !r.is_active } : r));
  }

  const sections = Object.keys(SECTION_LABELS);
  const filteredRows = rows.filter(r => r.section === activeSection);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Homepage Content
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Edit all text shown on the public landing page
          </p>
        </div>
        <button
          onClick={loadContent}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-6">
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(sec => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: activeSection === sec ? 'var(--color-accent)' : 'transparent',
                  color: activeSection === sec ? 'white' : 'var(--color-text-secondary)',
                }}
                onMouseEnter={e => { if (activeSection !== sec) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                onMouseLeave={e => { if (activeSection !== sec) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {SECTION_LABELS[sec]}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-4 min-w-0">
          <div
            className="px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <Globe className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Section: <strong style={{ color: 'var(--color-text-primary)' }}>{SECTION_LABELS[activeSection]}</strong>
              {' — '}{filteredRows.length} items
            </span>
          </div>

          {filteredRows.map(row => {
            const vals = editValues[row.id] ?? { ar: row.value_ar, en: row.value_en };
            const isDirty = vals.ar !== row.value_ar || vals.en !== row.value_en;
            return (
              <div
                key={row.id}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1.5px solid ${isDirty ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: 'var(--color-surface)',
                  opacity: row.is_active ? 1 : 0.5,
                }}
              >
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {row.key}
                    </code>
                    {isDirty && (
                      <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                        unsaved
                      </span>
                    )}
                    {saved[row.id] && (
                      <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                        saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={() => toggleActive(row)}
                        className="w-3.5 h-3.5 rounded"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {row.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </label>
                    <button
                      onClick={() => saveRow(row)}
                      disabled={saving === row.id || !isDirty}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                      onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                    >
                      {saving === row.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="p-4" style={{ borderRight: '1px solid var(--color-border)' }}>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                      Arabic
                    </label>
                    <textarea
                      value={vals.ar}
                      onChange={e => setEditValues(prev => ({ ...prev, [row.id]: { ...prev[row.id], ar: e.target.value } }))}
                      className="w-full text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 min-h-[60px]"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'Tajawal, sans-serif',
                      }}
                      dir="rtl"
                    />
                  </div>
                  <div className="p-4">
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                      English
                    </label>
                    <textarea
                      value={vals.en}
                      onChange={e => setEditValues(prev => ({ ...prev, [row.id]: { ...prev[row.id], en: e.target.value } }))}
                      className="w-full text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 min-h-[60px]"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
