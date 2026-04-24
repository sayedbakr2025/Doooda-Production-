import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  onClose: () => void;
  reason?: 'tokens' | 'boost' | 'evaluation';
}

const PLANS = [
  {
    key: 'silver',
    name_ar: 'الفضي',
    name_en: 'Silver',
    price_usd: 99,
    tokens: 10_000_000,
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.3)',
    features_ar: [
      '10,000,000 توكن شهريًا',
      'إمكانية شراء توكنز إضافية',
      'تقييم دووودة للأعمال',
      'ترويج المسابقات',
    ],
    features_en: [
      '10,000,000 tokens/month',
      'Purchase additional token packages',
      'Doooda AI evaluation for submissions',
      'Competition boost & promotion',
    ],
    popular: true,
  },
  {
    key: 'gold',
    name_ar: 'الذهبي',
    name_en: 'Gold',
    price_usd: 199,
    tokens: 25_000_000,
    color: '#ca8a04',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.3)',
    features_ar: [
      '25,000,000 توكن شهريًا',
      'إمكانية شراء توكنز إضافية',
      'تقييم دووودة للأعمال',
      'ترويج المسابقات',
    ],
    features_en: [
      '25,000,000 tokens/month',
      'Purchase additional token packages',
      'Doooda AI evaluation for submissions',
      'Competition boost & promotion',
    ],
    popular: false,
  },
];

export default function PartnerUpgradeModal({ onClose, reason = 'tokens' }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const reasons = {
    tokens: {
      ar: 'نفدت توكناتك التجريبية',
      en: 'Your trial tokens have run out',
    },
    boost: {
      ar: 'ترويج المسابقات متاح للباقات المدفوعة',
      en: 'Competition boost is available on paid plans',
    },
    evaluation: {
      ar: 'تقييم دووودة متاح للباقات المدفوعة',
      en: 'Doooda AI evaluation is available on paid plans',
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>
                {isRTL ? reasons[reason].ar : reasons[reason].en}
              </p>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'ارقَ إلى باقة أعلى' : 'Upgrade Your Plan'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className="rounded-2xl p-5 relative"
              style={{
                backgroundColor: plan.bg,
                border: `2px solid ${plan.border}`,
              }}
            >
              {plan.popular && (
                <span
                  className="absolute top-3 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    [isRTL ? 'left' : 'right']: '0.75rem',
                    backgroundColor: 'rgba(107,114,128,0.15)',
                    color: plan.color,
                    border: `1px solid ${plan.border}`,
                  }}
                >
                  {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
                </span>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold mb-0.5" style={{ color: plan.color }}>
                  {isRTL ? 'باقة' : 'Plan'}
                </p>
                <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? plan.name_ar : plan.name_en}
                </h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold" style={{ color: plan.color }}>
                    ${plan.price_usd}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? '/ شهر' : '/ month'}
                  </span>
                </div>
                <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {plan.tokens.toLocaleString()} {isRTL ? 'توكن' : 'tokens'}
                </p>
              </div>

              <ul className="space-y-2 mb-5">
                {(isRTL ? plan.features_ar : plan.features_en).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke={plan.color} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: plan.color, color: 'white' }}
                onClick={() => alert(isRTL ? 'سيتواصل معك فريق دووودة لإتمام الترقية' : 'The Doooda team will contact you to complete the upgrade')}
              >
                {isRTL ? `الترقية إلى ${plan.name_ar}` : `Upgrade to ${plan.name_en}`}
              </button>
            </div>
          ))}
        </div>

        <div
          className="px-6 pb-5 text-center text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {isRTL
            ? 'سيتواصل معك فريق دووودة عبر البريد الإلكتروني لإتمام عملية الترقية والدفع'
            : 'Our team will contact you by email to complete the upgrade and payment process'}
        </div>
      </div>
    </div>
  );
}
