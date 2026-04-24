import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';

interface TokenPackage {
  id: number;
  tokens: number;
  price_usd: number;
  label_ar: string;
  label_en: string;
  is_popular: boolean;
}

interface TokenPurchase {
  id: string;
  tokens: number;
  price_usd: number;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Props {
  institution: InstitutionalAccount;
}

export default function PartnerTokenRecharge({ institution }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [purchases, setPurchases] = useState<TokenPurchase[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: pkgs }, { data: hist }] = await Promise.all([
        supabase
          .from('institution_token_package_catalog')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('institution_token_purchases')
          .select('*')
          .eq('institution_id', institution.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (pkgs) setPackages(pkgs);
      if (hist) setPurchases(hist);
      setLoadingPkgs(false);
    }
    load();
  }, [institution.id]);

  async function handleRequest() {
    if (selected === null) return;
    const pkg = packages[selected];
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('institution-auth', {
        body: {
          action: 'request_tokens',
          institution_id: institution.id,
          catalog_id: pkg.id,
          tokens: pkg.tokens,
          price_usd: pkg.price_usd,
        },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setSubmitted(true);
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const statusLabel = (s: string) => {
    if (s === 'confirmed') return { ar: 'مؤكد', en: 'Confirmed', color: '#16a34a', bg: 'rgba(34,197,94,0.08)' };
    if (s === 'expired') return { ar: 'منتهي', en: 'Expired', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' };
    return { ar: 'بانتظار التأكيد', en: 'Pending', color: '#d97706', bg: 'rgba(217,119,6,0.08)' };
  };

  return (
    <div className="max-w-xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'شحن التوكنز' : 'Recharge Tokens'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL
            ? `رصيدك الحالي: ${institution.tokens_balance.toLocaleString()} توكن`
            : `Current balance: ${institution.tokens_balance.toLocaleString()} tokens`}
        </p>
      </div>

      {submitted && (
        <div
          className="rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
              {isRTL ? 'تم إرسال طلبك بنجاح' : 'Request sent successfully'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'سيتواصل معك فريق دووودة عبر البريد الإلكتروني لإتمام عملية الدفع وإضافة التوكنز.'
                : 'The Doooda team will contact you by email to complete payment and add the tokens.'}
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-4 mb-5 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}
      >
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL
            ? 'باقات التوكنز صالحة لمدة سنة كاملة من تاريخ الشراء، ويمكنك شراء باقة جديدة في أي وقت حتى لو لديك رصيد متبقي.'
            : 'Token packages are valid for 1 year from purchase date. You can buy a new package at any time, even if you still have a balance.'}
        </p>
      </div>

      {loadingPkgs ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {packages.map((pkg, i) => (
              <div
                key={pkg.id}
                onClick={() => setSelected(i)}
                className="rounded-2xl cursor-pointer transition-all relative overflow-hidden"
                style={{
                  backgroundColor: selected === i ? 'rgba(59,130,246,0.06)' : 'var(--color-surface)',
                  border: `2px solid ${selected === i ? '#3b82f6' : 'var(--color-border)'}`,
                }}
              >
                {pkg.is_popular && (
                  <div
                    className="w-full text-center text-xs font-bold py-1.5"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {isRTL ? pkg.label_ar : pkg.label_en}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {isRTL
                        ? `صالح لمدة سنة · ≈ ${(pkg.price_usd / pkg.tokens * 1000).toFixed(3)}$ لكل 1000 توكن`
                        : `Valid 1 year · ≈ $${(pkg.price_usd / pkg.tokens * 1000).toFixed(3)} per 1,000 tokens`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      ${pkg.price_usd}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>USD</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selected !== null && (
            <div>
              <div
                className="rounded-xl px-4 py-4 mb-4"
                style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: '#2563eb' }}>
                  {isRTL ? 'ملخص الطلب' : 'Order Summary'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? packages[selected].label_ar : packages[selected].label_en}
                  {' — '}
                  ${packages[selected].price_usd} USD
                </p>
              </div>
              <button
                className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                onClick={handleRequest}
                disabled={submitting}
              >
                {submitting
                  ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...')
                  : (isRTL ? 'إرسال طلب الشراء' : 'Send Purchase Request')}
              </button>
              <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL
                  ? 'سيتواصل معكم فريق دووودة عبر البريد الإلكتروني لإتمام الدفع'
                  : 'Our team will contact you by email to complete payment'}
              </p>
            </div>
          )}
        </>
      )}

      {purchases.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'سجل المشتريات' : 'Purchase History'}
          </h3>
          <div className="space-y-2">
            {purchases.map(p => {
              const st = statusLabel(p.status);
              return (
                <div
                  key={p.id}
                  className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {p.tokens.toLocaleString()} {isRTL ? 'توكن' : 'tokens'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      ${p.price_usd} · {isRTL ? 'ينتهي' : 'expires'} {formatDate(p.expires_at)}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {isRTL ? st.ar : st.en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
