import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstitutionAuth } from '../contexts/InstitutionAuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';
import PartnerAccountMenu from '../components/partner/PartnerAccountMenu';
import PartnerCompetitions from '../components/partner/PartnerCompetitions';
import PartnerTokenRecharge from '../components/partner/PartnerTokenRecharge';
import PartnerSubmissionGuidelines from '../components/partner/PartnerSubmissionGuidelines';
import PartnerEvaluationCriteria from '../components/partner/PartnerEvaluationCriteria';
import PartnerUploadWorks from '../components/partner/PartnerUploadWorks';

type TabKey = 'overview' | 'competitions' | 'recharge' | 'guidelines' | 'criteria' | 'works';

const TAB_ICONS: Record<TabKey, string> = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  competitions: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  recharge: 'M13 10V3L4 14h7v7l9-11h-7z',
  guidelines: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  criteria: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  works: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
};

export default function PartnerDashboard() {
  const { institution, loading } = useInstitutionAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState({ competitions: 0, submissions: 0 });

  useEffect(() => {
    if (!loading && !institution) navigate('/partners/login');
  }, [institution, loading, navigate]);

  useEffect(() => {
    if (!institution?.id) return;
    async function loadStats() {
      const { count: compCount } = await supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', institution!.id);

      const { data: compIds } = await supabase
        .from('competitions')
        .select('id')
        .eq('partner_id', institution!.id);

      let subCount = 0;
      if (compIds && compIds.length > 0) {
        const { count } = await supabase
          .from('competition_submissions')
          .select('*', { count: 'exact', head: true })
          .in('competition_id', compIds.map(c => c.id));
        subCount = count || 0;
      }
      setStats({ competitions: compCount || 0, submissions: subCount });
    }
    loadStats();
  }, [institution?.id]);

  if (loading || !institution) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  const TABS: { key: TabKey; ar: string; en: string }[] = [
    { key: 'overview', ar: 'الرئيسية', en: 'Overview' },
    { key: 'competitions', ar: 'المسابقات', en: 'Competitions' },
    { key: 'recharge', ar: 'شحن التوكنز', en: 'Recharge' },
    { key: 'guidelines', ar: 'شروط التقديم', en: 'Guidelines' },
    { key: 'criteria', ar: 'التقييم', en: 'Evaluation' },
    { key: 'works', ar: 'قيّم أعمالك', en: 'Evaluate Works' },
  ];

  const institutionTypeLabel = (t: string) => {
    const types: Record<string, { ar: string; en: string }> = {
      publisher: { ar: 'دار نشر', en: 'Publisher' },
      production_company: { ar: 'شركة إنتاج', en: 'Production Company' },
      agency: { ar: 'وكالة أدبية', en: 'Literary Agency' },
      festival: { ar: 'مهرجان', en: 'Festival' },
    };
    return isRTL ? (types[t]?.ar || t) : (types[t]?.en || t);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}>
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <DooodaLogo />
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: 'var(--color-accent)', border: '1px solid rgba(59,130,246,0.15)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {isRTL ? institutionTypeLabel(institution.institution_type) : institutionTypeLabel(institution.institution_type)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('recharge')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: institution.tokens_balance > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: institution.tokens_balance > 0 ? '#16a34a' : '#dc2626',
                border: `1px solid ${institution.tokens_balance > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {institution.tokens_balance.toLocaleString()}
            </button>
            <ThemeToggle />
            <PartnerAccountMenu />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2"
                style={{
                  color: tab === t.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottomColor: tab === t.key ? 'var(--color-accent)' : 'transparent',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={TAB_ICONS[t.key]} />
                </svg>
                {isRTL ? t.ar : t.en}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {institution.tokens_balance <= 0 && (
          <div
            className="rounded-xl p-4 mb-5 flex items-center justify-between gap-3"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="#d97706" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-semibold" style={{ color: '#d97706' }}>
                {isRTL ? 'رصيد التوكنز نفد — اشترِ باقة للاستمرار' : 'Token balance depleted — buy a package to continue'}
              </p>
            </div>
            <button
              onClick={() => setTab('recharge')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-all"
              style={{ backgroundColor: '#d97706', color: 'white' }}
            >
              {isRTL ? 'شحن الآن' : 'Recharge Now'}
            </button>
          </div>
        )}

        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {institution.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {institution.name}
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {institution.email} · {institutionTypeLabel(institution.institution_type)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: isRTL ? 'رصيد التوكنز' : 'Token Balance',
                  value: institution.tokens_balance.toLocaleString(),
                  icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                  color: '#16a34a',
                  bg: 'rgba(34,197,94,0.07)',
                  border: 'rgba(34,197,94,0.2)',
                  action: { label: isRTL ? 'شحن التوكنز' : 'Recharge', onClick: () => setTab('recharge') },
                },
                {
                  label: isRTL ? 'المسابقات' : 'Competitions',
                  value: String(stats.competitions),
                  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'var(--color-accent)',
                  bg: 'rgba(59,130,246,0.07)',
                  border: 'rgba(59,130,246,0.2)',
                  action: { label: isRTL ? 'إدارة المسابقات' : 'Manage', onClick: () => setTab('competitions') },
                },
                {
                  label: isRTL ? 'الأعمال المستلمة' : 'Submissions',
                  value: String(stats.submissions),
                  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                  color: '#ca8a04',
                  bg: 'rgba(234,179,8,0.07)',
                  border: 'rgba(234,179,8,0.2)',
                  action: null,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: stat.bg, border: `1px solid ${stat.border}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <svg className="w-4.5 h-4.5" style={{ color: stat.color, width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs font-medium mb-3" style={{ color: stat.color, opacity: 0.8 }}>{stat.label}</p>
                  {stat.action && (
                    <button
                      onClick={stat.action.onClick}
                      className="text-xs font-semibold transition-all"
                      style={{ color: stat.color }}
                    >
                      {stat.action.label} →
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'معلومات المؤسسة' : 'Institution Details'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: isRTL ? 'الدولة' : 'Country', value: institution.country, icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
                  { label: isRTL ? 'المدينة' : 'City', value: institution.city, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
                  { label: isRTL ? 'الهاتف' : 'Phone', value: institution.phone, icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
                  { label: isRTL ? 'الموقع' : 'Website', value: institution.website, icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' },
                ].filter(r => r.value).map((row, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={row.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>{row.label}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {institution.description && (
                <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? 'نبذة عن المؤسسة' : 'About'}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {institution.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'competitions' && <PartnerCompetitions institution={institution} />}
        {tab === 'recharge' && <PartnerTokenRecharge institution={institution} />}
        {tab === 'guidelines' && <PartnerSubmissionGuidelines institution={institution} />}
        {tab === 'criteria' && <PartnerEvaluationCriteria institution={institution} />}
        {tab === 'works' && <PartnerUploadWorks institution={institution} />}
      </main>
    </div>
  );
}
