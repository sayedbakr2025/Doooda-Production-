import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAffiliateAuth } from '../contexts/AffiliateAuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';
import AffiliateOverview from '../components/affiliate/AffiliateOverview';
import AffiliateLinks from '../components/affiliate/AffiliateLinks';
import AffiliateCoupons from '../components/affiliate/AffiliateCoupons';
import AffiliateAnalytics from '../components/affiliate/AffiliateAnalytics';
import AffiliatePayouts from '../components/affiliate/AffiliatePayouts';
import AffiliateSettings from '../components/affiliate/AffiliateSettings';
import { useState } from 'react';

const TABS = [
  { key: 'overview', ar: 'الرئيسية', en: 'Overview' },
  { key: 'links', ar: 'روابط الإحالة', en: 'Referral Links' },
  { key: 'coupons', ar: 'أكواد الخصم', en: 'Coupons' },
  { key: 'analytics', ar: 'التحليلات', en: 'Analytics' },
  { key: 'payouts', ar: 'المدفوعات', en: 'Payouts' },
  { key: 'settings', ar: 'الإعدادات', en: 'Settings' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function AffiliateDashboard() {
  const { affiliate, loading, logout, refreshAffiliate } = useAffiliateAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!loading && !affiliate) navigate('/affiliate/login');
  }, [affiliate, loading, navigate]);

  if (loading || !affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const statusColor = affiliate.status === 'approved' ? '#16a34a' : affiliate.status === 'pending' ? '#d97706' : '#ef4444';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}>
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 gap-3" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <DooodaLogo />
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold hidden sm:block" style={{ backgroundColor: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
            {affiliate.status === 'approved' ? (isRTL ? 'معتمد' : 'Approved') : affiliate.status === 'pending' ? (isRTL ? 'قيد المراجعة' : 'Pending') : (isRTL ? 'معلق' : 'Suspended')}
          </span>
          <ThemeToggle />
          <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'خروج' : 'Logout'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden md:flex flex-col gap-1 w-44 shrink-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-start transition-all"
                style={{
                  backgroundColor: activeTab === t.key ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === t.key ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {isRTL ? t.ar : t.en}
              </button>
            ))}
          </aside>

          <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 mb-4 w-full scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: activeTab === t.key ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: activeTab === t.key ? 'white' : 'var(--color-text-secondary)',
                  border: `1px solid ${activeTab === t.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {isRTL ? t.ar : t.en}
              </button>
            ))}
          </div>

          <main className="flex-1 min-w-0">
            {activeTab === 'overview' && <AffiliateOverview affiliate={affiliate} isRTL={isRTL} />}
            {activeTab === 'links' && <AffiliateLinks affiliate={affiliate} isRTL={isRTL} />}
            {activeTab === 'coupons' && <AffiliateCoupons affiliate={affiliate} isRTL={isRTL} />}
            {activeTab === 'analytics' && <AffiliateAnalytics affiliate={affiliate} isRTL={isRTL} />}
            {activeTab === 'payouts' && <AffiliatePayouts affiliate={affiliate} isRTL={isRTL} onRefresh={refreshAffiliate} />}
            {activeTab === 'settings' && <AffiliateSettings affiliate={affiliate} isRTL={isRTL} onRefresh={refreshAffiliate} />}
          </main>
        </div>
      </div>
    </div>
  );
}
