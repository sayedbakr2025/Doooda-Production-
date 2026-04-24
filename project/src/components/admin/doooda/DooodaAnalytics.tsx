import { useEffect, useState } from 'react';
import { supabase } from '../../../services/api';

interface Analytics {
  total_requests: number;
  today_requests: number;
  month_requests: number;
  active_users_this_month: number;
  provider_distribution: Array<{ provider: string; count: number }>;
  plan_distribution: Array<{ plan: string; count: number }>;
  filtered_this_month: number;
  rate_limited_this_month: number;
}

export default function DooodaAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: result, error: err } = await supabase.rpc('get_doooda_analytics');
      if (err) throw err;
      if (result?.error) {
        setError(result.error);
        return;
      }
      setData(result);
    } catch (err) {
      console.error('Failed to load analytics', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!data) return null;

  const maxProviderCount = Math.max(...(data.provider_distribution.map(p => p.count) || [1]), 1);
  const maxPlanCount = Math.max(...(data.plan_distribution.map(p => p.count) || [1]), 1);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ask Doooda Analytics</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Aggregated usage data. No raw conversations are stored or displayed.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Requests" value={data.total_requests.toLocaleString()} />
        <StatCard label="Today" value={data.today_requests.toLocaleString()} />
        <StatCard label="This Month" value={data.month_requests.toLocaleString()} />
        <StatCard label="Active Users (Month)" value={data.active_users_this_month.toLocaleString()} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Filtered (Month)" value={data.filtered_this_month.toLocaleString()} accent="amber" />
        <StatCard label="Rate Limited (Month)" value={data.rate_limited_this_month.toLocaleString()} accent="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Provider Usage (This Month)</h4>
          {data.provider_distribution.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.provider_distribution.map((p) => (
                <div key={p.provider}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{p.provider}</span>
                    <span className="text-gray-500 dark:text-gray-400">{p.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(p.count / maxProviderCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Usage by Plan (This Month)</h4>
          {data.plan_distribution.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.plan_distribution.map((p) => (
                <div key={p.plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{p.plan}</span>
                    <span className="text-gray-500 dark:text-gray-400">{p.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(p.count / maxPlanCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'red' }) {
  const bgColor = accent === 'amber'
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : accent === 'red'
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';

  return (
    <div className={`rounded-lg shadow p-4 border ${bgColor}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
