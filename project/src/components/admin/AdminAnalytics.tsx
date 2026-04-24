import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AnalyticsData {
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  newThisMonth: number;
  totalProjects: number;
  completedProjects: number;
  totalAiRequests: number;
  aiRequestsToday: number;
  aiErrors: number;
  topProjectType: string;
  usersByPlan: Record<string, number>;
  recentActivity: Array<{ date: string; requests: number }>;
}

interface Stat {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: string;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ai'>('overview');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, projectsRes, aiRes] = await Promise.all([
        supabase.from('users').select('id,plan_name,is_active,created_at,last_sign_in_at').is('deleted_at', null),
        supabase.from('projects').select('id,project_type,progress_percentage,created_at').is('deleted_at', null),
        supabase.from('ai_usage_logs').select('id,feature,success,created_at').order('created_at', { ascending: false }).limit(1000),
      ]);

      const users = usersRes.data || [];
      const projects = projectsRes.data || [];
      const aiLogs = aiRes.data || [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const byPlan: Record<string, number> = {};
      users.forEach(u => { byPlan[u.plan_name || 'FREE'] = (byPlan[u.plan_name || 'FREE'] || 0) + 1; });

      const projectTypeCounts: Record<string, number> = {};
      projects.forEach(p => { projectTypeCounts[p.project_type] = (projectTypeCounts[p.project_type] || 0) + 1; });
      const topType = Object.entries(projectTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - i * 86400000);
        const dateStr = d.toISOString().split('T')[0];
        const count = aiLogs.filter(l => l.created_at?.startsWith(dateStr)).length;
        return { date: dateStr, requests: count };
      }).reverse();

      setData({
        totalUsers: users.length,
        freeUsers: users.filter(u => !u.plan_name || u.plan_name === 'FREE').length,
        paidUsers: users.filter(u => u.plan_name && u.plan_name !== 'FREE').length,
        activeToday: users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= todayStart).length,
        activeWeek: users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= weekStart).length,
        activeMonth: users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= monthStart).length,
        newThisMonth: users.filter(u => u.created_at >= monthStart).length,
        totalProjects: projects.length,
        completedProjects: projects.filter(p => p.progress_percentage >= 100).length,
        totalAiRequests: aiLogs.length,
        aiRequestsToday: aiLogs.filter(l => l.created_at >= todayStart).length,
        aiErrors: aiLogs.filter(l => !l.success).length,
        topProjectType: topType,
        usersByPlan: byPlan,
        recentActivity: last7Days,
      });
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  if (loading) return <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>Loading analytics...</div>;
  if (!data) return <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>Failed to load analytics</div>;

  const conversionRate = data.totalUsers > 0 ? ((data.paidUsers / data.totalUsers) * 100).toFixed(1) : '0';
  const completionRate = data.totalProjects > 0 ? ((data.completedProjects / data.totalProjects) * 100).toFixed(1) : '0';
  const errorRate = data.totalAiRequests > 0 ? ((data.aiErrors / data.totalAiRequests) * 100).toFixed(1) : '0';

  const overviewStats: Stat[] = [
    { label: 'Total Users', value: data.totalUsers, sub: `+${data.newThisMonth} this month`, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Paid Users', value: data.paidUsers, sub: `${conversionRate}% conversion`, color: 'var(--color-success)', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Active Today', value: data.activeToday, sub: `${data.activeWeek} this week`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Projects', value: data.totalProjects, sub: `${completionRate}% completed`, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'AI Requests', value: data.totalAiRequests, sub: `${data.aiRequestsToday} today`, icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { label: 'AI Error Rate', value: `${errorRate}%`, sub: `${data.aiErrors} total errors`, color: data.aiErrors > 0 ? 'var(--color-error)' : 'var(--color-success)', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const maxActivity = Math.max(...data.recentActivity.map(d => d.requests), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Analytics</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Platform metrics and usage statistics</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['overview', 'users', 'ai'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 rounded-lg text-sm font-medium capitalize" style={{ backgroundColor: activeTab === tab ? 'var(--color-accent)' : 'var(--color-surface)', color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            {tab === 'ai' ? 'AI Metrics' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {overviewStats.map(stat => (
              <div key={stat.label} className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>{stat.label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                    <svg className="w-4 h-4" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold" style={{ color: stat.color || 'var(--color-text-primary)' }}>{stat.value}</p>
                {stat.sub && <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{stat.sub}</p>}
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>AI Activity (Last 7 Days)</h3>
            <div className="flex items-end gap-2 h-32">
              {data.recentActivity.map(day => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{day.requests}</span>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(4, (day.requests / maxActivity) * 100)}px`,
                      backgroundColor: 'var(--color-accent)',
                      opacity: 0.8,
                    }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Users by Plan</h3>
            <div className="space-y-3">
              {Object.entries(data.usersByPlan).map(([plan, count]) => (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{plan}</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{count} ({data.totalUsers > 0 ? ((count / data.totalUsers) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${data.totalUsers > 0 ? (count / data.totalUsers) * 100 : 0}%`, backgroundColor: 'var(--color-accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Engagement</h3>
            <div className="space-y-4">
              {[
                { label: 'Active Today', value: data.activeToday, total: data.totalUsers },
                { label: 'Active This Week', value: data.activeWeek, total: data.totalUsers },
                { label: 'Active This Month', value: data.activeMonth, total: data.totalUsers },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%`, backgroundColor: 'var(--color-success)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl col-span-2" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Quick Stats</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Free Users', value: data.freeUsers },
                { label: 'Paid Users', value: data.paidUsers },
                { label: 'Conversion Rate', value: `${conversionRate}%` },
                { label: 'New This Month', value: data.newThisMonth },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total AI Requests', value: data.totalAiRequests, icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', color: undefined },
            { label: 'Requests Today', value: data.aiRequestsToday, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'var(--color-accent)' },
            { label: 'Total Errors', value: data.aiErrors, icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: data.aiErrors > 0 ? 'var(--color-error)' : 'var(--color-success)' },
            { label: 'Error Rate', value: `${errorRate}%`, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: Number(errorRate) > 5 ? 'var(--color-error)' : 'var(--color-success)' },
          ].map(stat => (
            <div key={stat.label} className="p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{stat.label}</p>
              </div>
              <p className="text-4xl font-bold" style={{ color: stat.color || 'var(--color-text-primary)' }}>{stat.value}</p>
            </div>
          ))}

          <div className="col-span-2 p-5 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Top Project Type</h3>
            <p className="text-2xl font-bold capitalize" style={{ color: 'var(--color-accent)' }}>
              {data.topProjectType.replace(/_/g, ' ')}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Most commonly created project type</p>
          </div>
        </div>
      )}
    </div>
  );
}
