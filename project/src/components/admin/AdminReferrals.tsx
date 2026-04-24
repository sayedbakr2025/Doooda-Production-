import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ReferralStats {
  total_referrals: number;
  completed: number;
  pending: number;
  tokens_distributed: number;
  top_referrers: TopReferrer[];
}

interface TopReferrer {
  pen_name: string;
  email: string;
  referral_count: number;
}

interface ReferralRow {
  id: string;
  referral_code: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  reward_granted: boolean;
  referrer_pen_name?: string;
  referrer_email?: string;
  referred_pen_name?: string;
  referred_email?: string;
}

export default function AdminReferrals() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const { data: statsData, error: statsErr } = await supabase.rpc('get_referral_admin_stats');
      if (statsErr) throw statsErr;
      setStats(statsData as ReferralStats);

      const { data: rows, error: rowsErr } = await supabase
        .from('referrals')
        .select('id, referral_code, status, created_at, completed_at, reward_granted, referrer_user_id, referred_user_id')
        .order('created_at', { ascending: false })
        .limit(200);

      if (rowsErr) throw rowsErr;

      const enriched: ReferralRow[] = await Promise.all(
        (rows || []).map(async (r: any) => {
          const [refrerRes, refredRes] = await Promise.all([
            r.referrer_user_id
              ? supabase.from('users').select('pen_name, email').eq('id', r.referrer_user_id).maybeSingle()
              : Promise.resolve({ data: null }),
            r.referred_user_id
              ? supabase.from('users').select('pen_name, email').eq('id', r.referred_user_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          return {
            id: r.id,
            referral_code: r.referral_code,
            status: r.status,
            created_at: r.created_at,
            completed_at: r.completed_at,
            reward_granted: r.reward_granted,
            referrer_pen_name: refrerRes.data?.pen_name || '',
            referrer_email: refrerRes.data?.email || '',
            referred_pen_name: refredRes.data?.pen_name || '',
            referred_email: refredRes.data?.email || '',
          };
        })
      );

      setReferrals(enriched);
    } catch (e: any) {
      setError(e.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'var(--color-success)';
    if (s === 'pending') return '#d97706';
    return 'var(--color-error)';
  };

  const filtered = referrals.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Referral Program</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Monitor and manage writer referrals</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Referrals', value: stats.total_referrals, color: '#3b82f6' },
                { label: 'Completed', value: stats.completed, color: 'var(--color-success)' },
                { label: 'Pending', value: stats.pending, color: '#d97706' },
                { label: 'Tokens Distributed', value: stats.tokens_distributed.toLocaleString(), color: 'var(--color-accent)' },
              ].map((c, i) => (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top referrers */}
          {stats && stats.top_referrers && stats.top_referrers.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="px-4 py-3" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Top Referrers</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Writer</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_referrers.map((tr, i) => (
                    <tr key={i} style={{ borderBottom: i < stats.top_referrers.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-surface)' }}>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{tr.pen_name || '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{tr.email}</p>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-accent)' }}>{tr.referral_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Referrals table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                All Referrals ({filtered.length})
              </h3>
              <div className="flex gap-1.5">
                {(['all', 'completed', 'pending'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors"
                    style={{
                      backgroundColor: statusFilter === f ? 'var(--color-accent)' : 'transparent',
                      color: statusFilter === f ? '#fff' : 'var(--color-text-secondary)',
                      border: `1px solid ${statusFilter === f ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Referrer</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Referred</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Code</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Date</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Status</th>
                    <th className="px-4 py-2.5 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                        No referrals found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-surface)' }}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.referrer_pen_name || '—'}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{r.referrer_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.referred_pen_name || '—'}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{r.referred_email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.referral_code}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{fmt(r.created_at)}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: `${statusColor(r.status)}18`, color: statusColor(r.status) }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: r.reward_granted ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                          {r.reward_granted ? '+20,000' : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
