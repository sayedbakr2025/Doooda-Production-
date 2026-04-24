import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface Stats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  rejected: number;
  total_competitions: number;
  total_submissions: number;
  total_tokens_balance: number;
}

interface TopInstitution {
  id: string;
  name: string;
  tokens_balance: number;
  total_tokens_spent: number;
  competitions_count: number;
}

interface FraudAlert {
  id: string;
  name: string;
  reason: string;
  value: number;
}

export default function AdminInstitutionAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topInstitutions, setTopInstitutions] = useState<TopInstitution[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { data: insts },
        { count: compCount },
        { count: subCount },
      ] = await Promise.all([
        supabase.from('institutional_accounts').select('id,name,status,tokens_balance,total_tokens_spent'),
        supabase.from('competitions').select('*', { count: 'exact', head: true }).eq('created_by_partner', true),
        supabase.from('competition_submissions').select('*', { count: 'exact', head: true }),
      ]);

      if (insts) {
        const total = insts.length;
        const active = insts.filter(i => i.status === 'approved').length;
        const pending = insts.filter(i => i.status === 'pending').length;
        const suspended = insts.filter(i => i.status === 'suspended').length;
        const rejected = insts.filter(i => i.status === 'rejected').length;
        const total_tokens_balance = insts.reduce((a, i) => a + (i.tokens_balance || 0), 0);

        setStats({ total, active, pending, suspended, rejected, total_tokens_balance, total_competitions: compCount || 0, total_submissions: subCount || 0 });

        const top = [...insts]
          .filter(i => i.status === 'approved')
          .sort((a, b) => (b.total_tokens_spent || 0) - (a.total_tokens_spent || 0))
          .slice(0, 5)
          .map(i => ({ id: i.id, name: i.name, tokens_balance: i.tokens_balance || 0, total_tokens_spent: i.total_tokens_spent || 0, competitions_count: 0 }));
        setTopInstitutions(top);

        const alerts: FraudAlert[] = [];
        for (const inst of insts) {
          if (inst.total_tokens_spent > 500000) {
            alerts.push({ id: inst.id, name: inst.name, reason: 'Very high token consumption', value: inst.total_tokens_spent });
          }
        }
        setFraudAlerts(alerts.slice(0, 10));
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} /></div>;
  if (!stats) return null;

  const statCards = [
    { label: 'Total Institutions', value: stats.total, color: '#2563eb', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Active', value: stats.active, color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Pending Approval', value: stats.pending, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'Suspended', value: stats.suspended, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
    { label: 'Partner Competitions', value: stats.total_competitions, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
    { label: 'Total Submissions', value: stats.total_submissions, color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
    { label: 'Collective Token Balance', value: stats.total_tokens_balance.toLocaleString(), color: '#16a34a', bg: 'rgba(34,197,94,0.06)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Institution Analytics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: s.bg, border: `1px solid ${s.color}25` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: s.color }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Top Institutions by Token Usage</h3>
          {topInstitutions.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>No data yet</p>
          ) : (
            <div className="space-y-3">
              {topInstitutions.map((inst, i) => (
                <div key={inst.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-5 shrink-0 text-center" style={{ color: 'var(--color-text-tertiary)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{inst.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {inst.total_tokens_spent.toLocaleString()} spent · {inst.tokens_balance.toLocaleString()} balance
                    </p>
                  </div>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: 'var(--color-accent)',
                        width: `${Math.min(100, (inst.total_tokens_spent / Math.max(1, topInstitutions[0].total_tokens_spent)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Status Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Active', count: stats.active, total: stats.total, color: '#16a34a' },
              { label: 'Pending', count: stats.pending, total: stats.total, color: '#d97706' },
              { label: 'Suspended', count: stats.suspended, total: stats.total, color: '#dc2626' },
              { label: 'Rejected', count: stats.rejected, total: stats.total, color: '#6b7280' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
                  <span className="font-semibold" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.color, width: `${s.total > 0 ? (s.count / s.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {fraudAlerts.length > 0 && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#dc2626' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Fraud & Abuse Alerts
          </h3>
          <div className="space-y-2">
            {fraudAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{alert.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{alert.reason}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: '#dc2626' }}>{alert.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
