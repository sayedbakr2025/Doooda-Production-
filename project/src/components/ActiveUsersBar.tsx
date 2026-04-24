import { useState } from 'react';
import type { PresenceUser } from '../hooks/usePresence';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  users: PresenceUser[];
  maxVisible?: number;
}

export default function ActiveUsersBar({ users, maxVisible = 5 }: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';
  const [showAll, setShowAll] = useState(false);

  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  return (
    <div className="flex items-center gap-2" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center">
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: 'rgb(34,197,94)' }}
        />
        <span className="text-xs ms-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
          {isRtl
            ? `${users.length} ${users.length === 1 ? 'مستخدم نشط' : 'مستخدمون نشطون'}`
            : `${users.length} online`}
        </span>
      </div>

      <div className="flex items-center" style={{ direction: 'ltr' }}>
        {visible.map((u, idx) => (
          <div
            key={u.userId}
            className="relative group"
            style={{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: visible.length - idx }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 cursor-default transition-transform hover:scale-110 hover:z-50"
              style={{
                backgroundColor: u.color,
                borderColor: 'var(--color-surface)',
              }}
              title={u.displayName}
            >
              {u.displayName.charAt(0).toUpperCase()}
            </div>
            {u.isEditing && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                style={{ backgroundColor: '#f59e0b', borderColor: 'var(--color-surface)' }}
                title={isRtl ? 'يكتب...' : 'Editing...'}
              >
                <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                  <path d="M0 6.5l1-3L5.5 1l1.5 1.5L2.5 7 0 8z" />
                </svg>
              </span>
            )}
            <div
              className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            >
              {u.displayName}
              {u.isEditing && (
                <span className="ms-1 opacity-75">
                  {isRtl ? '(يكتب)' : '(editing)'}
                </span>
              )}
            </div>
          </div>
        ))}

        {overflow > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2"
            style={{
              marginLeft: '-8px',
              backgroundColor: 'var(--color-muted)',
              borderColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              zIndex: 0,
            }}
          >
            +{overflow}
          </button>
        )}
      </div>

      {showAll && overflow > 0 && (
        <div
          className="absolute top-full mt-2 rounded-xl shadow-xl py-2 min-w-[160px] z-50"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {users.slice(maxVisible).map((u) => (
            <div key={u.userId} className="flex items-center gap-2 px-3 py-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: u.color }}
              >
                {u.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {u.displayName}
              </span>
              {u.isEditing && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#f59e0b' }} />
              )}
            </div>
          ))}
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-xs px-3 pt-1.5 pb-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      )}
    </div>
  );
}
