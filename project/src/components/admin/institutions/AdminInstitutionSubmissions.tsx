import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface Submission {
  id: string;
  work_title: string;
  status: string;
  created_at: string;
  competition_title?: string;
  institution_name?: string;
  user_email?: string;
  file_url?: string;
}

export default function AdminInstitutionSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Submission | null>(null);

  async function load() {
    setLoading(true);
    const { data: subs } = await supabase
      .from('competition_submissions')
      .select('id,work_title,status,created_at,file_url,competition_id,user_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!subs) { setLoading(false); return; }

    const competitionIds = [...new Set(subs.map(s => s.competition_id).filter(Boolean))];
    const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))];

    let compMap: Record<string, { title: string; partner_id: string | null }> = {};
    let institutionMap: Record<string, string> = {};
    let userMap: Record<string, string> = {};

    if (competitionIds.length > 0) {
      const { data: comps } = await supabase
        .from('competitions')
        .select('id,title_ar,title_en,partner_id')
        .in('id', competitionIds);
      if (comps) {
        comps.forEach(c => { compMap[c.id] = { title: c.title_ar || c.title_en || '—', partner_id: c.partner_id }; });
        const instIds = [...new Set(comps.filter(c => c.partner_id).map(c => c.partner_id as string))];
        if (instIds.length > 0) {
          const { data: insts } = await supabase.from('institutional_accounts').select('id,name').in('id', instIds);
          if (insts) insts.forEach(i => { institutionMap[i.id] = i.name; });
        }
      }
    }

    if (userIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id,email').in('id', userIds);
      if (users) users.forEach(u => { userMap[u.id] = u.email; });
    }

    setSubmissions(subs.map(s => ({
      ...s,
      competition_title: compMap[s.competition_id]?.title,
      institution_name: compMap[s.competition_id]?.partner_id ? institutionMap[compMap[s.competition_id].partner_id!] : undefined,
      user_email: userMap[s.user_id],
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function flagSubmission(id: string) {
    setProcessing(id);
    await supabase.from('competition_submissions').update({ status: 'flagged' }).eq('id', id);
    await load();
    setProcessing(null);
  }

  async function removeSubmission(id: string) {
    setProcessing(id);
    await supabase.from('competition_submissions').delete().eq('id', id);
    setConfirmRemove(null);
    await load();
    setProcessing(null);
  }

  const STATUS_META: Record<string, { color: string; bg: string }> = {
    submitted: { color: '#2563eb', bg: 'rgba(59,130,246,0.08)' },
    reviewed: { color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
    flagged: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  };

  const filtered = submissions.filter(s =>
    !search || s.work_title?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.competition_title?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Competition Submissions</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{filtered.length} submission{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 min-w-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="rounded-xl px-3 py-2 text-sm w-56"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <button onClick={load} className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>
          <p className="text-sm">No submissions found</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Work Title', 'Writer', 'Competition', 'Institution', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const sm = STATUS_META[s.status] || STATUS_META.submitted;
                  return (
                    <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-surface)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        <div className="max-w-[160px] truncate">{s.work_title || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.user_email || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <div className="max-w-[140px] truncate">{s.competition_title || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.institution_name || <span style={{ color: 'var(--color-text-tertiary)' }}>Admin</span>}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap" style={{ backgroundColor: sm.bg, color: sm.color }}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {s.file_url && (
                            <a href={s.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>
                              View
                            </a>
                          )}
                          {s.status !== 'flagged' && (
                            <button onClick={() => flagSubmission(s.id)} disabled={processing === s.id}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
                              Flag
                            </button>
                          )}
                          <button onClick={() => setConfirmRemove(s)} disabled={processing === s.id}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Remove Submission</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Remove <strong>"{confirmRemove.work_title}"</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => removeSubmission(confirmRemove.id)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#dc2626', color: 'white' }}>Remove</button>
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
