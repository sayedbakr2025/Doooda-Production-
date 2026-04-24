import { useState, useEffect, useCallback } from 'react';
import {
  getTopics,
  getAllReports,
  resolveReport,
  softDeleteTopic,
  restoreTopic,
  softDeleteReply,
  adminUpdateTopic,
  warnUser,
  freezeUser,
  unfreezeUser,
  getUserModerationHistory,
  getAdminNotifications,
  markAllNotificationsRead,
  getPendingContent,
  setModerationStatus,
} from '../../services/communityApi';
import { supabase } from '../../lib/supabaseClient';
import type { CommunityTopic, CommunityReply, CommunityReport, CommunityUserAction, AdminNotification } from '../../services/communityApi';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  general:          { label: 'General',          color: '#3b82f6' },
  craft:            { label: 'Craft',            color: '#8b5cf6' },
  feedback:         { label: 'Feedback',         color: '#f59e0b' },
  request_feedback: { label: 'Request Feedback', color: '#f59e0b' },
  publishing:       { label: 'Publishing',       color: '#22c55e' },
  technical:        { label: 'Technical',        color: '#ef4444' },
};

type Tab = 'pending' | 'reports' | 'topics' | 'notifications';

export default function AdminCommunity() {
  const [tab, setTab] = useState<Tab>('pending');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    try {
      const [notifs, pending] = await Promise.all([
        getAdminNotifications(100),
        getPendingContent(),
      ]);
      setUnreadCount(notifs.filter((n) => !n.read).length);
      setPendingCount(pending.topics.length + pending.replies.length);
    } catch {}
  }

  const TAB_CONFIG: { id: Tab; label: string; badge?: number }[] = [
    { id: 'pending', label: 'Pending Review', badge: pendingCount },
    { id: 'reports', label: 'Reports' },
    { id: 'topics', label: 'Topics' },
    { id: 'notifications', label: 'Notifications', badge: unreadCount },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Community Management
        </h2>
      </div>

      <div className="flex gap-2 mb-6">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'notifications') setUnreadCount(0); }}
            className="relative px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: tab === t.id ? 'var(--color-accent)' : 'var(--color-surface)',
              color: tab === t.id ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${tab === t.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                style={{ backgroundColor: '#ef4444' }}
              >
                {t.badge > 99 ? '99+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingReviewManager onCountChange={setPendingCount} />}
      {tab === 'reports' && <ReportsManager />}
      {tab === 'topics' && <TopicsManager />}
      {tab === 'notifications' && <NotificationsPanel />}
    </div>
  );
}

