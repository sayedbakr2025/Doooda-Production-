import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface PromoPopup {
  id: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  image_url: string | null;
  trigger_mode: 'once' | 'always';
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM: Omit<PromoPopup, 'id' | 'created_at'> = {
  title_ar: '',
  title_en: '',
  body_ar: '',
  body_en: '',
  image_url: '',
  trigger_mode: 'once',
  is_active: false,
};

export default function AdminPromoPopups() {
  const [popups, setPopups] = useState<PromoPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPopups();
  }, []);

  async function loadPopups() {
    setLoading(true);
    const { data } = await supabase
      .from('promo_popups')
      .select('*')
      .order('created_at', { ascending: false });
    setPopups(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setShowForm(true);
  }

  function openEdit(popup: PromoPopup) {
    setEditingId(popup.id);
    setForm({
      title_ar: popup.title_ar,
      title_en: popup.title_en,
      body_ar: popup.body_ar,
      body_en: popup.body_en,
      image_url: popup.image_url || '',
      trigger_mode: popup.trigger_mode,
      is_active: popup.is_active,
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.title_ar && !form.title_en) {
      setError('Please enter at least one title (Arabic or English).');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      title_ar: form.title_ar,
      title_en: form.title_en,
      body_ar: form.body_ar,
      body_en: form.body_en,
      image_url: form.image_url?.trim() || null,
      trigger_mode: form.trigger_mode,
      is_active: form.is_active,
    };

    if (payload.is_active) {
      const excludeId = editingId || '00000000-0000-0000-0000-000000000000';
      await supabase.from('promo_popups').update({ is_active: false }).neq('id', excludeId);
    }

    let err;
    if (editingId) {
      ({ error: err } = await supabase.from('promo_popups').update(payload).eq('id', editingId));
    } else {
      ({ error: err } = await supabase.from('promo_popups').insert(payload));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    closeForm();
    loadPopups();
  }

  async function handleToggleActive(popup: PromoPopup) {
    const newActive = !popup.is_active;
    if (newActive) {
      await supabase.from('promo_popups').update({ is_active: false }).neq('id', popup.id);
    }
    await supabase.from('promo_popups').update({ is_active: newActive }).eq('id', popup.id);
    loadPopups();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this popup?')) return;
    await supabase.from('promo_popups').delete().eq('id', id);
    loadPopups();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Promotional Popups</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Manage popups shown to writers when they open Doooda.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPopups}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            New Popup
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)' }} />
        </div>
      ) : popups.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border-2 border-dashed"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
        >
          <p className="font-medium">No popups yet</p>
          <p className="text-sm mt-1">Create your first promotional popup</p>
        </div>
      ) : (
        <div className="space-y-3">
          {popups.map(popup => (
            <div
              key={popup.id}
              className="rounded-xl p-4 flex items-center gap-4"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid ${popup.is_active ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {popup.image_url && (
                <img
                  src={popup.image_url}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                  style={{ border: '1px solid var(--color-border)' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {popup.title_ar || popup.title_en || 'Untitled'}
                  </span>
                  {popup.title_en && popup.title_ar && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)' }}>
                      AR + EN
                    </span>
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: popup.trigger_mode === 'once' ? 'rgba(59,130,246,0.1)' : 'rgba(234,179,8,0.1)',
                      color: popup.trigger_mode === 'once' ? 'var(--color-info, #3b82f6)' : '#ca8a04',
                    }}
                  >
                    {popup.trigger_mode === 'once' ? 'Once only' : 'Every visit'}
                  </span>
                  {popup.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                      Active
                    </span>
                  )}
                </div>
                {(popup.body_ar || popup.body_en) && (
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {popup.body_ar || popup.body_en}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(popup)}
                  title={popup.is_active ? 'Deactivate' : 'Activate'}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: popup.is_active ? 'var(--color-accent)' : 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)' }}
                >
                  {popup.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(popup)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(popup.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--color-error)', backgroundColor: 'rgba(239,68,68,0.07)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                {editingId ? 'Edit Popup' : 'Create Popup'}
              </h3>
              <button onClick={closeForm} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                  {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (Arabic)</label>
                  <input
                    dir="rtl"
                    value={form.title_ar}
                    onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                    placeholder="العنوان بالعربية"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title (English)</label>
                  <input
                    value={form.title_en}
                    onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                    placeholder="Title in English"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Body (Arabic)</label>
                  <textarea
                    dir="rtl"
                    rows={4}
                    value={form.body_ar}
                    onChange={e => setForm(f => ({ ...f, body_ar: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border resize-none"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                    placeholder="المحتوى بالعربية..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Body (English)</label>
                  <textarea
                    rows={4}
                    value={form.body_en}
                    onChange={e => setForm(f => ({ ...f, body_en: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border resize-none"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                    placeholder="Body content in English..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Image URL <span style={{ color: 'var(--color-text-tertiary)' }}>(512×512 px recommended, optional)</span>
                </label>
                <input
                  value={form.image_url || ''}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  placeholder="https://..."
                />
                {form.image_url?.trim() && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="mt-2 w-20 h-20 rounded-lg object-cover"
                    style={{ border: '1px solid var(--color-border)' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Trigger Mode</label>
                <div className="flex gap-3">
                  {(['once', 'always'] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trigger_mode"
                        value={mode}
                        checked={form.trigger_mode === mode}
                        onChange={() => setForm(f => ({ ...f, trigger_mode: mode }))}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {mode === 'once' ? 'Once only (per user)' : 'Every visit'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Active (only one popup can be active at a time)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 p-5" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
