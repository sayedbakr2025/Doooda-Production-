import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../utils/translations';

interface UpgradeModalProps {
  onClose: () => void;
}

const PLANS = [
  {
    key: 'advanced',
    color: '#7c3aed',
    price: '$10',
    tokens: { ar: '100,000 توكن', en: '100,000 tokens' },
    features: {
      ar: ['تصدير احترافي', 'تنسيق Kindle', 'Amazon KDP'],
      en: ['Professional export', 'Kindle formatting', 'Amazon KDP export'],
    },
  },
  {
    key: 'pro',
    color: '#2563eb',
    price: '$25',
    tokens: { ar: '250,000 توكن', en: '250,000 tokens' },
    features: {
      ar: ['جميع أدوات التسويق', 'إنشاء نسخة إنجليزية', 'تنسيقات صناعية للسيناريو'],
      en: ['Full marketing suite', 'English edition generation', 'Industry screenplay format'],
    },
  },
];

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          animation: 'fadeSlideUp 0.25s ease',
        }}
      >
        <div className="p-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold leading-snug mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('marketing.upgrade.title', language)} ✨
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t('marketing.upgrade.desc', language)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col sm:flex-row gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="flex-1 rounded-xl p-4 flex flex-col gap-3"
              style={{
                border: `2px solid ${plan.color}22`,
                backgroundColor: `${plan.color}08`,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${plan.color}18`, color: plan.color }}
                >
                  {plan.key === 'advanced'
                    ? t('marketing.upgrade.plan.advanced', language)
                    : t('marketing.upgrade.plan.pro', language)}
                </span>
                <span className="text-2xl font-black" style={{ color: plan.color }}>
                  {plan.price}
                </span>
              </div>

              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {plan.tokens[language]}
              </p>

              <ul className="flex flex-col gap-1.5 flex-1">
                {plan.features[language].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    <span style={{ color: plan.color }}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 mt-auto"
                style={{ backgroundColor: plan.color }}
              >
                {t('marketing.upgrade.cta', language)}
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
