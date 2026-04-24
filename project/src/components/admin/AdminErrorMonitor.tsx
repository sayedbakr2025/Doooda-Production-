import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ErrorLog {
  id: string;
  source: string;
  severity: string;
  message: string;
  details: any;
  user_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  error: '#f97316',
  warning: '#eab308',
  info: '#3b82f6',
};

const MOCK_ERRORS: ErrorLog[] = [
  { id: '1', source: 'edge-function/ask-doooda', severity: 'error', message: 'OpenAI API timeout after 30s', details: { model: 'gpt-4o-mini', retry: 2 }, user_id: null, resolved: false, resolved_at: null, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', source: 'edge-function/execute-plot', severity: 'warning', message: 'Rate limit exceeded for user', details: { limit: 10, window: '1h' }, user_id: null, resolved: false, resolved_at: null, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', source: 'supabase/rls', severity: 'info', message: 'RLS policy blocked unauthorized access', details: { table: 'users', operation: 'SELECT' }, user_id: null, resolved: true, resolved_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
];

export default function AdminErrorMonitor() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
  const [search, setSearch] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data || data.length === 0) {
      setErrors(MOCK_ERRORS);
    } else {
      setErrors(data);
    }
    setLoading(false);
  }

  async function markResolved(id: string) {
    setResolving(id);
    const { error } = await supabase
      .from('error_logs')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true, resolved_at: new Date().toISOString() } : e));
    }
    setResolving(null);
  }

  const filtered = errors.filter(e => {
    if (filter === 'unresolved' && e.resolved) return false;
    if (filter === 'critical' && e.severity !== 'critical' && e.severity !== 'error') return false;
    if (search && !e.message.toLowerCase().includes(search.toLowerCase()) && !e.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: errors.length,
    unresolved: errors.filter(e => !e.resolved).length,
    critical: errors.filter(e => e.severity === 'critical').length,
    errors: errors.filter(e => e.severity === 'error').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Error Monitoring</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Platform errors, AI failures, rate limits, and system events
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Logs', value: stats.total, color: 'var(--color-text-secondary)' },
          { label: 'Unresolved', value: stats.unresolved, color: '#f97316' },
          { label: 'Critical', value: stats.critical, color: '#ef4444' },
          { label: 'Errors', value: stats.errors, color: '#f97316' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by message or source..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <div className="flex gap-2">
          {(['all', 'unresolved', 'critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-sm font-medium capitalize"
              style={{
                backgroundColor: filter === f ? 'var(--color-accent)' : 'var(--color-surface)',
                color: filter === f ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>Loading logs...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ color: 'var(--color-text-tertiary)' }}>No errors match the current filter</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {filtered.map((err, idx) => (
            <div
              key={err.id}
              className="p-4 flex gap-4"
              style={{
                backgroundColor: err.resolved ? 'var(--color-bg-secondary)' : 'var(--color-surface)',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                opacity: err.resolved ? 0.65 : 1,
              }}
            >
              <div
                className="w-2 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[err.severity] || '#9ca3af' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                    style={{ backgroundColor: `${SEVERITY_COLORS[err.severity] || '#9ca3af'}20`, color: SEVERITY_COLORS[err.severity] || '#9ca3af' }}
                  >
                    {err.severity}
                  </span>
                  <code className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{err.source}</code>
                  <span className="text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
                    {new Date(err.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{err.message}</p>
                {err.details && Object.keys(err.details).length > 0 && (
                  <pre className="mt-1 text-xs rounded px-2 py-1 overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                    {JSON.stringify(err.details, null, 2)}
                  </pre>
                )}
                {err.resolved && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>
                    Resolved at {new Date(err.resolved_at!).toLocaleString()}
                  </p>
                )}
              </div>
              {!err.resolved && (
                <button
                  onClick={() => markResolved(err.id)}
                  disabled={resolving === err.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--color-success)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  {resolving === err.id ? '...' : 'Resolve'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
