import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { AffiliateAccount } from '../../contexts/AffiliateAuthContext';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  usage_count: number;
  usage_limit: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  affiliate: AffiliateAccount;
  isRTL: boolean;
}

export default function AffiliateCoupons({ affiliate, isRTL }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [affiliate.id]);

  async function loadCoupons() {
    setLoading(true);
    const { data } = await supabase
      .from('affiliate_coupons')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'أكواد الخصم' : 'Coupon Codes'}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'الأكواد المخصصة لك من الإدارة. شاركها مع جمهورك.' : 'Coupon codes assigned to you by admin. Share them with your audience.'}
        </p>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-2xl px-4 py-12 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'لا توجد أكواد خصم بعد. سيتم تخصيص أكواد من قِبل الإدارة.' : 'No coupon codes yet. Codes will be assigned by the admin.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => {
            const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
            const isFull = c.usage_limit !== null && c.usage_count >= c.usage_limit;
            const inactive = !c.is_active || isExpired || isFull;

            return (
              <div key={c.id} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', opacity: inactive ? 0.6 : 1 }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black tracking-wider" style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{c.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                      backgroundColor: inactive ? 'var(--color-bg-secondary)' : 'rgba(34,197,94,0.1)',
                      color: inactive ? 'var(--color-text-tertiary)' : '#16a34a',
                      border: `1px solid ${inactive ? 'var(--color-border)' : 'rgba(34,197,94,0.2)'}`,
                    }}>
                      {inactive ? (isRTL ? 'منتهي' : 'Inactive') : (isRTL ? 'نشط' : 'Active')}
                    </span>
                  </div>
                  <button onClick={() => copy(c.code, c.id)} className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80" style={{ backgroundColor: copied === c.id ? '#16a34a' : 'var(--color-accent)', color: 'white' }}>
                    {copied === c.id ? (isRTL ? 'تم!' : 'Copied!') : (isRTL ? 'نسخ' : 'Copy')}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? 'الخصم' : 'Discount'}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? 'الاستخدامات' : 'Usage'}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {c.usage_count}{c.usage_limit !== null ? ` / ${c.usage_limit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? 'الانتهاء' : 'Expires'}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB') : (isRTL ? 'لا ينتهي' : 'Never')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
