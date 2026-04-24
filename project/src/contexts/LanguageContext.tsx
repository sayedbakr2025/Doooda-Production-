import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

const ARABIC_LOCALES = [
  'ar', 'ar-SA', 'ar-EG', 'ar-AE', 'ar-KW', 'ar-QA', 'ar-BH', 'ar-OM',
  'ar-IQ', 'ar-SY', 'ar-LB', 'ar-JO', 'ar-PS', 'ar-MA', 'ar-DZ', 'ar-TN',
  'ar-LY', 'ar-SD', 'ar-SO', 'ar-MR', 'ar-YE', 'ar-DJI', 'ar-KM',
];

const ARABIC_TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain',
  'Asia/Muscat', 'Asia/Baghdad', 'Asia/Damascus', 'Asia/Beirut', 'Asia/Amman',
  'Asia/Gaza', 'Asia/Hebron', 'Asia/Aden', 'Africa/Cairo', 'Africa/Tripoli',
  'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca', 'Africa/El_Aaiun',
  'Africa/Khartoum', 'Africa/Mogadishu', 'Africa/Djibouti', 'Indian/Comoro',
];

function detectDefaultLanguage(): Language {
  const saved = localStorage.getItem('doooda_language');
  if (saved === 'ar' || saved === 'en') return saved;

  const browserLangs = navigator.languages ?? [navigator.language];
  for (const l of browserLangs) {
    const base = l.split('-')[0].toLowerCase();
    if (base === 'ar') return 'ar';
    const full = l.toLowerCase();
    if (ARABIC_LOCALES.map(x => x.toLowerCase()).includes(full)) return 'ar';
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ARABIC_TIMEZONES.includes(tz)) return 'ar';
  } catch {
    // ignore
  }

  return 'en';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectDefaultLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    const handleStorageChange = () => {
      const saved = localStorage.getItem('doooda_language');
      if ((saved === 'ar' || saved === 'en') && saved !== language) {
        setLanguageState(saved);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('doooda_language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
