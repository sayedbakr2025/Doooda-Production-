import type { EditLock } from '../hooks/usePresence';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  lock: EditLock;
  onDismiss?: () => void;
}

export default function EditLockBanner({ lock, onDismiss }: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3"
      style={{
        backgroundColor: 'rgba(234,179,8,0.08)',
        border: '1px solid rgba(234,179,8,0.3)',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
        style={{ backgroundColor: lock.color }}
      >
        {lock.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
          {isRtl
            ? `${lock.displayName} يعدّل هذا المشهد الآن`
            : `${lock.displayName} is editing this scene`}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#a16207' }}>
          {isRtl
            ? 'تعديلاتك ستُحفظ لكن قد تحدث تعارضات. انتظر أو تابع بحذر.'
            : 'Your changes will be saved but conflicts may occur. Wait or proceed carefully.'}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full animate-pulse shrink-0"
        style={{ backgroundColor: '#f59e0b' }}
      />
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded transition-colors"
          style={{ color: '#a16207' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(234,179,8,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