function ReportsManager() {
  const { user } = useAuth();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    reportId: string;
    report: CommunityReport;
    mode: 'warn' | 'freeze';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await getAllReports());
    } catch (err) {
      console.error('[AdminCommunity] Load reports failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDeleteContent(report: CommunityReport) {
    if (!confirm(`Soft-delete this ${report.reported_content_type}?`)) return;
    try {
      if (report.reported_content_type === 'topic') {
        await softDeleteTopic(report.reported_content_id);
      } else {
        await softDeleteReply(report.reported_content_id);
      }
      await resolveReport(report.id, { action: 'deleted_content', note: 'Content removed by admin' });
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, resolved: true, admin_action: 'deleted_content' } : r));
    } catch (err) {
      console.error('[AdminCommunity] Delete content failed:', err);
    }
  }

  async function handleDismiss(report: CommunityReport) {
    try {
      await resolveReport(report.id, { action: 'dismissed', note: 'Dismissed by admin' });
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, resolved: true, admin_action: 'dismissed' } : r));
    } catch (err) {
      console.error('[AdminCommunity] Dismiss failed:', err);
    }
  }

  const filtered = reports.filter((r) => r.resolved === showResolved);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {reports.filter((r) => !r.resolved).length} open
        </div>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: showResolved ? 'var(--color-accent)' : 'var(--color-surface)',
            color: showResolved ? '#fff' : 'var(--color-text-secondary)',
            border: `1px solid ${showResolved ? 'var(--color-accent)' : 'var(--color-border)'}`,
          }}
        >
          {showResolved ? 'Show Open' : 'Show Resolved'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={showResolved ? 'No resolved reports' : 'No open reports'}
          subtitle={!showResolved ? 'No pending reports to review.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const isExpanded = expandedReport === report.id;
            const contentPreview = report.reported_content_type === 'topic'
              ? report.reported_topic?.title || '(topic deleted)'
              : report.reported_reply?.content?.slice(0, 100) || '(reply deleted)';
            const contentAuthorName = report.content_author?.name || report.content_author?.email?.split('@')[0] || 'Unknown';
            const reporterName = report.reporter?.name || report.reporter?.email?.split('@')[0] || 'Unknown';

            const ACTION_COLOR: Record<string, string> = {
              dismissed: '#6b7280',
              deleted_content: '#ef4444',
              resolved: '#22c55e',
              warned: '#f59e0b',
              frozen: '#3b82f6',
            };

            return (
              <div
                key={report.id}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${report.resolved ? 'var(--color-border)' : 'rgba(239,68,68,0.3)'}`,
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div
                  className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                          style={{
                            backgroundColor: report.reported_content_type === 'topic'
                              ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                            color: report.reported_content_type === 'topic' ? '#3b82f6' : '#f59e0b',
                          }}
                        >
                          {report.reported_content_type}
                        </span>
                        {report.admin_action && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold capitalize"
                            style={{
                              backgroundColor: `${ACTION_COLOR[report.admin_action] || '#6b7280'}18`,
                              color: ACTION_COLOR[report.admin_action] || '#6b7280',
                            }}
                          >
                            {report.admin_action.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {contentPreview}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        Reported by <span className="font-medium">{reporterName}</span>
                        {' · '}By <span className="font-medium">{contentAuthorName}</span>
                        {' · '}{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="px-4 pb-4 space-y-3"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <div className="pt-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Report reason</p>
                      <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
                        {report.reason}
                      </p>
                    </div>

                    {(report.reported_topic || report.reported_reply) && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Reported content</p>
                        <div
                          className="text-sm p-3 rounded-lg"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            opacity: (report.reported_topic?.deleted_at || report.reported_reply?.deleted_at) ? 0.5 : 1,
                          }}
                        >
                          {report.reported_content_type === 'topic' && report.reported_topic ? (
                            <>
                              <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{report.reported_topic.title}</p>
                              <p className="line-clamp-3">{report.reported_topic.content}</p>
                              {report.reported_topic.deleted_at && (
                                <p className="mt-1 text-xs font-bold" style={{ color: '#ef4444' }}>[Soft deleted]</p>
                              )}
                            </>
                          ) : report.reported_reply ? (
                            <>
                              <p>{report.reported_reply.content}</p>
                              {report.reported_reply.deleted_at && (
                                <p className="mt-1 text-xs font-bold" style={{ color: '#ef4444' }}>[Soft deleted]</p>
                              )}
                            </>
                          ) : (
                            <p className="italic">(Content not found)</p>
                          )}
                        </div>
                      </div>
                    )}

                    {report.admin_note && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Admin note</p>
                        <p className="text-sm p-2 rounded-lg italic" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}>
                          {report.admin_note}
                        </p>
                      </div>
                    )}

                    {!report.resolved && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => handleDeleteContent(report)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{ backgroundColor: '#ef4444', color: '#fff' }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Content
                        </button>
                        {report.content_author && (
                          <>
                            <button
                              onClick={() => user && setActionModal({ reportId: report.id, report, mode: 'warn' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                              style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Warn User
                            </button>
                            <button
                              onClick={() => user && setActionModal({ reportId: report.id, report, mode: 'freeze' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                              style={{ backgroundColor: '#3b82f6', color: '#fff' }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Freeze User
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDismiss(report)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {actionModal && user && (
        <ModerationActionModal
          mode={actionModal.mode}
          report={actionModal.report}
          adminId={user.id}
          onClose={() => setActionModal(null)}
          onDone={(reportId, action) => {
            setReports((prev) => prev.map((r) =>
              r.id === reportId ? { ...r, resolved: true, admin_action: action } : r
            ));
            setActionModal(null);
          }}
        />
      )}
    </div>
  );
}

function ModerationActionModal({
  mode,
  report,
  adminId,
  onClose,
  onDone,
}: {
  mode: 'warn' | 'freeze';
  report: CommunityReport;
  adminId: string;
  onClose: () => void;
  onDone: (reportId: string, action: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [alsoDeleteContent, setAlsoDeleteContent] = useState(true);
  const [resolveReport_, setResolveReport_] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const targetUserId = report.content_author?.id || '';
  const targetName = report.content_author?.name || report.content_author?.email?.split('@')[0] || 'this user';

  async function handleSubmit() {
    if (reason.trim().length < 3) {
      setError('Please provide a reason (min 3 characters)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (mode === 'warn') {
        await warnUser(adminId, targetUserId, reason.trim());
      } else {
        await freezeUser(adminId, targetUserId, reason.trim());
      }

      if (alsoDeleteContent) {
        if (report.reported_content_type === 'topic') {
          await softDeleteTopic(report.reported_content_id);
        } else {
          await softDeleteReply(report.reported_content_id);
        }
      }

      if (resolveReport_) {
        await resolveReport(report.id, { action: mode === 'warn' ? 'warned' : 'frozen', note: reason.trim() });
      }

      onDone(report.id, mode === 'warn' ? 'warned' : 'frozen');
    } catch (err) {
      console.error('[ModerationModal] Failed:', err);
      setError('Action failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
            {mode === 'warn' ? 'Warn User' : 'Freeze User'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="flex items-center gap-3 p-3 rounded-xl mb-4"
          style={{ backgroundColor: mode === 'warn' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)' }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: mode === 'warn' ? '#f59e0b' : '#3b82f6' }}>
            {mode === 'warn' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            )}
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {mode === 'warn' ? `Send warning to ${targetName}` : `Freeze community access for ${targetName}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {mode === 'warn'
                ? 'A warning will be logged to their moderation history.'
                : 'User will be unable to post or reply in the community.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Reason / internal note
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe why this action is taken..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoDeleteContent}
              onChange={(e) => setAlsoDeleteContent(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Also soft-delete the reported {report.reported_content_type}
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={resolveReport_}
              onChange={(e) => setResolveReport_(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Mark report as resolved
            </span>
          </label>
        </div>

        {error && <p className="mt-2 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: mode === 'warn' ? '#f59e0b' : '#3b82f6', color: '#fff' }}
          >
            {saving ? 'Applying...' : (mode === 'warn' ? 'Send Warning' : 'Freeze User')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TopicsManager() {
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [userHistoryModal, setUserHistoryModal] = useState<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTopics(await getTopics({ limit: 100, includeDeleted: true }));
    } catch (err) {
      console.error('[AdminCommunity] Load topics failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSoftDelete(id: string) {
    if (!confirm('Soft-delete this topic? It will be hidden from users but restorable.')) return;
    try {
      await softDeleteTopic(id);
      setTopics((prev) => prev.map((t) => t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t));
    } catch (err) {
      console.error('[AdminCommunity] Soft-delete failed:', err);
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreTopic(id);
      setTopics((prev) => prev.map((t) => t.id === id ? { ...t, deleted_at: null } : t));
    } catch (err) {
      console.error('[AdminCommunity] Restore failed:', err);
    }
  }

  async function handleTogglePin(topic: CommunityTopic) {
    try {
      const updated = await adminUpdateTopic(topic.id, { is_pinned: !topic.is_pinned });
      setTopics((prev) => prev.map((t) => t.id === updated.id ? { ...t, is_pinned: updated.is_pinned } : t));
    } catch (err) {
      console.error('[AdminCommunity] Pin toggle failed:', err);
    }
  }

  async function handleToggleLock(topic: CommunityTopic) {
    try {
      const updated = await adminUpdateTopic(topic.id, { is_locked: !topic.is_locked });
      setTopics((prev) => prev.map((t) => t.id === updated.id ? { ...t, is_locked: updated.is_locked } : t));
    } catch (err) {
      console.error('[AdminCommunity] Lock toggle failed:', err);
    }
  }


  const filtered = topics.filter((t) => showDeleted ? !!t.deleted_at : !t.deleted_at);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowDeleted((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: showDeleted ? '#ef4444' : 'var(--color-surface)',
            color: showDeleted ? '#fff' : 'var(--color-text-secondary)',
            border: `1px solid ${showDeleted ? '#ef4444' : 'var(--color-border)'}`,
          }}
        >
          {showDeleted ? 'Show Active' : `Show Deleted (${topics.filter((t) => !!t.deleted_at).length})`}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={showDeleted ? 'No deleted topics' : 'No topics yet'} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                {['Topic', 'Category', 'Replies', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((topic, idx) => {
                const catMeta = CATEGORY_LABELS[topic.category] || { label: topic.category, color: '#3b82f6' };
                const authorDisplay = topic.author?.name || topic.author?.email?.split('@')[0] || '?';
                const isDeleted = !!topic.deleted_at;

                return (
                  <tr
                    key={topic.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg-secondary)',
                      borderBottom: '1px solid var(--color-border)',
                      opacity: isDeleted ? 0.6 : 1,
                    }}
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)', textDecoration: isDeleted ? 'line-through' : 'none' }}>
                        {topic.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        {authorDisplay} · {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color }}>
                        {catMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{topic.replies_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {isDeleted && <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Deleted</span>}
                        {!isDeleted && topic.is_pinned && <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>Pinned</span>}
                        {!isDeleted && topic.is_locked && <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}>Locked</span>}
                        {!isDeleted && !topic.is_pinned && !topic.is_locked && <span className="px-1.5 py-0.5 rounded text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Active</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isDeleted ? (
                          <button onClick={() => handleRestore(topic.id)} className="px-2 py-1 rounded text-xs font-semibold hover:opacity-80" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                            Restore
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleTogglePin(topic)} className="px-2 py-1 rounded text-xs font-semibold hover:opacity-80" style={{ backgroundColor: topic.is_pinned ? 'rgba(59,130,246,0.1)' : 'var(--color-muted)', color: topic.is_pinned ? '#3b82f6' : 'var(--color-text-tertiary)' }}>
                              {topic.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button onClick={() => handleToggleLock(topic)} className="px-2 py-1 rounded text-xs font-semibold hover:opacity-80" style={{ backgroundColor: topic.is_locked ? 'rgba(245,158,11,0.1)' : 'var(--color-muted)', color: topic.is_locked ? '#f59e0b' : 'var(--color-text-tertiary)' }}>
                              {topic.is_locked ? 'Unlock' : 'Lock'}
                            </button>
                            <button onClick={() => handleSoftDelete(topic.id)} className="p-1 rounded hover:opacity-80" style={{ color: '#ef4444' }} title="Soft-delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setUserHistoryModal(topic.user_id)}
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: 'var(--color-text-tertiary)' }}
                          title="User moderation history"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {userHistoryModal && (
        <UserHistoryModal
          userId={userHistoryModal}
          adminId={user?.id || ''}
          onClose={() => setUserHistoryModal(null)}
          onAction={() => {}}
        />
      )}
    </div>
  );
}

function UserHistoryModal({
  userId,
  adminId,
  onClose,
  onAction,
}: {
  userId: string;
  adminId: string;
  onClose: () => void;
  onAction: () => void;
}) {
  const [history, setHistory] = useState<CommunityUserAction[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string | null; email: string; community_frozen_at: string | null; community_warnings_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [hist, { data: udata }] = await Promise.all([
          getUserModerationHistory(userId),
          supabase.from('users').select('name, email, community_frozen_at, community_warnings_count').eq('id', userId).maybeSingle(),
        ]);
        setHistory(hist);
        setUserInfo(udata);
      } catch (err) {
        console.error('[UserHistoryModal] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const isFrozen = !!userInfo?.community_frozen_at;

  async function handleFreeze() {
    if (!freezeReason.trim()) return;
    setFreezing(true);
    try {
      await freezeUser(adminId, userId, freezeReason.trim());
      setUserInfo((u) => u ? { ...u, community_frozen_at: new Date().toISOString() } : u);
      setFreezeReason('');
      setHistory((prev) => [{ id: 'new', user_id: userId, admin_id: adminId, action_type: 'freeze', reason: freezeReason.trim(), created_at: new Date().toISOString() }, ...prev]);
      onAction();
    } catch (err) {
      console.error('[UserHistoryModal] Freeze failed:', err);
    } finally {
      setFreezing(false);
    }
  }

  async function handleUnfreeze() {
    setFreezing(true);
    try {
      await unfreezeUser(adminId, userId);
      setUserInfo((u) => u ? { ...u, community_frozen_at: null } : u);
      setHistory((prev) => [{ id: 'new2', user_id: userId, admin_id: adminId, action_type: 'unfreeze', reason: 'Unfrozen by admin', created_at: new Date().toISOString() }, ...prev]);
      onAction();
    } catch (err) {
      console.error('[UserHistoryModal] Unfreeze failed:', err);
    } finally {
      setFreezing(false);
    }
  }

  const ACTION_COLOR: Record<string, string> = {
    warn: '#f59e0b',
    freeze: '#3b82f6',
    unfreeze: '#22c55e',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>User Moderation</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <>
            {userInfo && (
              <div
                className="flex items-center justify-between p-4 rounded-xl mb-4"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {userInfo.name || userInfo.email}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {userInfo.community_warnings_count} warning(s)
                    {isFrozen && ' · Frozen'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isFrozen ? (
                    <button
                      onClick={handleUnfreeze}
                      disabled={freezing}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#22c55e', color: '#fff' }}
                    >
                      Unfreeze
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {!isFrozen && (
              <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Freeze community access</p>
                <div className="flex gap-2">
                  <input
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Reason..."
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <button
                    onClick={handleFreeze}
                    disabled={freezing || !freezeReason.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#3b82f6', color: '#fff' }}
                  >
                    Freeze
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Moderation history ({history.length})
              </p>
              {history.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No moderation actions on this user.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold capitalize shrink-0 mt-0.5"
                        style={{ backgroundColor: `${ACTION_COLOR[action.action_type]}18`, color: ACTION_COLOR[action.action_type] }}
                      >
                        {action.action_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{action.reason}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                          {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    markAllNotificationsRead().catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      setNotifications(await getAdminNotifications(100));
    } catch (err) {
      console.error('[AdminCommunity] Load notifications failed:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner />;

  if (notifications.length === 0) {
    return <EmptyState title="No notifications" subtitle="Community notifications will appear here." />;
  }

  const TYPE_COLOR: Record<string, string> = {
    report: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    error: '#ef4444',
  };

  const TYPE_ICON: Record<string, string> = {
    report: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="flex items-start gap-3 p-4 rounded-xl transition-all"
          style={{
            backgroundColor: notif.read ? 'var(--color-bg-secondary)' : 'var(--color-surface)',
            border: `1px solid ${notif.read ? 'var(--color-border)' : `${TYPE_COLOR[notif.type]}30`}`,
            opacity: notif.read ? 0.7 : 1,
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${TYPE_COLOR[notif.type]}15` }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: TYPE_COLOR[notif.type] }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICON[notif.type] || TYPE_ICON.info} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{notif.title}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{notif.body}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
            </p>
          </div>
          {!notif.read && (
            <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: TYPE_COLOR[notif.type] }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
    </div>
  );
}

function PendingReviewManager({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [replies, setReplies] = useState<(CommunityReply & { topic_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingContent();
      setTopics(result.topics);
      setReplies(result.replies as (CommunityReply & { topic_title?: string })[]);
      onCountChange?.(result.topics.length + result.replies.length);
    } catch (err) {
      console.error('[PendingReview] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(
    table: 'community_topics' | 'community_replies',
    id: string,
    status: 'published' | 'rejected'
  ) {
    setActing(id);
    try {
      await setModerationStatus(table, id, status);
      if (table === 'community_topics') {
        setTopics((prev) => prev.filter((t) => t.id !== id));
      } else {
        setReplies((prev) => prev.filter((r) => r.id !== id));
      }
      onCountChange?.(topics.length + replies.length - 1);
    } catch (err) {
      console.error('[PendingReview] Action failed:', err);
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  const total = topics.length + replies.length;

  if (total === 0) {
    return (
      <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No pending content</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>All community content has been reviewed</p>
      </div>
    );
  }

  function FlagBadges({ flags }: { flags: Record<string, boolean> | null }) {
    if (!flags) return null;
    const active = Object.entries(flags).filter(([, v]) => v === true).map(([k]) => k);
    if (active.length === 0) return null;
    const colors: Record<string, string> = {
      spam: '#f59e0b',
      toxic: '#ef4444',
      duplicate: '#3b82f6',
      off_topic: '#8b5cf6',
    };
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {active.map((flag) => (
          <span
            key={flag}
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: `${colors[flag] || '#888'}18`, color: colors[flag] || '#888' }}
          >
            {flag.replace('_', ' ')}
          </span>
        ))}
      </div>
    );
  }

  function PendingCard({
    id,
    table,
    authorName,
    content,
    meta,
    flags,
    createdAt,
  }: {
    id: string;
    table: 'community_topics' | 'community_replies';
    authorName: string;
    content: string;
    meta: string;
    flags: Record<string, boolean> | null;
    createdAt: string;
  }) {
    const isActing = acting === id;
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(245,158,11,0.25)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
              >
                {table === 'community_topics' ? 'Topic' : 'Reply'}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {authorName}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {meta}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-4" style={{ color: 'var(--color-text-primary)' }}>
              {content}
            </p>
            <FlagBadges flags={flags} />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => handleAction(table, id, 'published')}
              disabled={isActing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
            <button
              onClick={() => handleAction(table, id, 'rejected')}
              disabled={isActing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          {total} item{total !== 1 ? 's' : ''} awaiting review
        </p>
        <button
          onClick={load}
          className="text-xs hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-accent)' }}
        >
          Refresh
        </button>
      </div>

      {topics.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Topics ({topics.length})
          </h3>
          <div className="space-y-3">
            {topics.map((t) => (
              <PendingCard
                key={t.id}
                id={t.id}
                table="community_topics"
                authorName={t.author?.name || t.author?.email?.split('@')[0] || '?'}
                content={`${t.title}\n\n${t.content}`}
                meta={CATEGORY_LABELS[t.category]?.label || t.category}
                flags={t.moderation_flags}
                createdAt={t.created_at}
              />
            ))}
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Replies ({replies.length})
          </h3>
          <div className="space-y-3">
            {replies.map((r) => (
              <PendingCard
                key={r.id}
                id={r.id}
                table="community_replies"
                authorName={r.author?.name || r.author?.email?.split('@')[0] || '?'}
                content={r.content}
                meta={r.topic_title ? `In: ${r.topic_title}` : ''}
                flags={r.moderation_flags}
                createdAt={r.created_at}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
