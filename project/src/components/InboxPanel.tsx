import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  acceptCollaborationInvitation,
  rejectCollaborationInvitation,
  approveDeletionRequest,
  rejectDeletionRequest,
} from '../services/api';
import type { Notification } from '../services/api';
import { supabase } from '../lib/supabaseClient';

type Tab = 'all' | 'invitations' | 'news' | 'important';

interface Props {
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export default function InboxPanel({ onClose, onUnreadCountChange }: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      onUnreadCountChange(data.filter(n => !n.read).length);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleMarkRead = async (n: Notification) => {
    if (n.read) return;
    try {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    onUnreadCountChange(0);
  };

  const handleDelete = async (n: Notification) => {
    await deleteNotification(n.id);
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleAccept = async (n: Notification) => {
    setActioningId(n.id);
    setActionError(null);
    try {
      await acceptCollaborationInvitation(n);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
      onClose();
      window.dispatchEvent(new Event('projects-changed'));
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'PROJECT_DELETED') setActionError(isRtl ? 'هذا المشروع محذوف' : 'This project has been deleted');
      else if (msg === 'INVITE_REVOKED') setActionError(isRtl ? 'تم سحب الدعوة' : 'The invitation has been revoked');
      else if (msg === 'ACCESS_FROZEN') setActionError(isRtl ? 'وصولك مجمد' : 'Your access is frozen');
      else setActionError(isRtl ? 'فشل في قبول الدعوة' : 'Failed to accept invitation');
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (n: Notification) => {
    setActioningId(n.id);
    try {
      await rejectCollaborationInvitation(n);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
    } catch {
    } finally {
      setActioningId(null);
    }
  };

  const handleApproveDeletion = async (n: Notification) => {
    setActioningId(n.id);
    try {
      await approveDeletionRequest(n);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
    } catch (err: any) {
      console.error('Approve deletion failed', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectDeletion = async (n: Notification) => {
    setActioningId(n.id);
    try {
      await rejectDeletionRequest(n);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      onUnreadCountChange(notifications.filter(x => !x.read && x.id !== n.id).length);
    } catch {
    } finally {
      setActioningId(null);
    }
  };

  const tabs: { id: Tab; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
    { id: 'invitations', labelAr: 'الدعوات', labelEn: 'Invitations' },
    { id: 'news', labelAr: 'أخبار', labelEn: 'News' },
    { id: 'important', labelAr: 'هام', labelEn: 'Important' },
  ];

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'invitations') return n.category === 'invites' || n.type === 'project_invite' || n.type === 'invitation';
    if (activeTab === 'news') return n.category === 'news';
    if (activeTab === 'important') return n.category === 'important';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabUnread = (tabId: Tab) => {
    const tabNotifs = notifications.filter(n => {
      if (tabId === 'all') return true;
      if (tabId === 'invitations') return n.category === 'invites' || n.type === 'project_invite' || n.type === 'invitation';
      if (tabId === 'news') return n.category === 'news';
      if (tabId === 'important') return n.category === 'important';
      return true;
    });
    return tabNotifs.filter(n => !n.read).length;
  };

  const displayTitle = (n: Notification) => {
    if (isRtl && n.title_ar) return n.title_ar;
    return n.title;
  };

  const displayMessage = (n: Notification) => {
    if (isRtl && n.message_ar) return n.message_ar;
    return n.message;
  };

  const displayCtaLabel = (n: Notification) => {
    if (isRtl && n.cta_label_ar) return n.cta_label_ar;
    return n.cta_label;
  };

  const typeIcon = (type: Notification['type']) => {
    if (type === 'invitation' || type === 'project_invite') return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
    if (type === 'request' || type === 'deletion_request') return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    );
    if (type === 'mention') return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.5 0 2.5-.5 3-1 .5 1.5 0 3-1 4" />
      </svg>
    );
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const typeColor = (type: Notification['type']) => {
    if (type === 'invitation' || type === 'project_invite') return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' };
    if (type === 'request' || type === 'deletion_request') return { bg: 'rgba(234,179,8,0.1)', color: '#ca8a04' };
    if (type === 'mention') return { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' };
    return { bg: 'rgba(107,114,128,0.1)', color: 'var(--color-text-secondary)' };
  };

  const roleLabel = (role: string) => {
    if (language === 'ar') {
      if (role === 'viewer') return 'مشاهد';
      if (role === 'editor') return 'محرر';
      if (role === 'manager') return 'مدير';
    } else {
      if (role === 'viewer') return 'Viewer';
      if (role === 'editor') return 'Editor';
      if (role === 'manager') return 'Manager';
    }
    return role;
  };

  const formatTime = (ts: string) => {
    const tsUtc = ts.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + 'Z';
    const d = new Date(tsUtc);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (language === 'ar') {
      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      return `منذ ${days} يوم`;
    } else {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute z-50 shadow-2xl rounded-2xl overflow-hidden"
      style={{
        width: 400,
        maxHeight: 560,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        [isRtl ? 'left' : 'right']: 0,
        top: '100%',
        marginTop: 8,
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
            {isRtl ? 'الصندوق الوارد' : 'Inbox'}
          </h3>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            {isRtl ? 'تعليم الكل كمقروء' : 'Mark all read'}
          </button>
        )}
      </div>

      <div
        className="flex shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {tabs.map(tab => {
            const count = tabUnread(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2.5 text-xs font-medium transition-colors relative"
                style={{
                  color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                }}
              >
                {isRtl ? tab.labelAr : tab.labelEn}
                {count > 0 && (
                  <span
                    className="ml-1 text-[10px] font-bold px-1 rounded-full text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div
              className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {isRtl ? 'لا توجد إشعارات' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((n, idx) => {
              const { bg, color } = typeColor(n.type);
              const isActioning = actioningId === n.id;
              const isPendingInvite = (n.type === 'invitation' || n.type === 'project_invite') && !n.read;
              const isPendingDeletion = (n.type === 'request' || n.type === 'deletion_request') && (n.data?.request_type === 'deletion') && !n.read;

              return (
                <div
                  key={n.id}
                  className="px-4 py-3 transition-colors cursor-pointer"
                  style={{
                    borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: n.read ? 'transparent' : 'var(--color-muted)',
                    opacity: isActioning ? 0.6 : 1,
                  }}
                  onClick={() => !isPendingInvite && handleMarkRead(n)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: bg, color }}
                    >
                      {typeIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                          {displayTitle(n) || (n.type === 'invitation'
                            ? (isRtl ? 'دعوة للتعاون' : 'Collaboration Invitation')
                            : (isRtl ? 'إشعار' : 'Notification'))}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!n.read && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                          )}
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>
                            {formatTime(n.created_at)}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(n); }}
                            className="p-1 rounded transition-colors hover:bg-red-500/10"
                            style={{ color: 'var(--color-text-tertiary)' }}
                            title={isRtl ? 'حذف' : 'Delete'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {(n.type === 'invitation' || n.type === 'project_invite') && n.data?.project_title ? (
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRtl
                              ? <>دعاك <strong style={{ color: 'var(--color-text-primary)' }}>{n.data.inviter_name || ''}</strong> للتعاون في مشروع</>
                              : <><strong style={{ color: 'var(--color-text-primary)' }}>{n.data.inviter_name || ''}</strong> invited you to collaborate on a project</>}
                          </p>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                            >
                              {n.data.project_title}
                            </span>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: bg, color }}
                            >
                              {roleLabel(n.data.role || '')}
                            </span>
                          </div>
                          {isPendingInvite && (
                            <div>
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAccept(n); }}
                                  disabled={isActioning}
                                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                                  style={{ backgroundColor: 'var(--color-success, #22c55e)' }}
                                >
                                  {isRtl ? 'قبول' : 'Accept'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleReject(n); }}
                                  disabled={isActioning}
                                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                >
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </div>
                              {actionError && actioningId === n.id && (
                                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-error)' }}>{actionError}</p>
                              )}
                            </div>
                          )}
                          {!isPendingInvite && (n.type === 'invitation' || n.type === 'project_invite') && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                              {n.read
                                ? (isRtl ? 'تمت المعالجة' : 'Processed')
                                : ''}
                            </p>
                          )}
                        </div>
                      ) : (n.type === 'request' || n.type === 'deletion_request') && n.data?.request_type === 'deletion' ? (
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRtl
                              ? <>يطلب <strong style={{ color: 'var(--color-text-primary)' }}>{n.data.requester_name || ''}</strong> حذف {n.data.item_type === 'scene' ? 'المشهد' : 'الفصل'}</>
                              : <><strong style={{ color: 'var(--color-text-primary)' }}>{n.data.requester_name || ''}</strong> requests deletion of a {n.data.item_type}</>}
                          </p>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                              {n.data.item_title}
                            </span>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                            >
                              {n.data.project_title}
                            </span>
                          </div>
                          {isPendingDeletion && (
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveDeletion(n); }}
                                disabled={isActioning}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                                style={{ backgroundColor: '#ef4444' }}
                              >
                                {isRtl ? 'موافقة على الحذف' : 'Approve Deletion'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRejectDeletion(n); }}
                                disabled={isActioning}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                              >
                                {isRtl ? 'رفض' : 'Reject'}
                              </button>
                            </div>
                          )}
                          {!isPendingDeletion && (n.type === 'request' || n.type === 'deletion_request') && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                              {n.read ? (isRtl ? 'تمت المعالجة' : 'Processed') : ''}
                            </p>
                          )}
                        </div>
                      ) : n.type === 'mention' ? (
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRtl
                              ? <>ذكرك <strong style={{ color: '#8b5cf6' }}>{n.data?.mentioner_name || ''}</strong> في تعليق</>
                              : <><strong style={{ color: '#8b5cf6' }}>{n.data?.mentioner_name || ''}</strong> mentioned you in a comment</>}
                          </p>
                          {n.data?.project_title && (
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}
                            >
                              {n.data.project_title}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                          {displayMessage(n) || displayTitle(n)}
                        </p>
                      )}

                      {n.cta_label && n.cta_link && (
                        <a
                          href={n.cta_link}
                          className="inline-block mt-2 px-3 py-1 rounded-lg text-xs font-semibold text-white cursor-pointer"
                          style={{ 
                            backgroundColor: 'var(--color-accent)',
                            color: 'white',
                            textDecoration: 'none'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                        >
                          {displayCtaLabel(n)}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
