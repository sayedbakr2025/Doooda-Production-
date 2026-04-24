import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';

interface PricingContent {
  section_title: string;
  plan1_name: string;
  plan1_price: string;
  plan1_period: string;
  plan2_name: string;
  plan2_price: string;
  plan2_period: string;
  plan3_name: string;
  plan3_price: string;
  plan3_period: string;
  cta: string;
  tokens_label: string;
}

interface PricingSectionProps {
  content: PricingContent;
  language: 'ar' | 'en';
}

function parsePrice(priceStr: string): number {
  const match = priceStr.replace(/[^0-9.]/g, '');
  return parseFloat(match) || 0;
}

export default function PricingSection({ content, language }: PricingSectionProps) {
  const isRTL = language === 'ar';
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyLabel = language === 'ar' ? 'شهري' : 'Monthly';
  const yearlyLabel = language === 'ar' ? 'سنوي' : 'Yearly';
  const saveLabel = language === 'ar' ? 'وفّر 10%' : 'Save 10%';
  const periodMonthly = language === 'ar' ? 'شهريًا' : '/month';
  const periodYearly = language === 'ar' ? 'سنويًا' : '/year';
  const beforeDiscountLabel = language === 'ar' ? 'بدلاً من' : 'instead of';

  function getYearlyDisplay(monthlyPriceStr: string) {
    const monthly = parsePrice(monthlyPriceStr);
    if (!monthly) return null;
    const full = monthly * 12;
    const discounted = Math.round(full * 0.9);
    if (language === 'ar') {
      return { discounted: `${discounted}$`, before: `${full}$` };
    }
    return { discounted: `$${discounted}`, before: `$${full}` };
  }

  const plans = [
    {
      name: content.plan1_name,
      price: content.plan1_price,
      period: content.plan1_period,
      highlighted: false,
      noYearly: true,
      features: language === 'ar'
        ? ['مشاريع غير محدودة', '10,000 توكن هدية', 'بعض الحبكات الجاهزة', 'بعض الكورسات مجانية', 'دخول مجتمع دووودة']
        : ['Unlimited projects', '10,000 gift tokens', 'Some ready-made plots', 'Some free courses', 'Doooda community access'],
      disabled: language === 'ar'
        ? ['بدون تحميل', 'بدون تسويق']
        : ['No export', 'No marketing'],
    },
    {
      name: content.plan2_name,
      price: content.plan2_price,
      period: content.plan2_period,
      highlighted: true,
      badge: language === 'ar' ? 'الأكثر شيوعًا' : 'Most Popular',
      features: language === 'ar'
        ? ['120,000 توكن شهريًا', 'مشاريع غير محدودة', 'الحبكات المجانية + البريميوم', 'تحميل PDF + Word', 'التسويق والنشر', 'كل الكورسات مجانًا', 'دخول مجتمع دووودة']
        : ['120,000 tokens/month', 'Unlimited projects', 'Free + premium plots', 'Export PDF + Word', 'Marketing & Publishing', 'All courses free', 'Doooda community access'],
      extra: content.tokens_label,
    },
    {
      name: content.plan3_name,
      price: content.plan3_price,
      period: content.plan3_period,
      highlighted: false,
      features: language === 'ar'
        ? ['300,000 توكن شهريًا', 'مشاريع غير محدودة', 'كل الحبكات متاحة', 'تحميل PDF + Word', 'التسويق والنشر', 'كل الكورسات مجانًا', 'دخول مجتمع دووودة']
        : ['300,000 tokens/month', 'Unlimited projects', 'All plots available', 'Export PDF + Word', 'Marketing & Publishing', 'All courses free', 'Doooda community access'],
      extra: content.tokens_label,
    },
  ];

  return (
    <section id="pricing" className="py-24" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10" dir={isRTL ? 'rtl' : 'ltr'}>
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: '#111827' }}>
            {content.section_title}
          </h2>
          <div className="w-12 h-1 rounded-full mx-auto" style={{ backgroundColor: '#d62828' }} />
        </div>

        <div className="flex items-center justify-center mb-10" dir={isRTL ? 'rtl' : 'ltr'}>
          <div
            className="flex items-center rounded-xl p-1 gap-1"
            style={{ backgroundColor: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
          >
            <button
              onClick={() => setBilling('monthly')}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: billing === 'monthly' ? '#111827' : 'transparent',
                color: billing === 'monthly' ? '#ffffff' : '#6b7280',
              }}
            >
              {monthlyLabel}
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                backgroundColor: billing === 'yearly' ? '#111827' : 'transparent',
                color: billing === 'yearly' ? '#ffffff' : '#6b7280',
              }}
            >
              {yearlyLabel}
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: '#d62828', color: '#ffffff' }}
              >
                {saveLabel}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start" dir={isRTL ? 'rtl' : 'ltr'}>
          {plans.map((plan, i) => {
            const yearly = !plan.noYearly ? getYearlyDisplay(plan.price) : null;
            const showYearly = billing === 'yearly' && yearly;

            return (
              <div
                key={i}
                className="relative rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                style={{
                  border: plan.highlighted ? '2px solid #d62828' : '1.5px solid #e5e7eb',
                  backgroundColor: plan.highlighted ? '#fff8f8' : '#ffffff',
                  boxShadow: plan.highlighted ? '0 8px 32px rgba(214,40,40,0.12)' : 'none',
                }}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {plan.highlighted && 'badge' in plan && (
                  <div
                    className="text-center py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: '#d62828' }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-base font-bold mb-1" style={{ color: '#111827' }}>
                    {plan.name}
                  </h3>

                  <div className="mb-6 mt-3" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    {showYearly ? (
                      <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className="text-4xl font-black"
                            style={{ color: plan.highlighted ? '#d62828' : '#111827' }}
                          >
                            {yearly!.discounted}
                          </span>
                          <span className="text-sm" style={{ color: '#9ca3af' }}>{periodYearly}</span>
                        </div>
                        <div className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
                          {beforeDiscountLabel}{' '}
                          <span style={{ textDecoration: 'line-through' }}>{yearly!.before}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span
                          className="text-4xl font-black"
                          style={{ color: plan.highlighted ? '#d62828' : '#111827' }}
                        >
                          {plan.price}
                        </span>
                        <span className="text-sm ms-1" style={{ color: '#9ca3af' }}>
                          {plan.noYearly ? plan.period : periodMonthly}
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.highlighted ? '#d62828' : '#10b981' }} />
                        <span style={{ color: '#374151' }}>{feat}</span>
                      </li>
                    ))}
                    {'disabled' in plan && plan.disabled && plan.disabled.map((feat, j) => (
                      <li key={`d-${j}`} className="flex items-center gap-2.5 text-sm">
                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                          <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#9ca3af' }} />
                        </div>
                        <span style={{ color: '#9ca3af', textDecoration: 'line-through' }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {'extra' in plan && plan.extra && (
                    <div
                      className="flex items-center gap-2 text-xs mb-4 px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: '#f3f4f6',
                        color: '#111827',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                      {plan.extra}
                    </div>
                  )}

                  <Link
                    to="/signup"
                    className="block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all"
                    style={{
                      backgroundColor: plan.highlighted ? '#d62828' : 'transparent',
                      color: plan.highlighted ? 'white' : '#111827',
                      border: plan.highlighted ? 'none' : '1.5px solid #e5e7eb',
                    }}
                    onMouseEnter={e => {
                      if (plan.highlighted) {
                        e.currentTarget.style.backgroundColor = '#b91c1c';
                      } else {
                        e.currentTarget.style.backgroundColor = '#111827';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.borderColor = '#111827';
                      }
                    }}
                    onMouseLeave={e => {
                      if (plan.highlighted) {
                        e.currentTarget.style.backgroundColor = '#d62828';
                      } else {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#111827';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    {content.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
