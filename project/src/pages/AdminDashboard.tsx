import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminPlans from '../components/admin/AdminPlans';
import AdminMessages from '../components/admin/AdminMessages';
import AdminNotifications from '../components/admin/AdminNotifications';
import AdminPublishers from '../components/admin/AdminPublishers';
import AdminDoooda from '../components/admin/AdminDoooda';
import AdminPlotTemplates from '../components/admin/AdminPlotTemplates';
import AdminHomepage from '../components/admin/AdminHomepage';
import AdminProjectTypes from '../components/admin/AdminProjectTypes';
import AdminPlatformSettings from '../components/admin/AdminPlatformSettings';
import AdminBranding from '../components/admin/AdminBranding';
import AdminTracking from '../components/admin/AdminTracking';
import AdminErrorMonitor from '../components/admin/AdminErrorMonitor';
import AdminSecurity from '../components/admin/AdminSecurity';
import AdminBackup from '../components/admin/AdminBackup';
import AdminRoles from '../components/admin/AdminRoles';
import AdminAnalytics from '../components/admin/AdminAnalytics';
import AdminAcademy from '../components/admin/AdminAcademy';
import AdminAcademyIntelligence from '../components/admin/AdminAcademyIntelligence';
import AdminCommunity from '../components/admin/AdminCommunity';
import AdminPromoPopups from '../components/admin/AdminPromoPopups';
import AdminPublishingEntities from '../components/admin/AdminPublishingEntities';
import AdminCompetitions from '../components/admin/AdminCompetitions';
import AdminGenresTones from '../components/admin/AdminGenresTones';
import AdminInstitutions from '../components/admin/institutions/AdminInstitutions';
import AdminReferrals from '../components/admin/AdminReferrals';
import AdminAffiliates from '../components/admin/AdminAffiliates';
import AdminSupportTickets from '../components/admin/AdminSupportTickets';
import AdminBroadcast from '../components/admin/AdminBroadcast';

type Section =
  | 'overview' | 'users' | 'plans' | 'messages' | 'notifications'
  | 'publishers' | 'publishing-directory' | 'doooda' | 'plot-templates' | 'homepage' | 'project-types'
  | 'platform-settings' | 'branding' | 'tracking' | 'error-monitor'
  | 'security' | 'backup' | 'roles' | 'analytics' | 'academy' | 'academy-intelligence' | 'community' | 'promo-popups'
  | 'competitions' | 'genres-tones' | 'institutions' | 'referrals' | 'affiliates' | 'support-tickets' | 'broadcast';

interface MenuItem {
  id: Section;
  label: string;
  icon: string;
  group: string;
}

const MENU_GROUPS = [
  { id: 'main', label: 'Main' },
  { id: 'content', label: 'Content' },
  { id: 'system', label: 'System' },
  { id: 'admin', label: 'Administration' },
];

