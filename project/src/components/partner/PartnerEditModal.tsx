import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useInstitutionAuth } from '../../contexts/InstitutionAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props { onClose: () => void; }

export default function PartnerEditModal({ onClose }: Props) {
  const { institution, refreshInstitution } = useInstitutionAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [form, setForm] = useState({
    name: institution?.name || '',
    country: institution?.country || '',
    city: institution?.city || '',
    phone: institution?.phone || '',
    website: institution?.website || '',
    description: institution?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!institution?.id) return;
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('institutional_accounts')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', institution.id);
      if (err) throw err;
      await refreshInstitution();
      setSaved(true);
      setTimeout(onClose, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'تعديل معلومات المؤسسة' : 'Edit Institution Information'}
        </h2>

        <div className="space-y-3">
          {[
            { key: 'name', label: isRTL ? 'الاسم' : 'Name' },
            { key: 'country', label: isRTL ? 'الدولة' : 'Country' },
            { key: 'city', label: isRTL ? 'المدينة' : 'City' },
            { key: 'phone', label: isRTL ? 'الهاتف' : 'Phone', dir: 'ltr' },
            { key: 'website', label: isRTL ? 'الموقع' : 'Website', dir: 'ltr' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {f.label}
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir={f.dir as any}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'النبذة' : 'Description'}
            </label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: saved ? '#16a34a' : 'var(--color-accent)', color: 'white' }}
          >
            {saved ? (isRTL ? 'تم الحفظ' : 'Saved!') : loading ? (isRTL ? 'حفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
