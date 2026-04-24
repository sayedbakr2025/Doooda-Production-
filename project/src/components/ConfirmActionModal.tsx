import { useLanguage } from '../contexts/LanguageContext';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface Props {
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  detail?: string;
  detailAr?: string;
  confirmLabel?: string;
  confirmLabelAr?: string;
  cancelLabel?: string;
  cancelLabelAr?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const VARIANT_STYLES: Record<ConfirmVariant, { btn: string; icon: string; iconPath: string }> = {
  danger: {
    btn: 'var(--color-error)',
    icon: 'rgb(239,68,68)',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  warning: {
    btn: '#d97706',
    icon: '#d97706',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  info: {
    btn: 'var(--color-accent)',
    icon: 'var(--color-accent)',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export default function ConfirmActionModal({
  title,
  titleAr,
  message,
  messageAr,
  detail,
  detailAr,
  confirmLabel = 'Confirm',
  confirmLabelAr = 'تأكيد',
  cancelLabel = 'Cancel',
  cancelLabelAr = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${styles.icon}18` }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: styles.icon }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={styles.iconPath} />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {isRtl ? (titleAr || title) : title}
              </h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {isRtl ? (messageAr || message) : message}
              </p>
              {(detail || detailAr) && (
                <p
                  className="text-xs mt-2 px-3 py-2 rounded-lg leading-relaxed"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
                >
                  {isRtl ? (detailAr || detail) : detail}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex gap-3 px-6 pb-6"
          style={{ justifyContent: isRtl ? 'flex-start' : 'flex-end' }}
        >
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
          >
            {isRtl ? cancelLabelAr : cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: styles.btn }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isRtl ? 'جاري...' : 'Processing...'}
              </span>
            ) : (
              isRtl ? confirmLabelAr : confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
