import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Users, Clock, Gift, MousePointer, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface ReferralStats {
  total_clicks: number;
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  tokens_earned: number;
}

interface ReferralRecord {
  id: string;
  referred_user_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  referred_pen_name?: string;
  referred_email?: string;
}

interface Props {
  onClose: () => void;
}

export default function ReferralDashboard({ onClose }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    total_clicks: 0,
    total_referrals: 0,
    completed_referrals: 0,
    pending_referrals: 0,
    tokens_earned: 0,
  });
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : '';

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();

      const code = userData?.referral_code || '';
      setReferralCode(code);

      if (!code) {
        setLoading(false);
        return;
      }

      const [clicksRes, referralsRes] = await Promise.all([
        supabase
          .from('referral_clicks')
          .select('id', { count: 'exact', head: true })
          .eq('referral_code', code),
        supabase
          .from('referrals')
          .select('id, referred_user_id, status, created_at, completed_at')
          .eq('referrer_user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const allReferrals: ReferralRecord[] = referralsRes.data || [];

      const enriched: ReferralRecord[] = await Promise.all(
        allReferrals.map(async (r) => {
          if (!r.referred_user_id) return r;
          const { data: ru } = await supabase
            .from('users')
            .select('pen_name, email')
            .eq('id', r.referred_user_id)
            .maybeSingle();
          return {
            ...r,
            referred_pen_name: ru?.pen_name || '',
            referred_email: ru?.email || '',
          };
        })
      );

      setReferrals(enriched);

      const completed = allReferrals.filter((r) => r.status === 'completed').length;
      const pending = allReferrals.filter((r) => r.status === 'pending').length;

      setStats({
        total_clicks: clicksRes.count || 0,
        total_referrals: allReferrals.length,
        completed_referrals: completed,
        pending_referrals: pending,
        tokens_earned: completed * 10000,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const statusLabel = (s: string) => {
    if (isRTL) {
      if (s === 'completed') return 'مكتمل';
      if (s === 'pending') return 'قيد الانتظار';
      return 'غير صالح';
    }
    if (s === 'completed') return 'Completed';
    if (s === 'pending') return 'Pending';
    return 'Invalid';
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'var(--color-success)';
    if (s === 'pending') return 'var(--color-warning, #d97706)';
    return 'var(--color-error)';
  };

  const statCards = [
    {
      icon: MousePointer,
      label: isRTL ? 'إجمالي النقرات' : 'Total Clicks',
      value: stats.total_clicks.toLocaleString(),
      color: '#3b82f6',
    },
    {
      icon: Users,
      label: isRTL ? 'إجمالي الإحالات' : 'Total Referrals',
      value: stats.total_referrals.toLocaleString(),
      color: '#8b5cf6',
    },
    {
      icon: Check,
      label: isRTL ? 'إحالات مكتملة' : 'Successful',
      value: stats.completed_referrals.toLocaleString(),
      color: 'var(--color-success)',
    },
    {
      icon: Clock,
      label: isRTL ? 'قيد الانتظار' : 'Pending',
      value: stats.pending_referrals.toLocaleString(),
      color: '#d97706',
    },
    {
      icon: Gift,
      label: isRTL ? 'توكينز مكتسبة' : 'Tokens Earned',
      value: stats.tokens_earned.toLocaleString(),
      color: 'var(--color-accent)',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          maxHeight: '90vh',
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'برنامج الإحالة' : 'Referral Program'}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'ادعُ كتّاباً وكلاكما يحصل على ١٠٠٠٠ توكينز'
                : 'Invite writers and both of you earn 10,000 tokens'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div
                className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
              />
            </div>
          ) : (
            <>
              {/* Referral Link Box */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? 'رابط الإحالة الخاص بك' : 'Your Referral Link'}
                </p>
                <div className="flex gap-2 items-center">
                  <div
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono truncate"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      direction: 'ltr',
                    }}
                  >
                    {referralLink}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                    style={{
                      backgroundColor: copied ? 'var(--color-success)' : 'var(--color-accent)',
                      color: '#fff',
                    }}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? (isRTL ? 'تم النسخ' : 'Copied!') : (isRTL ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  {isRTL
                    ? `كودك: ${referralCode}`
                    : `Your code: ${referralCode}`}
                </p>
              </div>

              {/* How it works */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: '#3b82f6' }}>
                  {isRTL ? 'كيف يعمل البرنامج؟' : 'How does it work?'}
                </p>
                <ol className={`text-sm space-y-1 ${isRTL ? 'pr-4' : 'pl-4'} list-decimal`} style={{ color: 'var(--color-text-secondary)' }}>
                  <li>{isRTL ? 'شارك رابط الإحالة الخاص بك مع أصدقائك' : 'Share your referral link with friends'}</li>
                  <li>{isRTL ? 'يسجّل صديقك في دوودة عبر رابطك' : 'Your friend signs up through your link'}</li>
                  <li>{isRTL ? 'كلاكما يحصل على ١٠٠٠٠ توكينز فوراً' : 'Both of you instantly receive 10,000 tokens'}</li>
                </ol>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {statCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-4 flex flex-col gap-2"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${card.color}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: card.color }} />
                      </div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {card.value}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {card.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Referrals list */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? 'قائمة الكتّاب المُحالين' : 'Referred Writers'}
                </h3>
                {referrals.length === 0 ? (
                  <div
                    className="rounded-xl p-8 text-center"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL
                        ? 'لم تُحِل أحداً بعد. شارك رابطك لتبدأ!'
                        : "You haven't referred anyone yet. Share your link to get started!"}
                    </p>
                  </div>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                          <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRTL ? 'الكاتب' : 'Writer'}
                          </th>
                          <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRTL ? 'تاريخ الانضمام' : 'Joined'}
                          </th>
                          <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRTL ? 'الحالة' : 'Status'}
                          </th>
                          <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            {isRTL ? 'المكافأة' : 'Reward'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.map((r, i) => (
                          <tr
                            key={r.id}
                            style={{
                              borderBottom: i < referrals.length - 1 ? '1px solid var(--color-border)' : 'none',
                              backgroundColor: 'var(--color-surface)',
                            }}
                          >
                            <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>
                              <p className="font-medium">{r.referred_pen_name || (isRTL ? 'غير معروف' : 'Unknown')}</p>
                              {r.referred_email && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{r.referred_email}</p>
                              )}
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                              {formatDate(r.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  backgroundColor: `${statusColor(r.status)}18`,
                                  color: statusColor(r.status),
                                }}
                              >
                                {statusLabel(r.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {r.status === 'completed' ? (
                                <span
                                  className="flex items-center gap-1 text-xs font-semibold"
                                  style={{ color: 'var(--color-success)' }}
                                >
                                  <Gift className="w-3.5 h-3.5" />
                                  +10,000
                                </span>
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
