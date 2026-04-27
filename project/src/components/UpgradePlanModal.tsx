import { useState, useEffect } from 'react';
import { X, Check, Zap, Crown, Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';

interface Plan {
  name: string;
  name_ar: string;
  name_en: string;
  monthly_tokens: number;
  price: string;
  code: string;
}

interface UpgradePlanModalProps {
  onClose: () => void;
  currentPlan: string;
}

const PLAN_ICONS: Record<string, typeof Star> = {
  free: Star,
  pro: Zap,
  max: Crown,
};

const PLAN_FEATURES: Record<string, { ar: string[]; en: string[] }> = {
  free: {
    ar: ['10,000 توكن هدية', 'مشاريع غير محدودة', 'بعض الحبكات الجاهزة', 'بعض الكورسات مجانية', 'دخول مجتمع دووودة'],
    en: ['10,000 gift tokens', 'Unlimited projects', 'Some ready-made plots', 'Some free courses', 'Doooda community access'],
  },
  pro: {
    ar: ['100,000 توكن شهريًا', 'مشاريع غير محدودة', 'الحبكات المجانية + البريميوم', 'تحميل PDF + Word', 'التسويق والنشر', 'كل الكورسات مجانًا'],
    en: ['100,000 tokens/month', 'Unlimited projects', 'Free + premium plots', 'Export PDF + Word', 'Marketing & Publishing', 'All courses free'],
  },
  max: {
    ar: ['250,000 توكن شهريًا', 'مشاريع غير محدودة', 'كل الحبكات متاحة', 'تحميل PDF + Word', 'التسويق والنشر', 'كل الكورسات مجانًا'],
    en: ['250,000 tokens/month', 'Unlimited projects', 'All plots available', 'Export PDF + Word', 'Marketing & Publishing', 'All courses free'],
  },
};

const PLAN_DISPLAY: Record<string, { ar: string; en: string; color: string }> = {
  free: { ar: 'كاتب هاوي',  en: 'Hobbyist Writer',     color: '#6b7280' },
  pro:  { ar: 'كاتب جاد',   en: 'Serious Writer',       color: '#d62828' },
  max:  { ar: 'كاتب محترف', en: 'Professional Writer',  color: '#b45309' },
};

const PLAN_ORDER = ['free', 'pro', 'max'];

function getPlanLabel(key: string, normalizedPlan: string, language: 'ar' | 'en'): string {
  if (key === normalizedPlan) {
    return language === 'ar' ? 'أنت الآن على هذه الباقة' : 'Your current plan';
  }
  const currentIdx = PLAN_ORDER.indexOf(normalizedPlan);
  const targetIdx = PLAN_ORDER.indexOf(key);
  if (targetIdx > currentIdx) {
    return language === 'ar' ? 'ترقية — قريبًا' : 'Upgrade — Coming Soon';
  }
  return language === 'ar' ? 'تخفيض — قريبًا' : 'Downgrade — Coming Soon';
}

export default function UpgradePlanModal({ onClose, currentPlan }: UpgradePlanModalProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('plans')
      .select('name, name_ar, name_en, monthly_tokens, price, code')
      .order('price', { ascending: true })
      .then(({ data }) => {
        const sorted = (data || []).sort(
          (a, b) => PLAN_ORDER.indexOf(a.code || a.name?.toLowerCase() || '') - PLAN_ORDER.indexOf(b.code || b.name?.toLowerCase() || '')
        );
        setPlans(sorted);
        setLoading(false);
      });
  }, []);

  const normalizedPlan = currentPlan?.toLowerCase() || 'free';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? 'خطط الاشتراك' : 'Subscription Plans'}
            </h2>
<p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar'
                  ? `أنت حاليًا على خطة ${PLAN_DISPLAY[normalizedPlan]?.ar || normalizedPlan}`
                  : `You are currently on the ${PLAN_DISPLAY[normalizedPlan]?.en || normalizedPlan} plan`}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-accent)', opacity: 0.8 }}>
                {language === 'ar'
                  ? '✨ التوكنز غير المستخدمة يتم ترحيلها للشهر التالي'
                  : '✨ Unused tokens roll over to the next month'}
              </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)' }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map(plan => {
                const key = (plan.code || plan.name).toLowerCase();
                const info = PLAN_DISPLAY[key] || { ar: plan.name_ar || plan.name, en: plan.name_en || plan.name, color: '#6b7280' };
                const features = PLAN_FEATURES[key];
                const Icon = PLAN_ICONS[key] || Star;
                const isCurrent = key === normalizedPlan;
                const isHighlighted = key === 'pro';
                const price = parseFloat(plan.price);
                const buttonLabel = getPlanLabel(key, normalizedPlan, language);

                return (
                  <div
                    key={key}
                    className="relative rounded-xl flex flex-col"
                    style={{
                      border: isCurrent
                        ? `2px solid ${info.color}`
                        : isHighlighted && !isCurrent
                        ? '2px solid var(--color-accent)'
                        : '1.5px solid var(--color-border)',
                      backgroundColor: isCurrent
                        ? `${info.color}08`
                        : 'var(--color-bg-secondary)',
                      padding: '1.25rem',
                    }}
                  >
                    {isCurrent && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: info.color, color: '#fff' }}
                      >
                        {language === 'ar' ? 'خطتك الحالية' : 'Current Plan'}
                      </span>
                    )}

                    {!isCurrent && isHighlighted && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                      >
                        {language === 'ar' ? 'الأكثر شيوعًا' : 'Most Popular'}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${info.color}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: info.color }} />
                      </span>
                      <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {language === 'ar' ? info.ar : info.en}
                      </span>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-black" style={{ color: isCurrent ? info.color : 'var(--color-text-primary)' }}>
                        {price === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `$${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-xs ms-1" style={{ color: 'var(--color-text-tertiary)' }}>
                          {language === 'ar' ? '/شهريًا' : '/mo'}
                        </span>
                      )}
                    </div>

                    {features && (
                      <ul className="space-y-1.5 mb-4 flex-1">
                        {(language === 'ar' ? features.ar : features.en).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: info.color }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      disabled
                      className="w-full py-2 rounded-lg text-sm font-semibold mt-auto cursor-default"
                      style={{
                        backgroundColor: `${info.color}18`,
                        color: info.color,
                        opacity: isCurrent ? 1 : 0.6,
                      }}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-tertiary)' }}>
            {language === 'ar'
              ? 'ميزة الدفع والتحديث ستكون متاحة قريبًا.'
              : 'Payment and plan switching will be available soon.'}
          </p>
        </div>
      </div>
    </div>
  );
}
