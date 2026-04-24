import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { AffiliateAccount } from '../../contexts/AffiliateAuthContext';

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

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

export default function AffiliatePayouts({ affiliate, isRTL, onRefresh }: Props) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'paypal', details: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pending = Math.max(0, affiliate.total_commission_earned - affiliate.total_commission_paid);

  useEffect(() => {
    loadData();
  }, [affiliate.id]);

  async function loadData() {
    setLoading(true);
    const [payRes, comRes] = await Promise.all([
      supabase.from('affiliate_payouts').select('*').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }),
      supabase.from('affiliate_commissions').select('*').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }).limit(20),
    ]);
    setPayouts(payRes.data || []);
    setCommissions(comRes.data || []);
    setLoading(false);
  }

  async function requestPayout() {
    setError('');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError(isRTL ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount');
      return;
    }
    if (amount > pending) {
      setError(isRTL ? 'المبلغ يتجاوز رصيدك المتاح' : 'Amount exceeds available balance');
      return;
    }
    if (amount < affiliate.minimum_payout) {
      setError((isRTL ? 'الحد الأدنى للسحب: $' : 'Minimum payout: $') + affiliate.minimum_payout);
      return;
    }

    setSaving(true);
    const { data, error: err } = await supabase.functions.invoke('affiliate-auth', {
      body: {
        action: 'request_payout',
        affiliate_id: affiliate.id,
        amount,
        method: form.method,
        payout_details: form.details ? { note: form.details } : {},
      },
    });
    setSaving(false);

    if (err || data?.error) {
      setError(data?.error || err?.message || 'Error');
      return;
    }

    setShowForm(false);
    setForm({ amount: '', method: 'paypal', details: '' });
    loadData();
    onRefresh();
  }

  const statusColor = (s: string) => s === 'completed' ? '#16a34a' : s === 'rejected' ? '#ef4444' : s === 'processing' ? '#3b82f6' : '#d97706';
  const statusLabel = (s: string) => {
    const m: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      processing: { ar: 'جارٍ المعالجة', en: 'Processing' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
    };
    return isRTL ? m[s]?.ar : m[s]?.en;
  };

  const inputStyle = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

  if (loading) return <div className="flex items-center justify-center py-10"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} /></div>;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{isRTL ? 'المدفوعات' : 'Payouts'}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'إدارة طلبات السحب وعمولاتك' : 'Manage payout requests and your commissions'}</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
          {isRTL ? '+ طلب سحب' : '+ Request Payout'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { labelAr: 'إجمالي العمولات', labelEn: 'Total Earned', value: '$' + affiliate.total_commission_earned.toFixed(2), color: '#16a34a' },
          { labelAr: 'الرصيد المتاح', labelEn: 'Available', value: '$' + pending.toFixed(2), color: '#3b82f6' },
          { labelAr: 'تم صرفه', labelEn: 'Paid Out', value: '$' + affiliate.total_commission_paid.toFixed(2), color: 'var(--color-text-secondary)' },
        ].map(s => (
          <div key={s.labelEn} className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? s.labelAr : s.labelEn}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="rounded-2xl p-5 mb-4 space-y-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{isRTL ? 'طلب سحب جديد' : 'New Payout Request'}</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? `الرصيد المتاح: $${pending.toFixed(2)} | الحد الأدنى: $${affiliate.minimum_payout}` : `Available: $${pending.toFixed(2)} | Min: $${affiliate.minimum_payout}`}
          </p>
          <input type="number" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder={isRTL ? 'المبلغ (USD)' : 'Amount (USD)'} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} dir="ltr" />
          <select className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
            {PAYOUT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder={isRTL ? 'تفاصيل الدفع (اختياري)' : 'Payment details (optional)'} value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))} />
          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
            <button onClick={requestPayout} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>{saving ? '...' : (isRTL ? 'إرسال' : 'Submit')}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'طلبات السحب' : 'Payout Requests'}</h3>
        {payouts.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? 'لا توجد طلبات سحب بعد' : 'No payout requests yet'}</p>
        ) : (
          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>${p.amount.toFixed(2)}</span>
                  <span className="text-xs mx-2" style={{ color: 'var(--color-text-tertiary)' }}>{p.method}</span>
                  {p.admin_notes && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>· {p.admin_notes}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${statusColor(p.status)}20`, color: statusColor(p.status) }}>{statusLabel(p.status)}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(p.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'سجل العمولات' : 'Commission History'}</h3>
        {commissions.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? 'لا توجد عمولات بعد' : 'No commissions yet'}</p>
        ) : (
          <div className="space-y-2">
            {commissions.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: '#16a34a' }}>+${c.amount.toFixed(2)}</span>
                  {c.description && <span className="text-xs mx-2" style={{ color: 'var(--color-text-tertiary)' }}>{c.description}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: c.status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: c.status === 'paid' ? '#16a34a' : '#d97706' }}>
                    {c.status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : (isRTL ? 'معلق' : 'Pending')}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
