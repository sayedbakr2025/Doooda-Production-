import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminInstitutionApplications from './AdminInstitutionApplications';
import AdminInstitutionList from './AdminInstitutionList';
import AdminInstitutionCompetitions from './AdminInstitutionCompetitions';
import AdminInstitutionSubmissions from './AdminInstitutionSubmissions';
import AdminInstitutionAnalytics from './AdminInstitutionAnalytics';
import AdminInstitutionTokenPackages from './AdminInstitutionTokenPackages';

type Tab = 'applications' | 'accounts' | 'competition-approval' | 'competitions' | 'submissions' | 'analytics' | 'token-packages';

interface Counts {
  pending_applications: number;
  pending_competitions: number;
}

const TAB_ICONS: Record<Tab, JSX.Element> = {
  applications: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  accounts: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  'competition-approval': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  competitions: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  submissions: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  analytics: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'token-packages': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

export default function AdminInstitutions() {
  const [tab, setTab] = useState<Tab>('applications');
  const [counts, setCounts] = useState<Counts>({ pending_applications: 0, pending_competitions: 0 });

  async function loadCounts() {
    const [{ count: pendingApps }, { count: pendingComps }] = await Promise.all([
      supabase.from('institutional_accounts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('competitions').select('*', { count: 'exact', head: true }).eq('created_by_partner', true).eq('approval_status', 'pending'),
    ]);
    setCounts({ pending_applications: pendingApps || 0, pending_competitions: pendingComps || 0 });
  }

  useEffect(() => { loadCounts(); }, []);

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'applications', label: 'Applications', badge: counts.pending_applications },
    { key: 'accounts', label: 'All Accounts' },
    { key: 'competition-approval', label: 'Competition Approval', badge: counts.pending_competitions },
    { key: 'competitions', label: 'All Competitions' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'token-packages', label: 'Token Packages' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Institutional Accounts</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Manage publishers, production companies, competitions and submissions
        </p>
      </div>

      <div
        className="flex gap-1 mb-6 overflow-x-auto pb-px"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {TABS.map(t => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors rounded-t-lg"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                {TAB_ICONS[t.key]}
              </span>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  className="flex items-center justify-center text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1"
                  style={{ backgroundColor: '#dc2626', color: 'white', fontSize: '10px' }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'applications' && <AdminInstitutionApplications onRefresh={loadCounts} />}
        {tab === 'accounts' && <AdminInstitutionList onRefresh={loadCounts} />}
        {tab === 'competition-approval' && <AdminInstitutionCompetitions mode="approval" />}
        {tab === 'competitions' && <AdminInstitutionCompetitions mode="monitoring" />}
        {tab === 'submissions' && <AdminInstitutionSubmissions />}
        {tab === 'analytics' && <AdminInstitutionAnalytics />}
        {tab === 'token-packages' && <AdminInstitutionTokenPackages />}
      </div>
    </div>
  );
}
