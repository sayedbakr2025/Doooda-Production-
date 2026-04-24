import { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import AdminInstitutionProfile from './AdminInstitutionProfile';
import AdminInstitutionTokenModal from './AdminInstitutionTokenModal';

interface Institution {
  id: string;
  name: string;
  institution_type: string;
  country: string;
  email: string;
  tokens_balance: number;
  total_tokens_spent: number;
  status: string;
  is_active: boolean;
  created_at: string;
  city: string;
  website: string;
  description: string;
  rejection_reason: string;
}

interface Props {
  onRefresh: () => void;
}

const STATUS_FILTERS = ['all', 'approved', 'suspended', 'rejected'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  approved: { color: '#16a34a', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', label: 'Approved' },
  pending: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)', label: 'Pending' },
  suspended: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', label: 'Suspended' },
  rejected: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', label: 'Rejected' },
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  approved: 'Approved',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

export default function AdminInstitutionList({ onRefresh }: Props) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedProfile, setSelectedProfile] = useState<Institution | null>(null);
  const [tokenTarget, setTokenTarget] = useState<Institution | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Institution | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Institution | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('institutional_accounts')
      .select('id,name,institution_type,country,city,email,website,description,tokens_balance,total_tokens_spent,status,is_active,created_at,rejection_reason')
      .neq('status', 'pending')
      .order('created_at', { ascending: false });
    setInstitutions(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function suspend(inst: Institution) {
    setProcessing(inst.id);
    await supabase.from('institutional_accounts').update({ status: 'suspended', is_active: false }).eq('id', inst.id);
    await load(); onRefresh();
    setProcessing(null);
  }

  async function reactivate(inst: Institution) {
    setProcessing(inst.id);
    await supabase.from('institutional_accounts').update({ status: 'approved', is_active: true }).eq('id', inst.id);
    await load(); onRefresh();
    setProcessing(null);
  }

  async function handleResetPassword() {
    if (!resetPasswordTarget || !newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const { data: hashData, error: hashError } = await supabase.functions.invoke('institution-auth', {
        body: { action: 'hash', password: newPassword },
      });
      if (hashError || !hashData?.hash) throw new Error('Hash error');
      const { error: updateError } = await supabase
        .from('institutional_accounts')
        .update({ password_hash: hashData.hash })
        .eq('id', resetPasswordTarget.id);
      if (updateError) throw new Error(updateError.message);
      setResetPasswordTarget(null);
      setNewPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Error');
    } finally {
      setResetLoading(false);
    }
  }

  async function deleteInstitution(inst: Institution) {
    setProcessing(inst.id);
    await supabase.from('institutional_accounts').delete().eq('id', inst.id);
    setConfirmDelete(null);
    await load(); onRefresh();
    setProcessing(null);
  }

  const filtered = institutions.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 left-3" style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: statusFilter === s ? 'var(--color-accent)' : 'transparent',
                color: statusFilter === s ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              {FILTER_LABELS[s]}
            </button>
          ))}
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
        {filtered.length} institution{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm">No institutions found</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Name', 'Type', 'Country', 'Email', 'Tokens', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst, i) => {
                  const sm = STATUS_META[inst.status] || STATUS_META.pending;
                  return (
                    <tr
                      key={inst.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                          >
                            {inst.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>{inst.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {inst.institution_type}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {inst.country || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {inst.email}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#16a34a' }}>
                        {inst.tokens_balance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ backgroundColor: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>
                        {new Date(inst.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => setSelectedProfile(inst)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563eb' }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => setTokenTarget(inst)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
                          >
                            Tokens
                          </button>
                          {inst.status === 'approved' ? (
                            <button
                              onClick={() => suspend(inst)}
                              disabled={processing === inst.id}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
                            >
                              Suspend
                            </button>
                          ) : inst.status === 'suspended' ? (
                            <button
                              onClick={() => reactivate(inst)}
                              disabled={processing === inst.id}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
                            >
                              Activate
                            </button>
                          ) : null}
                          <button
                            onClick={() => { setResetPasswordTarget(inst); setNewPassword(''); setResetError(''); }}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: '#d97706' }}
                          >
                            Password
                          </button>
                          <button
                            onClick={() => setConfirmDelete(inst)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(107,114,128,0.1)', color: '#6b7280' }}
                          >
                            Delete
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

      {selectedProfile && (
        <AdminInstitutionProfile
          institution={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onRefresh={() => { load(); onRefresh(); }}
        />
      )}

      {tokenTarget && (
        <AdminInstitutionTokenModal
          institution={tokenTarget}
          onClose={() => setTokenTarget(null)}
          onDone={() => { load(); onRefresh(); }}
        />
      )}

      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Reset Password</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>{resetPasswordTarget.name}</p>
            <input
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              dir="ltr"
            />
            {resetError && <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{resetError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: '#d97706', color: 'white' }}
              >
                {resetLoading ? 'Saving...' : 'Save Password'}
              </button>
              <button
                onClick={() => setResetPasswordTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete Institution</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteInstitution(confirmDelete)}
                disabled={processing === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
