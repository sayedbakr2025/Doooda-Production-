import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Lock, LogOut, Zap, Star, Crown, Gift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPlan } from '../hooks/useUserPlan';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import UpgradePlanModal from './UpgradePlanModal';
import ReferralDashboard from './ReferralDashboard';

const FALLBACK_PLAN_DISPLAY: Record<string, { ar: string; en: string; color: string; icon: typeof Star }> = {
  free:  { ar: 'كاتب هاوي',  en: 'Hobbyist Writer',    color: '#6b7280', icon: Star  },
  pro:   { ar: 'كاتب جاد',   en: 'Serious Writer',      color: '#d62828', icon: Zap   },
  max:   { ar: 'كاتب محترف', en: 'Professional Writer', color: '#b45309', icon: Crown },
};

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const { planCode, displayName: planDisplayName } = useUserPlan();
  const isRTL = language === 'ar';
  const [open, setOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUpgradePlan, setShowUpgradePlan] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    user?.user_metadata?.pen_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    (language === 'ar' ? 'حسابك' : 'Account');

  const planInfo = FALLBACK_PLAN_DISPLAY[planCode] || FALLBACK_PLAN_DISPLAY.free;
  const PlanIcon = planInfo.icon;
  const planLabel = planDisplayName(language);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: open ? 'var(--color-bg-tertiary)' : 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
          onMouseLeave={(e) => !open && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-[100px] truncate">{displayName}</span>
          <ChevronDown
            className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--color-text-secondary)' }}
          />
        </button>

        {open && (
          <div
            className="absolute mt-2 w-56 rounded-xl shadow-lg overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              [isRTL ? 'left' : 'right']: 0,
            }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {displayName}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {user?.email}
              </p>

              <button
                onClick={() => { setOpen(false); setShowUpgradePlan(true); }}
                className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-full transition-colors"
                style={{
                  backgroundColor: `${planInfo.color}12`,
                  border: `1px solid ${planInfo.color}30`,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${planInfo.color}22`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = `${planInfo.color}12`)}
              >
                <PlanIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: planInfo.color }} />
                <span className="text-xs font-semibold" style={{ color: planInfo.color }}>
                  {planLabel}
                </span>
              </button>
            </div>

            <div className="py-1" dir={isRTL ? 'rtl' : 'ltr'}>
              {[
                {
                  icon: User,
                  label: language === 'ar' ? 'عدّل بياناتك الشخصية' : 'Edit Profile',
                  onClick: () => { setOpen(false); setShowEditProfile(true); },
                },
                {
                  icon: Lock,
                  label: language === 'ar' ? 'تغيير كلمة مرورك' : 'Change Password',
                  onClick: () => { setOpen(false); setShowChangePassword(true); },
                },
                {
                  icon: Gift,
                  label: language === 'ar' ? 'برنامج الإحالة' : 'Referral Program',
                  onClick: () => { setOpen(false); setShowReferral(true); },
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: 'var(--color-text-primary)',
                      textAlign: isRTL ? 'right' : 'left',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t py-1" style={{ borderColor: 'var(--color-border)' }} dir={isRTL ? 'rtl' : 'ltr'}>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{
                  color: 'var(--color-error)',
                  textAlign: isRTL ? 'right' : 'left',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {showReferral && <ReferralDashboard onClose={() => setShowReferral(false)} />}
      {showUpgradePlan && (
        <UpgradePlanModal
          currentPlan={planCode}
          onClose={() => {
            setShowUpgradePlan(false);
          }}
        />
      )}
    </>
  );
}
