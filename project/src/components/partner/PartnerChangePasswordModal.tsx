import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useInstitutionAuth } from '../../contexts/InstitutionAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props { onClose: () => void; }

export default function PartnerChangePasswordModal({ onClose }: Props) {
  const { institution } = useInstitutionAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!institution?.id) return;
    if (newPass.length < 8) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (newPass !== confirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('institutional_accounts')
        .update({ password_hash: newPass, updated_at: new Date().toISOString() })
        .eq('id', institution.id);
      if (err) throw err;
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
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
              dir="ltr"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
              dir="ltr"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: saved ? '#16a34a' : 'var(--color-accent)', color: 'white' }}
          >
            {saved ? (isRTL ? 'تم!' : 'Saved!') : loading ? '...' : (isRTL ? 'حفظ' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
