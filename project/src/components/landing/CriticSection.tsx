import { Check } from 'lucide-react';

interface CriticContent {
  section_label: string;
  title: string;
  point1: string;
  point2: string;
  point3: string;
  point4: string;
}

interface CriticSectionProps {
  content: CriticContent;
  language: 'ar' | 'en';
}

export default function CriticSection({ content, language }: CriticSectionProps) {
  const isRTL = language === 'ar';
  const points = [content.point1, content.point2, content.point3, content.point4];

  return (
    <section className="py-24" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div
          className={`flex flex-col lg:flex-row items-center gap-12 ${isRTL ? 'lg:flex-row-reverse' : ''}`}
        >
          <div className="flex-1 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div>
              <span
                className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
                style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(214,40,40,0.08)' }}
              >
                {content.section_label}
              </span>
              <h2
                className="text-3xl md:text-4xl font-black leading-tight"
                style={{ color: '#111827' }}
              >
                {content.title}
              </h2>
            </div>

            <ul className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(214,40,40,0.1)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: '#d62828' }} />
                  </div>
                  <span className="text-base" style={{ color: '#374151' }}>
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 w-full">
            <div
              className="rounded-2xl overflow-hidden shadow-xl border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: '#ffffff' }}
            >
              <div
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                  {language === 'ar' ? 'دووودة الناقد — توتر الحبكة' : 'Doooda Critic — Plot Tension'}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                </div>
              </div>
              <div className="p-5">
                <div className="relative h-44 w-full">
                  <svg
                    viewBox="0 0 600 160"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      <linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d62828" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#d62828" stopOpacity="0.03" />
                      </linearGradient>
                    </defs>

                    {[0, 150, 300, 450, 600].map((x) => (
                      <line key={x} x1={x} y1="0" x2={x} y2="160" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
                    ))}

                    <path
                      d="M0,30 C40,30 60,120 150,95 C200,78 230,55 300,52 C360,50 390,55 450,52 C500,50 530,58 600,42"
                      fill="url(#redFill)"
                      stroke="none"
                    />
                    <path
                      d="M0,30 C40,30 60,120 150,95 C200,78 230,55 300,52 C360,50 390,55 450,52 C500,50 530,58 600,42"
                      fill="none"
                      stroke="#d62828"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M0,55 C50,55 80,135 150,110 C210,90 240,65 300,52 C360,40 390,58 450,55 C500,53 530,72 600,88"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.75"
                    />

                    {[
                      { x: 0, y: 30, red: true },
                      { x: 150, y: 95, red: true },
                      { x: 300, y: 52, red: true, midpoint: true },
                      { x: 450, y: 52, red: true },
                      { x: 600, y: 42, red: true },
                    ].map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.midpoint ? 6 : 4}
                        fill={pt.midpoint ? '#f59e0b' : '#d62828'}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}

                    {[
                      { x: 0, y: 55 },
                      { x: 150, y: 110 },
                      { x: 300, y: 52 },
                      { x: 450, y: 55 },
                      { x: 600, y: 88 },
                    ].map((pt, i) => (
                      <circle
                        key={`p-${i}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={3.5}
                        fill="#8b5cf6"
                        stroke="white"
                        strokeWidth="1.5"
                        fillOpacity="0.85"
                      />
                    ))}

                    <g>
                      <circle cx="300" cy="52" r="10" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6" />
                      <text
                        x="300"
                        y={language === 'ar' ? 38 : 38}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#f59e0b"
                        fontWeight="600"
                      >
                        {language === 'ar' ? 'نقطة المنتصف' : 'Midpoint'}
                      </text>
                    </g>
                  </svg>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: language === 'ar' ? 'جودة الحبكة' : 'Plot Quality', value: '87%', color: '#10b981' },
                    { label: language === 'ar' ? 'التوتر الدرامي' : 'Dramatic Tension', value: '92%', color: 'var(--color-accent)' },
                    { label: language === 'ar' ? 'التصعيد' : 'Build-up', value: '78%', color: '#3b82f6' },
                    { label: language === 'ar' ? 'السببية' : 'Causality', value: '84%', color: '#f59e0b' },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: '#f9fafb', border: '1px solid var(--color-border)' }}
                    >
                      <div className="text-xs mb-1" style={{ color: '#9ca3af' }}>
                        {stat.label}
                      </div>
                      <div className="text-lg font-bold" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
