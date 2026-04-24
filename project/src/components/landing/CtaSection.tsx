import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CtaContent {
  title: string;
  subtitle: string;
  button: string;
}

interface CtaSectionProps {
  content: CtaContent;
  language: 'ar' | 'en';
}

export default function CtaSection({ content, language }: CtaSectionProps) {
  const isRTL = language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="py-24" style={{ backgroundColor: '#111827' }}>
      <div className="max-w-3xl mx-auto px-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
          {content.title}
        </h2>
        <p className="text-base mb-10" style={{ color: '#9ca3af' }}>
          {content.subtitle}
        </p>
        <Link
          to="/signup"
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all hover:shadow-2xl hover:-translate-y-0.5"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
        >
          {content.button}
          <ArrowIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
