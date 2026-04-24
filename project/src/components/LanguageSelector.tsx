import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSelector() {
  const { language, setLanguage, isRTL } = useLanguage();

  return (
    <div className={`fixed top-4 z-50 ${isRTL ? 'left-4' : 'right-4'}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex overflow-hidden">
        <button
          onClick={() => setLanguage('en')}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            language === 'en'
              ? 'bg-doooda-primary text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Switch to English"
        >
          English
        </button>
        <div className="w-px bg-gray-200" />
        <button
          onClick={() => setLanguage('ar')}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            language === 'ar'
              ? 'bg-doooda-primary text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Switch to Arabic"
        >
          العربية
        </button>
      </div>
    </div>
  );
}
