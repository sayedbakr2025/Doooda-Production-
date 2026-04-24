import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { AffiliateAccount } from '../../contexts/AffiliateAuthContext';

interface Props {
  affiliate: AffiliateAccount;
  isRTL: boolean;
}

interface DailyClick {
  date: string;
  count: number;
}

interface Conversion {
  id: string;
  event_type: string;
  plan_name: string | null;
  amount: number | null;
  created_at: string;
}

export default function AffiliateAnalytics({ affiliate, isRTL }: Props) {
  const [clicks, setClicks] = useState<DailyClick[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [affiliate.id]);

  async function loadData() {
    setLoading(true);
    const [clicksRes, convRes] = await Promise.all([
      supabase
        .from('affiliate_clicks')
        .select('created_at')
        .eq('affiliate_id', affiliate.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at'),
      supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const grouped: Record<string, number> = {};
    (clicksRes.data || []).forEach(c => {
      const d = c.created_at.slice(0, 10);
      grouped[d] = (grouped[d] || 0) + 1;
    });
    const last30: DailyClick[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      last30.push({ date: d, count: grouped[d] || 0 });
    }

    setClicks(last30);
    setConversions(convRes.data || []);
    setLoading(false);
  }

  const maxClicks = Math.max(...clicks.map(c => c.count), 1);

  const eventLabel = (type: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      signup: { ar: 'تسجيل', en: 'Signup' },
      subscription: { ar: 'اشتراك', en: 'Subscription' },
      token_purchase: { ar: 'شراء توكنز', en: 'Token Purchase' },
    };
    return isRTL ? (map[type]?.ar || type) : (map[type]?.en || type);
  };

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
          {isRTL ? 'التحليلات' : 'Analytics'}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'النقرات والتحويلات خلال آخر 30 يوماً' : 'Clicks and conversions over the last 30 days'}
        </p>
      </div>

      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-xs font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'النقرات اليومية (30 يوم)' : 'Daily Clicks (30 days)'}
        </h3>
        <div className="flex items-end gap-0.5 h-24">
          {clicks.map((c, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${(c.count / maxClicks) * 80}px`,
                  minHeight: c.count > 0 ? '3px' : '1px',
                  backgroundColor: c.count > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              />
              {c.count > 0 && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                  <div className="text-xs px-2 py-1 rounded shadow" style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', whiteSpace: 'nowrap' }}>
                    {c.date.slice(5)}: {c.count}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{clicks[0]?.date.slice(5)}</span>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{clicks[clicks.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-xs font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'آخر التحويلات' : 'Recent Conversions'}
        </h3>
        {conversions.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'لا توجد تحويلات بعد' : 'No conversions yet'}
          </p>
        ) : (
          <div className="space-y-2">
            {conversions.map(cv => (
              <div key={cv.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                    backgroundColor: cv.event_type === 'subscription' ? 'rgba(34,197,94,0.1)' : cv.event_type === 'signup' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                    color: cv.event_type === 'subscription' ? '#16a34a' : cv.event_type === 'signup' ? '#3b82f6' : '#d97706',
                  }}>
                    {eventLabel(cv.event_type)}
                  </span>
                  {cv.plan_name && <span className="text-xs mr-2 ml-2" style={{ color: 'var(--color-text-secondary)' }}>{cv.plan_name}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {cv.amount != null && <span className="text-xs font-bold" style={{ color: '#16a34a' }}>${cv.amount.toFixed(2)}</span>}
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(cv.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