const MENU_ITEMS: MenuItem[] = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', group: 'main' },
  { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', group: 'main' },
  { id: 'users', label: 'User Management', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', group: 'main' },
  { id: 'plans', label: 'Plans & Tokens', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', group: 'main' },
  { id: 'academy', label: 'Academy', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', group: 'content' },
  { id: 'academy-intelligence', label: 'Academy Intelligence', icon: 'M13 10V3L4 14h7v7l9-11h-7z', group: 'content' },
  { id: 'community', label: 'Community', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', group: 'content' },
  { id: 'homepage', label: 'Homepage Content', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', group: 'content' },
  { id: 'promo-popups', label: 'Promo Popups', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', group: 'content' },
  { id: 'plot-templates', label: 'Plot Templates', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', group: 'content' },
  { id: 'publishing-directory', label: 'Publishing Directory', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', group: 'content' },
  { id: 'competitions', label: 'Competitions', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', group: 'content' },
  { id: 'institutions', label: 'Institutional Accounts', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', group: 'content' },
  { id: 'referrals', label: 'Referral Program', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7', group: 'main' },
  { id: 'affiliates', label: 'Affiliate Program', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', group: 'main' },
  { id: 'support-tickets', label: 'Support Tickets', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', group: 'main' },
  { id: 'broadcast', label: 'Broadcast', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', group: 'main' },
  { id: 'genres-tones', label: 'Genres & Tones', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z', group: 'content' },
  { id: 'publishers', label: 'Publishers (Legacy)', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', group: 'content' },
  { id: 'doooda', label: 'Ask Doooda AI', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', group: 'content' },
  { id: 'messages', label: 'Email Templates', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', group: 'content' },
  { id: 'project-types', label: 'Project Types', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', group: 'content' },
  { id: 'platform-settings', label: 'Platform Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', group: 'system' },
  { id: 'branding', label: 'Branding', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', group: 'system' },
  { id: 'tracking', label: 'Tracking & Ads', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', group: 'system' },
  { id: 'notifications', label: 'SMTP Settings', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', group: 'system' },
  { id: 'error-monitor', label: 'Error Monitor', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', group: 'system' },
  { id: 'security', label: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', group: 'system' },
  { id: 'backup', label: 'Backup & Export', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', group: 'system' },
  { id: 'roles', label: 'Admin Roles', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', group: 'admin' },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <aside
        className="min-h-screen border-r flex flex-col transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          width: sidebarCollapsed ? '64px' : '240px',
          flexShrink: 0,
        }}
      >
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>Admin Panel</h1>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{user?.email}</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg shrink-0"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {MENU_GROUPS.map(group => {
            const items = MENU_ITEMS.filter(i => i.group === group.id);
            return (
              <div key={group.id} className="mb-4">
                {!sidebarCollapsed && (
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    {group.label}
                  </p>
                )}
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: activeSection === item.id ? 'var(--color-accent)' : 'transparent',
                      color: activeSection === item.id ? '#fff' : 'var(--color-text-secondary)',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    }}
                    onMouseEnter={e => { if (activeSection !== item.id) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover, var(--color-bg-secondary))'; }}
                    onMouseLeave={e => { if (activeSection !== item.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleSignOut}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              color: 'var(--color-error)',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto min-w-0">
        {activeSection === 'overview' && <AdminOverview />}
        {activeSection === 'analytics' && <AdminAnalytics />}
        {activeSection === 'users' && <AdminUsers />}
        {activeSection === 'plans' && <AdminPlans />}
        {activeSection === 'messages' && <AdminMessages />}
        {activeSection === 'notifications' && <AdminNotifications />}
        {activeSection === 'doooda' && <AdminDoooda />}
        {activeSection === 'plot-templates' && <AdminPlotTemplates />}
        {activeSection === 'publishing-directory' && <AdminPublishingEntities />}
        {activeSection === 'publishers' && <AdminPublishers />}
        {activeSection === 'homepage' && <AdminHomepage />}
        {activeSection === 'project-types' && <AdminProjectTypes />}
        {activeSection === 'platform-settings' && <AdminPlatformSettings />}
        {activeSection === 'branding' && <AdminBranding />}
        {activeSection === 'tracking' && <AdminTracking />}
        {activeSection === 'error-monitor' && <AdminErrorMonitor />}
        {activeSection === 'security' && <AdminSecurity />}
        {activeSection === 'backup' && <AdminBackup />}
        {activeSection === 'roles' && <AdminRoles />}
        {activeSection === 'academy' && <AdminAcademy />}
        {activeSection === 'academy-intelligence' && <AdminAcademyIntelligence />}
        {activeSection === 'community' && <AdminCommunity />}
        {activeSection === 'promo-popups' && <AdminPromoPopups />}
        {activeSection === 'competitions' && <AdminCompetitions />}
        {activeSection === 'genres-tones' && <AdminGenresTones />}
        {activeSection === 'institutions' && <AdminInstitutions />}
        {activeSection === 'referrals' && <AdminReferrals />}
        {activeSection === 'affiliates' && <AdminAffiliates />}
        {activeSection === 'support-tickets' && <AdminSupportTickets />}
        {activeSection === 'broadcast' && <AdminBroadcast />}
      </main>
    </div>
  );
}
