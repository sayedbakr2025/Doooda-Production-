import { useState, useEffect } from 'react';
import { adminGetAllGenres, adminUpsertGenre, adminToggleGenre, adminGetAllTones, adminUpsertTone, adminToggleTone } from '../../services/api';
import type { Genre, Tone } from '../../types';

type ActiveTab = 'genres' | 'tones';

export default function AdminGenresTones() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('genres');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tones, setTones] = useState<Tone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingGenre, setEditingGenre] = useState<Partial<Genre> | null>(null);
  const [editingTone, setEditingTone] = useState<Partial<Tone> | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [g, t] = await Promise.all([adminGetAllGenres(), adminGetAllTones()]);
      setGenres(g);
      setTones(t);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGenre() {
    if (!editingGenre?.name || !editingGenre?.name_ar || !editingGenre?.slug) return;
    setSaving(true);
    setError('');
    try {
      await adminUpsertGenre(editingGenre as Genre & { name: string; name_ar: string; slug: string });
      setEditingGenre(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to save genre');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTone() {
    if (!editingTone?.name || !editingTone?.name_ar || !editingTone?.slug) return;
    setSaving(true);
    setError('');
    try {
      await adminUpsertTone(editingTone as Tone & { name: string; name_ar: string; slug: string });
      setEditingTone(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to save tone');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleGenre(id: string, current: boolean) {
    try {
      await adminToggleGenre(id, !current);
      setGenres(prev => prev.map(g => g.id === id ? { ...g, is_active: !current } : g));
    } catch (e: any) {
      setError(e.message || 'Failed to toggle genre');
    }
  }

  async function handleToggleTone(id: string, current: boolean) {
    try {
      await adminToggleTone(id, !current);
      setTones(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
    } catch (e: any) {
      setError(e.message || 'Failed to toggle tone');
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
  };

  const btnPrimary = {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  };

  const btnOutline = {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Genres & Tones
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
        Manage the genre and tone classification system used across all projects.
      </p>

      <div className="flex gap-2 mb-6">
        {(['genres', 'tones'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
            style={{
              backgroundColor: activeTab === tab ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        </div>
      ) : activeTab === 'genres' ? (
        <div>
          <div className="flex justify-end mb-4">
            <button
              style={btnPrimary}
              onClick={() => setEditingGenre({ name: '', name_ar: '', slug: '', category: '', is_active: true })}
            >
              + Add Genre
            </button>
          </div>

          {editingGenre && (
            <div className="mb-6 p-5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {editingGenre.id ? 'Edit Genre' : 'New Genre'}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name (EN)</label>
                  <input style={inputStyle} value={editingGenre.name || ''} onChange={e => setEditingGenre(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name (AR)</label>
                  <input style={inputStyle} value={editingGenre.name_ar || ''} onChange={e => setEditingGenre(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Slug</label>
                  <input style={inputStyle} value={editingGenre.slug || ''} onChange={e => setEditingGenre(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Category</label>
                  <input style={inputStyle} value={editingGenre.category || ''} onChange={e => setEditingGenre(p => ({ ...p, category: e.target.value }))} placeholder="general / literary / speculative / children / theatre" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button style={btnOutline} onClick={() => setEditingGenre(null)}>Cancel</button>
                <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleSaveGenre} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <tr>
                  {['Name EN', 'Name AR', 'Slug', 'Category', 'Active', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {genres.map((g, i) => (
                  <tr key={g.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined, backgroundColor: 'var(--color-surface)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>{g.name}</td>
                    <td className="px-4 py-3" dir="rtl" style={{ color: 'var(--color-text-primary)' }}>{g.name_ar}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{g.slug}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{g.category || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleGenre(g.id, g.is_active)}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: g.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          color: g.is_active ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {g.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingGenre({ ...g })}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button
              style={btnPrimary}
              onClick={() => setEditingTone({ name: '', name_ar: '', slug: '', is_active: true })}
            >
              + Add Tone
            </button>
          </div>

          {editingTone && (
            <div className="mb-6 p-5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {editingTone.id ? 'Edit Tone' : 'New Tone'}
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name (EN)</label>
                  <input style={inputStyle} value={editingTone.name || ''} onChange={e => setEditingTone(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name (AR)</label>
                  <input style={inputStyle} value={editingTone.name_ar || ''} onChange={e => setEditingTone(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Slug</label>
                  <input style={inputStyle} value={editingTone.slug || ''} onChange={e => setEditingTone(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button style={btnOutline} onClick={() => setEditingTone(null)}>Cancel</button>
                <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleSaveTone} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <tr>
                  {['Name EN', 'Name AR', 'Slug', 'Active', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tones.map((tone, i) => (
                  <tr key={tone.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined, backgroundColor: 'var(--color-surface)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>{tone.name}</td>
                    <td className="px-4 py-3" dir="rtl" style={{ color: 'var(--color-text-primary)' }}>{tone.name_ar}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{tone.slug}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleTone(tone.id, tone.is_active)}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: tone.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          color: tone.is_active ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {tone.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingTone({ ...tone })}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
