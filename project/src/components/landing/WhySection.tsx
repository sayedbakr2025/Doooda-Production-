import { Brain, LineChart, LayoutDashboard, PenLine } from 'lucide-react';

interface WhyContent {
  section_title: string;
  feat1_title: string;
  feat1_desc: string;
  feat2_title: string;
  feat2_desc: string;
  feat3_title: string;
  feat3_desc: string;
  feat4_title: string;
  feat4_desc: string;
}

interface WhySectionProps {
  content: WhyContent;
  language: 'ar' | 'en';
}

const LensShaddaIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="7.5" stroke="currentColor" strokeWidth="2"/>
    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <text x="6.5" y="14" fontSize="9" fontWeight="bold" fill="currentColor" fontFamily="serif" textAnchor="middle">ّ</text>
  </svg>
);

const features = [
  { key: 'feat1', icon: Brain, accent: true, customIcon: false },
  { key: 'feat2', icon: PenLine, accent: false, customIcon: false },
  { key: 'feat3', icon: LayoutDashboard, accent: true, customIcon: false },
  { key: 'feat4', icon: LineChart, accent: false, customIcon: true },
];

export default function WhySection({ content, language }: WhySectionProps) {
  const isRTL = language === 'ar';

  return (
    <section id="features" className="py-24" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-black mb-4"
            style={{ color: '#111827' }}
          >
            {content.section_title}
          </h2>
          <div className="w-12 h-1 rounded-full mx-auto" style={{ backgroundColor: '#d62828' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ key, icon: Icon, accent }) => {
            const title = content[`${key}_title` as keyof WhyContent];
            const desc = content[`${key}_desc` as keyof WhyContent];
            const isProofreader = key === 'feat4';
            return (
              <div
                key={key}
                className="group p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  border: `1.5px solid ${accent ? 'rgba(214,40,40,0.15)' : '#e5e7eb'}`,
                  backgroundColor: accent ? '#fff8f8' : '#ffffff',
                }}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: accent ? 'rgba(214,40,40,0.1)' : '#f3f4f6',
                  }}
                >
                  {isProofreader ? (
                    <LensShaddaIcon
                      className="w-6 h-6"
                      style={{ color: '#111827' }}
                    />
                  ) : (
                    <Icon
                      className="w-5 h-5"
                      style={{ color: accent ? '#d62828' : '#111827' }}
                    />
                  )}
                </div>
                <h3
                  className="text-base font-bold mb-2"
                  style={{ color: '#111827' }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  {desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
