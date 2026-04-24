import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface Competition {
  id: string;
  title_ar: string;
  title_en: string;
  start_date: string;
  end_date: string;
  prize: string;
  approval_status: string;
  created_by_partner: boolean;
  partner_id: string | null;
  created_at: string;
  boost_enabled: boolean;
  boost_tokens_spent: number;
  boost_budget_tokens: number;
  institution_name?: string;
}

interface Props {
  mode: 'approval' | 'monitoring';
}

const APPROVAL_STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  approved: { color: '#16a34a', bg: 'rgba(34,197,94,0.08)', label: 'Approved' },
  pending: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', label: 'Pending' },
  rejected: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', label: 'Rejected' },
};

export default function AdminInstitutionCompetitions({ mode }: Props) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'partner'>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase
      .from('competitions')
      .select('id,title_ar,title_en,start_date,end_date,prize,approval_status,created_by_partner,partner_id,created_at,boost_enabled,boost_tokens_spent,boost_budget_tokens')
      .order('created_at', { ascending: false });

    if (mode === 'approval') q = q.eq('created_by_partner', true).eq('approval_status', 'pending');

    const { data } = await q;
    if (!data) { setLoading(false); return; }

    const institutionIds = [...new Set(data.filter(c => c.partner_id).map(c => c.partner_id as string))];
    let institutionMap: Record<string, string> = {};
    if (institutionIds.length > 0) {
      const { data: insts } = await supabase
        .from('institutional_accounts')
        .select('id,name')
        .in('id', institutionIds);
      if (insts) insts.forEach(i => { institutionMap[i.id] = i.name; });
    }

    setCompetitions(data.map(c => ({ ...c, institution_name: c.partner_id ? institutionMap[c.partner_id] : undefined })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [mode]);

  async function approve(id: string) {
    setProcessing(id);
    await supabase.from('competitions').update({ approval_status: 'approved' }).eq('id', id);
    await load();
    setProcessing(null);
  }

  async function reject(id: string) {
    setProcessing(id);
    await supabase.from('competitions').update({ approval_status: 'rejected' }).eq('id', id);
    setRejectModal(null);
    await load();
    setProcessing(null);
  }

  const filtered = competitions.filter(c => {
    if (filter === 'admin') return !c.created_by_partner;
    if (filter === 'partner') return c.created_by_partner;
    return true;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {mode === 'approval' ? 'Competitions Awaiting Approval' : 'All Competitions'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{filtered.length} competition{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {mode === 'monitoring' && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            {(['all', 'admin', 'partner'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                style={{ backgroundColor: filter === f ? 'var(--color-accent)' : 'transparent', color: filter === f ? 'white' : 'var(--color-text-secondary)' }}>
                {f === 'all' ? 'All' : f === 'admin' ? 'Admin' : 'Partner'}
              </button>
            ))}
          </div>
        )}
        <button onClick={load} className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm">{mode === 'approval' ? 'No competitions pending approval' : 'No competitions found'}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Competition', 'Institution', 'Prize', 'Start', 'End', 'Boost', 'Status', ...(mode === 'approval' ? ['Actions'] : [])].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const sm = APPROVAL_STATUS_META[c.approval_status] || APPROVAL_STATUS_META.pending;
                  const title = c.title_ar || c.title_en || '—';
                  return (
                    <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-surface)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        <div className="max-w-[180px] truncate">{title}</div>
                        {c.created_by_partner && <span className="text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>Partner</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.institution_name || (c.created_by_partner ? '—' : 'Admin')}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.prize || '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {c.boost_enabled ? (
                          <span className="font-medium" style={{ color: '#d97706' }}>{c.boost_tokens_spent.toLocaleString()} / {c.boost_budget_tokens.toLocaleString()}</span>
                        ) : <span style={{ color: 'var(--color-text-tertiary)' }}>Off</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: sm.bg, color: sm.color }}>{sm.label}</span>
                      </td>
                      {mode === 'approval' && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => approve(c.id)} disabled={processing === c.id}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                              Approve
                            </button>
                            <button onClick={() => setRejectModal(c.id)} disabled={processing === c.id}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Reject Competition</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>This competition will be rejected and hidden from writers.</p>
            <div className="flex gap-2">
              <button onClick={() => reject(rejectModal)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#dc2626', color: 'white' }}>Confirm Reject</button>
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
