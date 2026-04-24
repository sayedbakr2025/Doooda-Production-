import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Globe, MapPin, Mail, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface Application {
  id: string;
  name: string;
  institution_type: string;
  country: string;
  email: string;
  website: string;
  description: string;
  created_at: string;
  status: string;
}

interface Props {
  onRefresh: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  publisher: 'Publisher',
  production_company: 'Production Co.',
  literary_agency: 'Literary Agency',
  education: 'Education',
  other: 'Other',
};

export default function AdminInstitutionApplications({ onRefresh }: Props) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('institutional_accounts')
      .select('id,name,institution_type,country,email,website,description,created_at,status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setApps(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    setProcessing(id);
    await supabase
      .from('institutional_accounts')
      .update({ status: 'approved', is_active: true, tokens_balance: 100000, rejection_reason: '' })
      .eq('id', id);
    await load();
    onRefresh();
    setProcessing(null);
  }

  async function reject(id: string) {
    setProcessing(id);
    await supabase
      .from('institutional_accounts')
      .update({ status: 'rejected', is_active: false, rejection_reason: rejectReason })
      .eq('id', id);
    setRejectModal(null);
    setRejectReason('');
    await load();
    onRefresh();
    setProcessing(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Pending Applications</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {apps.length} awaiting review
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80"
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

      {apps.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(34,197,94,0.08)' }}
          >
            <CheckCircle className="w-7 h-7" style={{ color: '#16a34a' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>All caught up!</p>
          <p className="text-xs mt-1">No pending applications to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map(app => (
            <div
              key={app.id}
              className="rounded-2xl p-5 transition-all"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                    >
                      {app.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {app.name}
                        </h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: 'rgba(59,130,246,0.1)',
                            color: '#2563eb',
                            border: '1px solid rgba(59,130,246,0.2)',
                          }}
                        >
                          {TYPE_LABELS[app.institution_type] || app.institution_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                      <span className="truncate">{app.email}</span>
                    </div>
                    {app.country && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                        <span>{app.country}</span>
                      </div>
                    )}
                    {app.website && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                        <span className="truncate">{app.website}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {app.description && (
                    <p
                      className="text-xs leading-relaxed line-clamp-2 px-3 py-2 rounded-xl"
                      style={{
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--color-bg-secondary)',
                      }}
                    >
                      {app.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0 items-start">
                  <button
                    onClick={() => approve(app.id)}
                    disabled={processing === app.id}
                    className="text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                  >
                    {processing === app.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: app.id, name: app.name })}
                    disabled={processing === app.id}
                    className="text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      backgroundColor: 'rgba(220,38,38,0.08)',
                      color: '#dc2626',
                      border: '1px solid rgba(220,38,38,0.2)',
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Reject Application</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Rejecting: <strong>{rejectModal.name}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => reject(rejectModal.id)}
                disabled={processing === rejectModal.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                Confirm Reject
              </button>
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
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
