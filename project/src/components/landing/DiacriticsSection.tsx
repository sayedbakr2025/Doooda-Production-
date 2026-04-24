import { Link } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';

interface DiacriticsContent {
  section_label: string;
  title: string;
  description: string;
  before_label: string;
  after_label: string;
  before_text: string;
  after_text: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  bullet4: string;
  tip: string;
  cta: string;
}

interface DiacriticsSectionProps {
  content: DiacriticsContent;
  language: 'ar' | 'en';
}

export default function DiacriticsSection({ content, language }: DiacriticsSectionProps) {
  const isRTL = language === 'ar';
  const bullets = [content.bullet1, content.bullet2, content.bullet3, content.bullet4];

  return (
    <section className="py-24" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div
          className={`flex flex-col lg:flex-row items-start gap-14 ${isRTL ? 'lg:flex-row-reverse' : ''}`}
        >
          <div className="flex-1 space-y-7" dir={isRTL ? 'rtl' : 'ltr'}>
            <div>
              <span
                className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
                style={{ color: '#374151', backgroundColor: '#f3f4f6' }}
              >
                {content.section_label}
              </span>
              <h2
                className="text-3xl md:text-4xl font-black leading-tight mb-4"
                style={{ color: '#111827' }}
              >
                {content.title}
              </h2>
              <p className="text-base leading-relaxed" style={{ color: '#6b7280' }}>
                {content.description}
              </p>
            </div>

            <ul className="space-y-3">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(214,40,40,0.1)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: '#d62828' }} />
                  </div>
                  <span className="text-sm" style={{ color: '#374151' }}>{b}</span>
                </li>
              ))}
            </ul>

            <div
              className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
              <span style={{ color: '#92400e' }}>{content.tip}</span>
            </div>

            <Link
              to="/signup"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: 'transparent',
                color: '#111827',
                border: '1.5px solid #e5e7eb',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#111827';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#111827';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              {content.cta}
            </Link>
          </div>

          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ backgroundColor: '#f9fafb', border: '1.5px solid #e5e7eb' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9ca3af' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                    {content.before_label}
                  </span>
                </div>
                <p
                  className="text-base leading-8 font-medium"
                  style={{ color: '#6b7280', fontFamily: 'serif', direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  {content.before_text}
                </p>
              </div>

              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ backgroundColor: '#fff8f8', border: '1.5px solid #fca5a5' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d62828' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#d62828' }}>
                    {content.after_label}
                  </span>
                </div>
                <p
                  className="text-base leading-8 font-medium"
                  style={{ color: '#111827', fontFamily: 'serif', direction: isRTL ? 'rtl' : 'ltr' }}
                >
                  {content.after_text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
