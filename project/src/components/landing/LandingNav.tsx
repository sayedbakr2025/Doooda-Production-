import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Globe, Menu, X } from 'lucide-react';
import DooodaLogo from '../DooodaLogo';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavContent {
  features: string;
  academy: string;
  community: string;
  pricing: string;
  links_label: string;
  about: string;
  contact: string;
  privacy: string;
  terms: string;
  login: string;
  signup_cta: string;
}

interface LandingNavProps {
  content: NavContent;
}

export default function LandingNav({ content }: LandingNavProps) {
  const { language, setLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = () => { setLangOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navLinks = [
    { label: content.features, id: 'features' },
    { label: content.academy, id: 'academy' },
    { label: content.community, id: 'community' },
    { label: content.pricing, id: 'pricing' },
  ];

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: '#0f172a',
        backdropFilter: 'none',
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
          {navLinks.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm font-medium transition-colors"
              style={{ color: '#d1d5db' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
            >
              {label}
            </button>
          ))}

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setLangOpen(v => !v); }}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: '#d1d5db' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
            >
              <Globe className="w-4 h-4" />
              {language === 'ar' ? 'العربية' : 'English'}
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
                {[
                  { code: 'ar' as const, label: 'العربية' },
                  { code: 'en' as const, label: 'English' },
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                    className="w-full text-start px-4 py-2.5 text-sm transition-colors flex items-center justify-between"
                    style={{ color: language === l.code ? '#d62828' : '#d1d5db' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#334155')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {l.label}
                    {language === l.code && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d62828' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/login"
            className="text-sm font-medium transition-colors"
            style={{ color: '#d1d5db' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
            onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
          >
            {content.login}
          </Link>

          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#d62828' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#d62828')}
          >
            {content.signup_cta}
          </Link>
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
          className="lg:hidden px-6 pb-6 space-y-4"
          style={{
            backgroundColor: '#0f172a',
            borderTop: '1px solid #1f2937',
          }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {navLinks.map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="block w-full text-sm font-medium py-2 transition-colors"
              style={{ color: '#d1d5db', textAlign: isRTL ? 'right' : 'left' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d62828')}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
            >
              {item.label}
            </button>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setLanguage('ar')}
              className="flex-1 py-2 rounded-lg text-sm font-medium border"
              style={{
                backgroundColor: language === 'ar' ? '#d62828' : 'transparent',
                borderColor: language === 'ar' ? '#d62828' : '#334155',
                color: language === 'ar' ? 'white' : '#d1d5db',
              }}
            >
              العربية
            </button>
            <button
              onClick={() => setLanguage('en')}
              className="flex-1 py-2 rounded-lg text-sm font-medium border"
              style={{
                backgroundColor: language === 'en' ? '#d62828' : 'transparent',
                borderColor: language === 'en' ? '#d62828' : '#334155',
                color: language === 'en' ? 'white' : '#d1d5db',
              }}
            >
              English
            </button>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center border" style={{ color: '#d1d5db', borderColor: '#334155' }}>
              {content.login}
            </Link>
            <Link to="/signup" className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center text-white" style={{ backgroundColor: '#d62828' }}>
              {content.signup_cta}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
