import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Lock, LogOut, Building2 } from 'lucide-react';
import { useInstitutionAuth } from '../../contexts/InstitutionAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import PartnerEditModal from './PartnerEditModal';
import PartnerChangePasswordModal from './PartnerChangePasswordModal';

export default function PartnerAccountMenu() {
  const { institution, logout } = useInstitutionAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  if (!institution) return null;

  const initials = institution.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join('');

  const menuItems = [
    {
      icon: User,
      label: isRTL ? 'تعديل المعلومات' : 'Edit Information',
      onClick: () => { setOpen(false); setShowEdit(true); },
    },
    {
      icon: Lock,
      label: isRTL ? 'تغيير كلمة المرور' : 'Change Password',
      onClick: () => { setOpen(false); setShowPassword(true); },
    },
  ];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            backgroundColor: open ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {initials || <Building2 className="w-3.5 h-3.5" />}
          </span>
          <span className="max-w-[120px] truncate hidden sm:block">{institution.name}</span>
          <ChevronDown
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{
              color: 'var(--color-text-tertiary)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>

        {open && (
          <div
            className="absolute mt-2 w-60 rounded-2xl shadow-xl overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              [isRTL ? 'left' : 'right']: 0,
            }}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div
              className="px-4 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {initials || <Building2 className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {institution.name}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {institution.email}
                </p>
              </div>
            </div>

            <div className="py-1.5">
              {menuItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: 'var(--color-text-primary)',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)' }} className="py-1.5">
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{
                  color: 'var(--color-error, #ef4444)',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  textAlign: isRTL ? 'right' : 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}
                >
                  <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--color-error, #ef4444)' }} />
                </span>
                <span>{isRTL ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showEdit && <PartnerEditModal onClose={() => setShowEdit(false)} />}
      {showPassword && <PartnerChangePasswordModal onClose={() => setShowPassword(false)} />}
    </>
  );
}
