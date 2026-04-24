import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import GlobalHeader from '../components/GlobalHeader';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  acceptCollaborationInvitation,
  rejectCollaborationInvitation,
} from '../services/api';
import type { Notification } from '../services/api';
import { supabase } from '../lib/supabaseClient';

type Tab = 'all' | 'invites' | 'system';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('inbox-page-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const handleMarkRead = async (n: Notification) => {
    if (n.read) return;
    await markNotificationRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleAccept = async (n: Notification) => {
    setActioningId(n.id);
    setActionError(null);
    try {
      await acceptCollaborationInvitation(n);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      window.dispatchEvent(new Event('projects-changed'));
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'PROJECT_DELETED') setActionError(isRTL ? 'هذا المشروع محذوف' : 'This project has been deleted');
      else if (msg === 'INVITE_REVOKED') setActionError(isRTL ? 'تم سحب الدعوة' : 'The invitation has been revoked');
      else if (msg === 'ACCESS_FROZEN') setActionError(isRTL ? 'وصولك مجمد' : 'Your access is frozen');
      else setActionError(isRTL ? 'فشل في قبول الدعوة' : 'Failed to accept invitation');
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (n: Notification) => {
    setActioningId(n.id);
    try {
      await rejectCollaborationInvitation(n);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    } catch {
    } finally {
      setActioningId(null);
    }
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'invites') return n.type === 'project_invite' || n.type === 'invitation';
    if (activeTab === 'system') return n.type === 'system' || n.type === 'info';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabs: { id: Tab; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
    { id: 'invites', labelAr: 'الدعوات', labelEn: 'Invites' },
    { id: 'system', labelAr: 'النظام', labelEn: 'System' },
  ];

  const typeIcon = (type: string) => {
    if (type === 'invitation' || type === 'project_invite') return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
    if (type === 'request' || type === 'deletion_request') return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    );
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const typeColor = (type: string) => {
    if (type === 'invitation' || type === 'project_invite') return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' };
    if (type === 'request' || type === 'deletion_request') return { bg: 'rgba(234,179,8,0.1)', color: '#ca8a04' };
    return { bg: 'rgba(107,114,128,0.1)', color: 'var(--color-text-secondary)' };
  };

  const roleLabel = (role: string) => {
    if (isRTL) {
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
    if (isRTL) {
      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      return `منذ ${days} يوم`;
    }
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'بريد دووودة' : 'Doooda Mail'}
            </h1>
            {unreadCount > 0 && (
              <span
                className="text-sm font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                {isRTL ? 'تعليم الكل كمقروء' : 'Mark all read'}
              </button>
            )}
            <Link
              to="/dashboard"
              className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
            >
              {isRTL ? 'رجوع' : 'Back'}
            </Link>
          </div>
        </div>

        <div
          className="flex mb-6 rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-surface)',
                color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {isRTL ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div
                className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--color-muted)' }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL ? 'الإشعارات الجديدة ستظهر هنا' : 'New notifications will appear here'}
              </p>
            </div>
          ) : (
            filtered.map(n => {
              const { bg, color } = typeColor(n.type);
              const isActioning = actioningId === n.id;
              const isPendingInvite = (n.type === 'invitation' || n.type === 'project_invite') && !n.read;
              const nd = n.data || {};

              return (
                <div
                  key={n.id}
                  className="rounded-xl p-4 transition-all cursor-pointer"
                  style={{
                    backgroundColor: n.read ? 'var(--color-surface)' : 'var(--color-muted)',
                    border: n.read ? '1px solid var(--color-border)' : '2px solid var(--color-accent)',
                    opacity: isActioning ? 0.6 : 1,
                  }}
                  onClick={() => !isPendingInvite && handleMarkRead(n)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: bg, color }}
                    >
                      {typeIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-base font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                          {n.title || (isRTL ? 'إشعار' : 'Notification')}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.read && (
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                          )}
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                      </div>

                      {isPendingInvite && nd.project_title ? (
                        <div>
                          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {n.message || (isRTL ? 'تمت دعوتك للمشاركة في مشروع' : 'You have been invited to collaborate on a project')}
                          </p>
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span
                              className="text-sm font-semibold px-3 py-1 rounded-full"
                              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                            >
                              {nd.project_title}
                            </span>
                            {nd.role && (
                              <span
                                className="text-sm font-medium px-3 py-1 rounded-full"
                                style={{ backgroundColor: bg, color }}
                              >
                                {roleLabel(nd.role)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAccept(n); }}
                              disabled={isActioning}
                              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
                              style={{ backgroundColor: 'var(--color-success, #22c55e)' }}
                            >
                              {isRTL ? 'قبول' : 'Accept'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(n); }}
                              disabled={isActioning}
                              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                            >
                              {isRTL ? 'رفض' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      ) : isPendingInvite ? (
                        <div>
                          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                            {n.message || (isRTL ? 'تمت دعوتك للمشاركة في مشروع' : 'You have been invited to collaborate on a project')}
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAccept(n); }}
                              disabled={isActioning}
                              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
                              style={{ backgroundColor: 'var(--color-success, #22c55e)' }}
                            >
                              {isRTL ? 'قبول' : 'Accept'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(n); }}
                              disabled={isActioning}
                              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                            >
                              {isRTL ? 'رفض' : 'Reject'}
                            </button>
                          </div>
                          {actionError && actioningId === n.id && (
                            <p className="text-xs mt-2 font-medium" style={{ color: 'var(--color-error)' }}>{actionError}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                          {n.message || n.title}
                        </p>
                      )}

                      {isPendingInvite && nd.project_id && (
                        <Link
                          to={`/projects/${nd.project_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {isRTL ? 'عرض المشروع' : 'View project'}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}

                      {!isPendingInvite && (n.type === 'invitation' || n.type === 'project_invite') && n.read && (
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                          {isRTL ? 'تمت المعالجة' : 'Processed'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
