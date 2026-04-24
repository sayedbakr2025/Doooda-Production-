import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  website: string | null;
  country: string | null;
  status: string;
  referral_code: string;
  commission_type: string;
  commission_value: number;
  minimum_payout: number;
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
  total_revenue: number;
  total_commission_earned: number;
  total_commission_paid: number;
  is_flagged: boolean;
  promotion_method: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  method: string;
  status: string;
  payout_details: Record<string, string>;
  admin_notes: string | null;
  created_at: string;
  affiliates?: { name: string; email: string };
}

interface Coupon {
  id: string;
  affiliate_id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  usage_count: number;
  usage_limit: number | null;
  is_active: boolean;
  expires_at: string | null;
  affiliates?: { name: string };
}

type AdminTab = 'affiliates' | 'payouts' | 'coupons' | 'leaderboard';

export default function AdminAffiliates() {
  const [tab, setTab] = useState<AdminTab>('affiliates');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({ affiliate_id: '', code: '', discount_type: 'percentage', discount_value: '10', usage_limit: '', expires_at: '' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [affRes, payRes, couRes] = await Promise.all([
      supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
      supabase.from('affiliate_payouts').select('*, affiliates(name, email)').order('created_at', { ascending: false }).limit(50),
      supabase.from('affiliate_coupons').select('*, affiliates(name)').order('created_at', { ascending: false }),
    ]);
    setAffiliates(affRes.data || []);
    setPayouts(payRes.data || []);
    setCoupons(couRes.data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('affiliates').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    loadAll();
  }

  async function toggleFlag(id: string, flagged: boolean) {
    await supabase.from('affiliates').update({ is_flagged: flagged, updated_at: new Date().toISOString() }).eq('id', id);
    loadAll();
  }

  async function saveCommission() {
    if (!selected) return;
    setSaving(true);
    await supabase.from('affiliates').update({
      commission_type: selected.commission_type,
      commission_value: selected.commission_value,
      minimum_payout: selected.minimum_payout,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setSaving(false);
    setShowModal(false);
    loadAll();
  }

  async function updatePayoutStatus(id: string, status: string, notes?: string) {
    await supabase.from('affiliate_payouts').update({ status, admin_notes: notes || null, processed_at: status === 'completed' ? new Date().toISOString() : null }).eq('id', id);
    if (status === 'completed') {
      const payout = payouts.find(p => p.id === id);
      if (payout) {
        const aff = affiliates.find(a => a.id === payout.affiliate_id);
        if (aff) {
          await supabase.from('affiliates').update({
            total_commission_paid: aff.total_commission_paid + payout.amount,
            updated_at: new Date().toISOString(),
          }).eq('id', payout.affiliate_id);
        }
      }
    }
    loadAll();
  }

  async function createCoupon() {
    if (!couponForm.affiliate_id || !couponForm.code) return;
    setSaving(true);
    await supabase.from('affiliate_coupons').insert({
      affiliate_id: couponForm.affiliate_id,
      code: couponForm.code.toUpperCase().trim(),
      discount_type: couponForm.discount_type,
      discount_value: parseFloat(couponForm.discount_value),
      usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit) : null,
      expires_at: couponForm.expires_at || null,
      is_active: true,
    });
    setSaving(false);
    setShowCouponModal(false);
    setCouponForm({ affiliate_id: '', code: '', discount_type: 'percentage', discount_value: '10', usage_limit: '', expires_at: '' });
    loadAll();
  }

  async function toggleCoupon(id: string, active: boolean) {
    await supabase.from('affiliate_coupons').update({ is_active: active }).eq('id', id);
    loadAll();
  }

  const statusColor = (s: string) => s === 'approved' ? '#16a34a' : s === 'pending' ? '#d97706' : s === 'rejected' ? '#ef4444' : '#6b7280';
  const inputStyle = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

  const filtered = affiliates.filter(a => filterStatus === 'all' || a.status === filterStatus);
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const approvedAffiliates = affiliates.filter(a => a.status === 'approved');

  const TABS: { key: AdminTab; label: string; badge?: number }[] = [
    { key: 'affiliates', label: 'Affiliates', badge: affiliates.filter(a => a.status === 'pending').length || undefined },
    { key: 'payouts', label: 'Payouts', badge: pendingPayouts.length || undefined },
    { key: 'coupons', label: 'Coupons' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Affiliate Program</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Manage affiliates, commissions, payouts, and coupons</p>
        </div>
        <button onClick={() => setShowCouponModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
          + Add Coupon
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Affiliates', value: affiliates.length, color: '#3b82f6' },
          { label: 'Approved', value: affiliates.filter(a => a.status === 'approved').length, color: '#16a34a' },
          { label: 'Pending Review', value: affiliates.filter(a => a.status === 'pending').length, color: '#d97706' },
          { label: 'Pending Payouts', value: pendingPayouts.length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: tab === t.key ? 'var(--color-accent)' : 'var(--color-surface)', color: tab === t.key ? 'white' : 'var(--color-text-secondary)', border: `1px solid ${tab === t.key ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
            {t.label}
            {t.badge ? <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'affiliates' && (
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {['all', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: filterStatus === s ? 'var(--color-accent)' : 'var(--color-bg-secondary)', color: filterStatus === s ? 'white' : 'var(--color-text-secondary)', border: `1px solid ${filterStatus === s ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map(a => (
              <div key={a.id} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid ${a.is_flagged ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{a.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${statusColor(a.status)}18`, color: statusColor(a.status) }}>{a.status}</span>
                      {a.is_flagged && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Flagged</span>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{a.email} · {a.country || 'N/A'} · Code: <span className="font-mono font-bold">{a.referral_code}</span></p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {[
                        { label: 'Clicks', value: a.total_clicks },
                        { label: 'Signups', value: a.total_signups },
                        { label: 'Conv.', value: a.total_conversions },
                        { label: 'Earned', value: '$' + a.total_commission_earned.toFixed(0) },
                        { label: 'Paid', value: '$' + a.total_commission_paid.toFixed(0) },
                        { label: 'Commission', value: a.commission_type === 'percentage' ? `${a.commission_value}%` : `$${a.commission_value}` },
                      ].map(s => (
                        <span key={s.label} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <span style={{ color: 'var(--color-text-tertiary)' }}>{s.label}:</span> <strong>{s.value}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {a.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(a.id, 'approved')} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>Approve</button>
                        <button onClick={() => updateStatus(a.id, 'rejected')} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Reject</button>
                      </>
                    )}
                    {a.status === 'approved' && (
                      <button onClick={() => updateStatus(a.id, 'suspended')} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Suspend</button>
                    )}
                    {(a.status === 'suspended' || a.status === 'rejected') && (
                      <button onClick={() => updateStatus(a.id, 'approved')} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>Reactivate</button>
                    )}
                    <button onClick={() => { setSelected(a); setShowModal(true); }} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>Edit</button>
                    <button onClick={() => toggleFlag(a.id, !a.is_flagged)} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: a.is_flagged ? 'var(--color-bg-secondary)' : 'rgba(239,68,68,0.08)', border: `1px solid ${a.is_flagged ? 'var(--color-border)' : 'rgba(239,68,68,0.2)'}`, color: a.is_flagged ? 'var(--color-text-secondary)' : '#ef4444' }}>
                      {a.is_flagged ? 'Unflag' : 'Flag'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No affiliates found</p>}
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="space-y-2">
          {payouts.map(p => (
            <div key={p.id} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>${p.amount.toFixed(2)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: p.status === 'completed' ? 'rgba(34,197,94,0.1)' : p.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: p.status === 'completed' ? '#16a34a' : p.status === 'pending' ? '#d97706' : '#ef4444' }}>{p.status}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{p.method}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {(p.affiliates as any)?.name} · {(p.affiliates as any)?.email} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                  {p.admin_notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Note: {p.admin_notes}</p>}
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => updatePayoutStatus(p.id, 'completed')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>Pay</button>
                    <button onClick={() => updatePayoutStatus(p.id, 'rejected', 'Rejected by admin')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {payouts.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No payouts yet</p>}
        </div>
      )}

      {tab === 'coupons' && (
        <div className="space-y-2">
          {coupons.map(c => (
            <div key={c.id} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black font-mono" style={{ color: 'var(--color-text-primary)' }}>{c.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: c.is_active ? 'rgba(34,197,94,0.1)' : 'var(--color-bg-secondary)', color: c.is_active ? '#16a34a' : 'var(--color-text-tertiary)' }}>{c.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {(c.affiliates as any)?.name} · {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`} off · Used: {c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ''}
                    {c.expires_at ? ` · Expires: ${new Date(c.expires_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <button onClick={() => toggleCoupon(c.id, !c.is_active)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: c.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.1)', color: c.is_active ? '#ef4444' : '#16a34a', border: `1px solid ${c.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No coupons yet</p>}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-2">
          <p className="text-xs mb-3 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Top Affiliates by Conversions</p>
          {[...approvedAffiliates].sort((a, b) => b.total_conversions - a.total_conversions).slice(0, 20).map((a, i) => (
            <div key={a.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm" style={{ backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c3a' : 'var(--color-bg-secondary)', color: i < 3 ? 'white' : 'var(--color-text-tertiary)' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{a.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{a.email}</p>
              </div>
              <div className="flex gap-4 text-right">
                {[
                  { label: 'Conversions', value: a.total_conversions },
                  { label: 'Clicks', value: a.total_clicks },
                  { label: 'Earned', value: '$' + a.total_commission_earned.toFixed(0) },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {approvedAffiliates.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No approved affiliates yet</p>}
        </div>
      )}

      {showModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Edit Commission — {selected.name}</h3>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Commission Type</label>
              <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={selected.commission_type} onChange={e => setSelected(p => p ? { ...p, commission_type: e.target.value } : p)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Commission Value</label>
              <input type="number" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={selected.commission_value} onChange={e => setSelected(p => p ? { ...p, commission_value: parseFloat(e.target.value) } : p)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Minimum Payout ($)</label>
              <input type="number" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={selected.minimum_payout} onChange={e => setSelected(p => p ? { ...p, minimum_payout: parseFloat(e.target.value) } : p)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>Cancel</button>
              <button onClick={saveCommission} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>{saving ? '...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Create Coupon</h3>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Affiliate</label>
              <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={couponForm.affiliate_id} onChange={e => setCouponForm(p => ({ ...p, affiliate_id: e.target.value }))}>
                <option value="">Select affiliate...</option>
                {affiliates.filter(a => a.status === 'approved').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Coupon Code</label>
              <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="DOOODA-CODE10" value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                <select className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} value={couponForm.discount_type} onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value }))}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Value</label>
                <input type="number" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} value={couponForm.discount_value} onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Usage Limit (optional)</label>
              <input type="number" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="Unlimited" value={couponForm.usage_limit} onChange={e => setCouponForm(p => ({ ...p, usage_limit: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Expires At (optional)</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} value={couponForm.expires_at} onChange={e => setCouponForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCouponModal(false)} className="flex-1 py-2 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>Cancel</button>
              <button onClick={createCoupon} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>{saving ? '...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
