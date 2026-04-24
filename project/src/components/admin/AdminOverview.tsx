import { useEffect, useState } from 'react';
import { supabase } from '../../services/api';

interface DashboardStats {
  total_users: number;
  active_users: number;
  free_users: number;
  paid_users: number;
  admin_users: number;
  active_projects: number;
  total_doooda_requests: number;
  doooda_errors: number;
  doooda_today: number;
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg shadow p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-light)' }}>
      <div className="text-sm mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');
      if (rpcError) throw rpcError;
      setStats(data as DashboardStats);
    } catch {
      setError('Failed to load some dashboard statistics. Other sections remain accessible.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading statistics...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>Dashboard Overview</h2>

      {error && (
        <div
          className="rounded-lg p-4 mb-6 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Writers" value={stats?.total_users ?? 0} color="var(--color-text-primary)" />
        <StatCard label="Active Users" value={stats?.active_users ?? 0} color="var(--color-success)" />
        <StatCard label="Free Users" value={stats?.free_users ?? 0} color="var(--color-info)" />
        <StatCard label="Paid Users" value={stats?.paid_users ?? 0} color="var(--color-success)" />
        <StatCard label="Admin Users" value={stats?.admin_users ?? 0} color="var(--color-text-secondary)" />
        <StatCard label="Active Projects" value={stats?.active_projects ?? 0} color="var(--color-info)" />
      </div>

      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Ask Doooda Usage</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Requests" value={stats?.total_doooda_requests ?? 0} color="var(--color-text-primary)" />
        <StatCard label="Requests Today" value={stats?.doooda_today ?? 0} color="var(--color-info)" />
        <StatCard label="Errors" value={stats?.doooda_errors ?? 0} color={stats?.doooda_errors ? 'var(--color-error)' : 'var(--color-success)'} />
      </div>
    </div>
  );
}
