import { BookOpen, Users, TrendingUp, BookMarked } from 'lucide-react';

interface AcademyContent {
  section_label: string;
  title: string;
  point1: string;
  point2: string;
  point3: string;
  point4: string;
}

interface AcademySectionProps {
  content: AcademyContent;
  language: 'ar' | 'en';
}

export default function AcademySection({ content, language }: AcademySectionProps) {
  const isRTL = language === 'ar';
  const icons = [BookOpen, Users, TrendingUp, BookMarked];
  const points = [content.point1, content.point2, content.point3, content.point4];

  return (
    <section id="academy" className="py-24" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16" dir={isRTL ? 'rtl' : 'ltr'}>
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{ color: '#374151', backgroundColor: '#f3f4f6' }}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {points.map((point, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="p-6 rounded-2xl text-center group hover:-translate-y-1 transition-all"
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1.5px solid #e5e7eb',
                }}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: '#111827' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                  {point}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
