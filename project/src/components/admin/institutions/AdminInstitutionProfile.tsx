import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AdminInstitutionTokenModal from './AdminInstitutionTokenModal';

interface Institution {
  id: string;
  name: string;
  institution_type: string;
  country: string;
  city: string;
  email: string;
  website: string;
  description: string;
  tokens_balance: number;
  total_tokens_spent: number;
  status: string;
  created_at: string;
}

interface TokenLog {
  id: string;
  action: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  note: string;
  created_at: string;
}

interface Props {
  institution: Institution;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AdminInstitutionProfile({ institution: initData, onClose, onRefresh }: Props) {
  const [institution, setInstitution] = useState(initData);
  const [stats, setStats] = useState({ competitions_count: 0, submissions_count: 0, total_tokens_purchased: 0 });
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tab, setTab] = useState<'info' | 'activity' | 'tokens'>('info');

  useEffect(() => {
    async function load() {
      const [{ data: st }, { data: lg }] = await Promise.all([
        supabase.rpc('get_institution_stats', { p_institution_id: institution.id }),
        supabase
          .from('institution_token_logs')
          .select('*')
          .eq('institution_id', institution.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (st && st[0]) setStats(st[0]);
      if (lg) setLogs(lg);
    }
    load();
  }, [institution.id]);

  async function refreshInstitution() {
    const { data } = await supabase
      .from('institutional_accounts')
      .select('*')
      .eq('id', institution.id)
      .maybeSingle();
    if (data) setInstitution(data);
    onRefresh();
  }

  const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
    approved: { color: '#16a34a', bg: 'rgba(34,197,94,0.08)', label: 'Approved' },
    pending: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', label: 'Pending' },
    suspended: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', label: 'Suspended' },
    rejected: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Rejected' },
  };
  const sm = statusMeta[institution.status] || statusMeta.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>{institution.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sm.bg, color: sm.color }}>{sm.label}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{institution.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {(['info', 'activity', 'tokens'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium capitalize"
              style={{ color: tab === t ? 'var(--color-accent)' : 'var(--color-text-secondary)', borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent' }}>
              {t === 'info' ? 'Info' : t === 'activity' ? 'Activity' : 'Token Logs'}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Type', value: institution.institution_type },
                  { label: 'Country', value: institution.country || '—' },
                  { label: 'City', value: institution.city || '—' },
                  { label: 'Website', value: institution.website || '—' },
                  { label: 'Joined', value: new Date(institution.created_at).toLocaleDateString() },
                  { label: 'Token Balance', value: institution.tokens_balance.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
                    <p className="mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>
              {institution.description && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Description</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{institution.description}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Token Balance', value: institution.tokens_balance.toLocaleString(), color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
                { label: 'Tokens Spent', value: institution.total_tokens_spent.toLocaleString(), color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
                { label: 'Tokens Purchased', value: Number(stats.total_tokens_purchased).toLocaleString(), color: '#2563eb', bg: 'rgba(59,130,246,0.08)' },
                { label: 'Competitions', value: stats.competitions_count, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
                { label: 'Submissions Received', value: stats.submissions_count, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: s.bg, border: `1px solid ${s.color}25` }}>
                  <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'tokens' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Token Change History</p>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  Manage Tokens
                </button>
              </div>
              {logs.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No token logs yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => {
                    const colors = { add: '#16a34a', remove: '#dc2626', reset: '#d97706' };
                    const c = colors[log.action as keyof typeof colors] || '#6b7280';
                    return (
                      <div key={log.id} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold capitalize px-2 py-0.5 rounded-full" style={{ backgroundColor: `${c}15`, color: c }}>{log.action}</span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{log.amount.toLocaleString()} tokens</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                            {log.balance_before.toLocaleString()} → {log.balance_after.toLocaleString()}
                            {log.note ? ` · ${log.note}` : ''}
                          </p>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showTokenModal && (
        <AdminInstitutionTokenModal
          institution={institution}
          onClose={() => setShowTokenModal(false)}
          onDone={refreshInstitution}
        />
      )}
    </div>
  );
}
