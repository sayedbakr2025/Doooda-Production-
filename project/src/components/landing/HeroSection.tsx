import { Link } from 'react-router-dom';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';

interface HeroContent {
  headline: string;
  subheadline: string;
  cta_primary: string;
  cta_secondary: string;
  badge_1: string;
  badge_2: string;
  badge_3: string;
}

interface HeroSectionProps {
  content: HeroContent;
  language: 'ar' | 'en';
}

export default function HeroSection({ content, language }: HeroSectionProps) {
  const isRTL = language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section
      className="min-h-screen flex items-center justify-center pt-16"
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 tracking-wider uppercase"
          style={{
            backgroundColor: '#fff1f1',
            color: 'var(--color-accent)',
            border: '1px solid rgba(214,40,40,0.15)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          {language === 'ar' ? 'منصة الكتابة الاحترافية' : 'Professional Writing Platform'}
        </div>

        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight"
          style={{ color: '#111827', lineHeight: '1.1' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {content.headline}
        </h1>

        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: '#374151' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {content.subheadline}
        </p>

        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <Link
            to="/signup"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          >
            {content.cta_primary}
            <ArrowIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5"
            style={{
              color: '#111827',
              border: '1.5px solid #e5e7eb',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {content.cta_secondary}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8" dir={isRTL ? 'rtl' : 'ltr'}>
          {[content.badge_1, content.badge_2, content.badge_3].map((badge, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(214,40,40,0.1)' }}
              >
                <Check className="w-3 h-3" style={{ color: '#d62828' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: '#374151' }}>
                {badge}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-20 relative">
          <div
            className="absolute inset-x-0 -bottom-4 h-24 rounded-b-2xl"
            style={{ background: 'linear-gradient(to bottom, transparent, #f9fafb)' }}
          />
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="h-8 flex items-center gap-2 px-4"
              style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
              <div
                className="flex-1 h-5 rounded-md mx-4"
                style={{ backgroundColor: '#e5e7eb' }}
              />
            </div>
            <div
              className="h-72 flex flex-col"
              style={{ backgroundColor: '#fafafa' }}
            >
              <div className="flex-1 relative px-6 pt-6">
                <svg
                  viewBox="0 0 700 180"
                  preserveAspectRatio="none"
                  className="w-full h-full"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="heroRedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d62828" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#d62828" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {[0, 175, 350, 525, 700].map((x) => (
                    <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,4" />
                  ))}
                  {[45, 90, 135].map((y) => (
                    <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                  ))}

                  <path
                    d="M0,35 C50,35 70,130 175,105 C230,88 260,60 350,57 C420,55 450,62 525,57 C570,54 610,65 700,48"
                    fill="url(#heroRedFill)"
                    stroke="none"
                  />
                  <path
                    d="M0,35 C50,35 70,130 175,105 C230,88 260,60 350,57 C420,55 450,62 525,57 C570,54 610,65 700,48"
                    fill="none"
                    stroke="#d62828"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M0,62 C55,62 85,145 175,120 C240,100 270,72 350,57 C420,44 450,65 525,62 C570,60 610,80 700,100"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.7"
                  />

                  {[
                    { x: 0, y: 35 },
                    { x: 175, y: 105 },
                    { x: 350, y: 57, mid: true },
                    { x: 525, y: 57 },
                    { x: 700, y: 48 },
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.mid ? 7 : 4.5}
                      fill={pt.mid ? '#f59e0b' : '#d62828'}
                      stroke="white"
                      strokeWidth="2"
                    />
                  ))}

                  {[
                    { x: 0, y: 62 },
                    { x: 175, y: 120 },
                    { x: 350, y: 57 },
                    { x: 525, y: 62 },
                    { x: 700, y: 100 },
                  ].map((pt, i) => (
                    <circle
                      key={`v-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={4}
                      fill="#8b5cf6"
                      stroke="white"
                      strokeWidth="2"
                      fillOpacity="0.85"
                    />
                  ))}

                  <circle cx="350" cy="57" r="12" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.55" />
                  <text x="350" y="42" textAnchor="middle" fontSize="11" fill="#f59e0b" fontWeight="600">
                    {language === 'ar' ? 'نقطة المنتصف' : 'Midpoint'}
                  </text>
                </svg>
              </div>
              <div className="pb-3 text-center">
                <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>
                  {language === 'ar' ? 'مخطط دووودة الناقد — توتر الحبكة' : 'Doooda Critic Graph — Plot Tension'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
