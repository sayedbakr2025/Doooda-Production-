import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { AffiliateAccount } from '../../contexts/AffiliateAuthContext';

interface Props {
  affiliate: AffiliateAccount;
  isRTL: boolean;
  onRefresh: () => void;
}

const PAYOUT_METHODS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'wise', label: 'Wise' },
  { value: 'crypto', label: 'Crypto' },
];

export default function AffiliateSettings({ affiliate, isRTL, onRefresh }: Props) {
  const [method, setMethod] = useState(affiliate.payout_method || 'paypal');
  const [details, setDetails] = useState<Record<string, string>>(affiliate.payout_details || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function saveSettings() {
    setError('');
    setSaving(true);
    const { data, error: err } = await supabase.functions.invoke('affiliate-auth', {
      body: {
        action: 'update_payout_method',
        affiliate_id: affiliate.id,
        payout_method: method,
        payout_details: details,
      },
    });
    setSaving(false);
    if (err || data?.error) {
      setError(data?.error || err?.message || 'Error');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  }

  const inputStyle = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{isRTL ? 'إعدادات الحساب' : 'Account Settings'}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'إعدادات طريقة الدفع والمعلومات الشخصية' : 'Payout method and personal information settings'}</p>
      </div>

      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>{isRTL ? 'طريقة الدفع' : 'Payout Method'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'اختر طريقة الدفع' : 'Select Payout Method'}</label>
            <select className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={method} onChange={e => setMethod(e.target.value)}>
              {PAYOUT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {method === 'paypal' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>PayPal Email</label>
              <input dir="ltr" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="paypal@email.com" value={details.email || ''} onChange={e => setDetails(p => ({ ...p, email: e.target.value }))} />
            </div>
          )}

          {method === 'bank_transfer' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'اسم البنك' : 'Bank Name'}</label>
                <input className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={details.bank_name || ''} onChange={e => setDetails(p => ({ ...p, bank_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'رقم IBAN' : 'IBAN Number'}</label>
                <input dir="ltr" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={details.iban || ''} onChange={e => setDetails(p => ({ ...p, iban: e.target.value }))} />
              </div>
            </>
          )}

          {method === 'wise' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Wise Email</label>
              <input dir="ltr" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="wise@email.com" value={details.email || ''} onChange={e => setDetails(p => ({ ...p, email: e.target.value }))} />
            </div>
          )}

          {method === 'crypto' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'نوع العملة' : 'Crypto Currency'}</label>
                <input dir="ltr" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="USDT, BTC, ETH..." value={details.currency || ''} onChange={e => setDetails(p => ({ ...p, currency: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'عنوان المحفظة' : 'Wallet Address'}</label>
                <input dir="ltr" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="0x..." value={details.address || ''} onChange={e => setDetails(p => ({ ...p, address: e.target.value }))} />
              </div>
            </>
          )}

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

          <button onClick={saveSettings} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: saved ? '#16a34a' : 'var(--color-accent)', color: 'white' }}>
            {saving ? '...' : saved ? (isRTL ? 'تم الحفظ!' : 'Saved!') : (isRTL ? 'حفظ الإعدادات' : 'Save Settings')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{isRTL ? 'معلومات الحساب' : 'Account Information'}</h3>
        <div className="space-y-2">
          {[
            { labelAr: 'الاسم', labelEn: 'Name', value: affiliate.name },
            { labelAr: 'البريد', labelEn: 'Email', value: affiliate.email },
            { labelAr: 'الدولة', labelEn: 'Country', value: affiliate.country || '-' },
            { labelAr: 'كود الإحالة', labelEn: 'Referral Code', value: affiliate.referral_code },
          ].map(row => (
            <div key={row.labelEn} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? row.labelAr : row.labelEn}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
