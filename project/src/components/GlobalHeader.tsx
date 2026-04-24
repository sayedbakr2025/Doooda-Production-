import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { invokeWithAuth } from '../lib/supabaseClient';
import { supabase } from '../lib/supabaseClient';
import DooodaLogo from './DooodaLogo';
import ThemeToggle from './ThemeToggle';
import AccountMenu from './AccountMenu';
import InboxPanel from './InboxPanel';
import { getNotifications } from '../services/api';

export default function GlobalHeader() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const isRTL = language === 'ar';
  const [tokensBalance, setTokensBalance] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [showInbox, setShowInbox] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const inboxButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setTokensBalance(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    async function fetchTokens() {
      try {
        const { data, error, requiresAuth } = await invokeWithAuth<{
          id: string;
          tokens_balance: number;
          plan: string;
        }>('me', { method: 'GET' });

        if (requiresAuth) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setTokensBalance(null);
          return;
        }

        if (!error && data) {
          setTokensBalance(data.tokens_balance);
        }
      } catch {
      }
    }

    fetchTokens();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchTokens, 30000) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    try {
      const notifications = await getNotifications();
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch {
    }
  }, [user]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('header-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          loadUnreadCount();
          const row = payload.new as any;
          if (row && !row.read) {
            setToast({ title: row.title || (language === 'ar' ? 'إشعار جديد' : 'New notification'), message: row.message || '' });
            setTimeout(() => setToast(null), 4000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => { loadUnreadCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadUnreadCount]);

  return (
    <header
      className="shadow-sm sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: `1px solid var(--color-border)`
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: '/dashboard', labelAr: 'المشاريع', labelEn: 'Projects' },
              { to: '/academy', labelAr: 'الأكاديمية', labelEn: 'Academy' },
              { to: '/community', labelAr: 'المجتمع', labelEn: 'Community' },
              { to: '/competitions', labelAr: 'مسابقات', labelEn: 'Competitions' },
            ].map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--color-muted)' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                >
                  {isRTL ? item.labelAr : item.labelEn}
                </Link>
              );
            })}
          </nav>

          <DooodaLogo />

          <div className="flex items-center gap-3">
            {tokensBalance !== null && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>🪙</span>
                <span>{tokensBalance.toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {language === 'ar' ? 'رمز' : 'tokens'}
                </span>
              </div>
            )}

            {user && (
              <div ref={inboxButtonRef} className="relative">
                <button
                  onClick={() => setShowInbox(v => !v)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
                  style={{
                    backgroundColor: showInbox ? 'var(--color-muted)' : 'transparent',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                  onMouseEnter={e => {
                    if (!showInbox) e.currentTarget.style.backgroundColor = 'var(--color-muted)';
                  }}
                  onMouseLeave={e => {
                    if (!showInbox) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title={language === 'ar' ? 'الصندوق الوارد' : 'Inbox'}
                >
                  <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-white font-bold px-1"
                      style={{ fontSize: '0.6rem', backgroundColor: 'var(--color-error, #ef4444)', lineHeight: 1 }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {showInbox && (
                  <InboxPanel
                    onClose={() => setShowInbox(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                )}
              </div>
            )}

            {user && <AccountMenu />}
            <ThemeToggle />
          </div>
         </div>
       </div>

      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 cursor-pointer transition-all animate-bounce"
          style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)', maxWidth: 400 }}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          onClick={() => { setToast(null); setShowInbox(true); }}
        >
          <span className="text-lg">🔔</span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{toast.title}</p>
            {toast.message && (
              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{toast.message}</p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
