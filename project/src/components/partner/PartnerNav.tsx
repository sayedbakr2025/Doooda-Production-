import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Menu, X, ChevronDown } from 'lucide-react';
import DooodaLogo from '../DooodaLogo';

interface PartnerNavProps {
  lang: 'ar' | 'en';
  onLangChange: (l: 'ar' | 'en') => void;
}

export default function PartnerNav({ lang, onLangChange }: PartnerNavProps) {
  const isRTL = lang === 'ar';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = () => setLangOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navLinks = [
    { labelAr: 'المزايا', labelEn: 'Features', id: 'features' },
    { labelAr: 'كيف يعمل', labelEn: 'How it works', id: 'how-it-works' },
    { labelAr: 'المؤسسات', labelEn: 'Institutions', id: 'institutions' },
    { labelAr: 'الأسئلة', labelEn: 'FAQ', id: 'faq' },
  ];

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: '#0f172a',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
        <Link to="/" className="flex items-center flex-shrink-0">
          <div style={{ transform: 'scale(0.75)', transformOrigin: isRTL ? 'right center' : 'left center' }}>
            <DooodaLogo light />
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map(({ labelAr, labelEn, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm font-medium transition-colors"
              style={{ color: '#d1d5db' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
            >
              {isRTL ? labelAr : labelEn}
            </button>
          ))}

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLangOpen(v => !v)}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: '#d1d5db' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
            >
              <Globe className="w-4 h-4" />
              {lang === 'ar' ? 'العربية' : 'English'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div
                className="absolute top-full mt-2 w-36 rounded-xl shadow-lg overflow-hidden"
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  [isRTL ? 'right' : 'left']: 0,
                }}
              >
                {(['ar', 'en'] as const).map(code => (
                  <button
                    key={code}
                    onClick={() => { onLangChange(code); setLangOpen(false); }}
                    className="w-full text-start px-4 py-2.5 text-sm transition-colors flex items-center justify-between"
                    style={{ color: lang === code ? '#d62828' : '#d1d5db' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#334155')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {code === 'ar' ? 'العربية' : 'English'}
                    {lang === code && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d62828' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/partners/login"
            className="text-sm font-medium transition-colors"
            style={{ color: '#d1d5db' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
            onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
          >
            {isRTL ? 'تسجيل الدخول' : 'Log In'}
          </Link>

          <button
            onClick={() => scrollTo('join')}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#d62828' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#d62828')}
          >
            {isRTL ? 'انضم الآن' : 'Join Now'}
          </button>
        </div>

        <button
          className="lg:hidden p-2 rounded-lg"
          onClick={() => setMobileOpen(v => !v)}
          style={{ color: '#d1d5db' }}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden px-6 pb-6 space-y-1"
          style={{ backgroundColor: '#0f172a', borderTop: '1px solid #1f2937' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {navLinks.map(({ labelAr, labelEn, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="block w-full text-sm font-medium py-3 transition-colors"
              style={{ color: '#d1d5db', textAlign: isRTL ? 'right' : 'left' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
            >
              {isRTL ? labelAr : labelEn}
            </button>
          ))}
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => onLangChange('ar')}
              className="flex-1 py-2 rounded-lg text-sm font-medium border"
              style={{
                backgroundColor: lang === 'ar' ? '#d62828' : 'transparent',
                borderColor: lang === 'ar' ? '#d62828' : '#334155',
                color: lang === 'ar' ? 'white' : '#d1d5db',
              }}
            >
              العربية
            </button>
            <button
              onClick={() => onLangChange('en')}
              className="flex-1 py-2 rounded-lg text-sm font-medium border"
              style={{
                backgroundColor: lang === 'en' ? '#d62828' : 'transparent',
                borderColor: lang === 'en' ? '#d62828' : '#334155',
                color: lang === 'en' ? 'white' : '#d1d5db',
              }}
            >
              English
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <Link
              to="/partners/login"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center border"
              style={{ color: '#d1d5db', borderColor: '#334155' }}
            >
              {isRTL ? 'تسجيل الدخول' : 'Log In'}
            </Link>
            <button
              onClick={() => scrollTo('join')}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center text-white"
              style={{ backgroundColor: '#d62828' }}
            >
              {isRTL ? 'انضم الآن' : 'Join Now'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
