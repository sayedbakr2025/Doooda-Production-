import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface TokenPackage {
  id: number;
  tokens: number;
  price_usd: number;
  label_ar: string;
  label_en: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EMPTY: Omit<TokenPackage, 'id' | 'created_at'> = {
  tokens: 0,
  price_usd: 0,
  label_ar: '',
  label_en: '',
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

export default function AdminInstitutionTokenPackages() {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TokenPackage | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('institution_token_package_catalog')
      .select('*')
      .order('sort_order');
    if (data) setPackages(data);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setModalOpen(true);
  }

  function openEdit(pkg: TokenPackage) {
    setEditing(pkg);
    setForm({
      tokens: pkg.tokens,
      price_usd: pkg.price_usd,
      label_ar: pkg.label_ar,
      label_en: pkg.label_en,
      is_popular: pkg.is_popular,
      is_active: pkg.is_active,
      sort_order: pkg.sort_order,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.label_ar.trim() || !form.label_en.trim()) {
      setError('Both Arabic and English labels are required.');
      return;
    }
    if (form.tokens <= 0 || form.price_usd <= 0) {
      setError('Tokens and price must be greater than 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const { error: err } = await supabase
          .from('institution_token_package_catalog')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('institution_token_package_catalog')
          .insert(form);
        if (err) throw err;
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pkg: TokenPackage) {
    await supabase
      .from('institution_token_package_catalog')
      .update({ is_active: !pkg.is_active, updated_at: new Date().toISOString() })
      .eq('id', pkg.id);
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p));
  }

  async function togglePopular(pkg: TokenPackage) {
    const newVal = !pkg.is_popular;
    if (newVal) {
      await supabase
        .from('institution_token_package_catalog')
        .update({ is_popular: false, updated_at: new Date().toISOString() })
        .neq('id', pkg.id);
    }
    await supabase
      .from('institution_token_package_catalog')
      .update({ is_popular: newVal, updated_at: new Date().toISOString() })
      .eq('id', pkg.id);
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this package? Existing purchase records will remain.')) return;
    setDeletingId(id);
    await supabase.from('institution_token_package_catalog').delete().eq('id', id);
    setPackages(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
    outline: 'none',
  } as React.CSSProperties;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Token Packages Catalog</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Manage recharge packages shown to institutional accounts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Package
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No packages defined yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                {['Order', 'Label (AR)', 'Label (EN)', 'Tokens', 'Price (USD)', 'Popular', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, i) => (
                <tr
                  key={pkg.id}
                  style={{
                    borderBottom: i < packages.length - 1 ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: 'var(--color-bg-primary)',
                    opacity: pkg.is_active ? 1 : 0.5,
                  }}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-tertiary)' }}>{pkg.sort_order}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }} dir="rtl">{pkg.label_ar}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{pkg.label_en}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {pkg.tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    ${pkg.price_usd}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePopular(pkg)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                      style={pkg.is_popular
                        ? { backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }
                        : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}
                    >
                      {pkg.is_popular ? (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Popular
                        </>
                      ) : 'Set Popular'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(pkg)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                      style={pkg.is_active
                        ? { backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)' }
                        : { backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
                    >
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(pkg)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        disabled={deletingId === pkg.id}
                        className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80 disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-base font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
              {editing ? 'Edit Package' : 'New Package'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Tokens</label>
                  <input
                    type="number"
                    value={form.tokens}
                    onChange={e => setForm(f => ({ ...f, tokens: Number(e.target.value) }))}
                    style={inputStyle}
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price_usd}
                    onChange={e => setForm(f => ({ ...f, price_usd: Number(e.target.value) }))}
                    style={inputStyle}
                    placeholder="e.g. 55.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Label (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={form.label_ar}
                  onChange={e => setForm(f => ({ ...f, label_ar: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. 5,000,000 توكن"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Label (English)</label>
                <input
                  type="text"
                  value={form.label_en}
                  onChange={e => setForm(f => ({ ...f, label_en: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. 5,000,000 tokens"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  style={inputStyle}
                  placeholder="Lower = first"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_popular}
                    onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Most Popular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Active</span>
                </label>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs" style={{ color: '#dc2626' }}>{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Package')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
