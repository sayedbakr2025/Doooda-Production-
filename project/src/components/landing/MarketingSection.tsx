import { FileDown, Building2, Trophy, Award } from 'lucide-react';

interface MarketingContent {
  section_label: string;
  title: string;
  point1: string;
  point2: string;
  point3: string;
  point4: string;
}

interface MarketingSectionProps {
  content: MarketingContent;
  language: 'ar' | 'en';
}

export default function MarketingSection({ content, language }: MarketingSectionProps) {
  const isRTL = language === 'ar';
  const items = [
    { point: content.point1, icon: FileDown, accent: true },
    { point: content.point2, icon: Building2, accent: false },
    { point: content.point3, icon: Trophy, accent: true },
    { point: content.point4, icon: Award, accent: false },
  ];

  return (
    <section className="py-24" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16" dir={isRTL ? 'rtl' : 'ltr'}>
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{ color: '#d62828', backgroundColor: 'rgba(214,40,40,0.08)' }}
          >
            {content.section_label}
          </span>
          <h2
            className="text-3xl md:text-4xl font-black"
            style={{ color: '#111827' }}
          >
            {content.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {items.map(({ point, icon: Icon, accent }, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-6 rounded-2xl group hover:-translate-y-0.5 transition-all"
              style={{
                backgroundColor: accent ? '#fff8f8' : '#ffffff',
                border: `1.5px solid ${accent ? 'rgba(214,40,40,0.15)' : '#e5e7eb'}`,
              }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: accent ? 'rgba(214,40,40,0.1)' : '#f3f4f6',
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: '#111827' }}
                />
              </div>
              <p className="text-sm font-medium leading-relaxed pt-1.5" style={{ color: '#374151' }}>
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
