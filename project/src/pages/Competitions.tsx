import { useLanguage } from '../contexts/LanguageContext';
import GlobalHeader from '../components/GlobalHeader';
import CompetitionsTab from '../features/marketing/CompetitionsTab';

export default function Competitions() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      <GlobalHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'المسابقات الأدبية' : 'Literary Competitions'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL
              ? 'اكتشف المسابقات الأدبية المفتوحة وقدّم عملك'
              : 'Discover open literary contests and submit your work'}
          </p>
        </div>
        <CompetitionsTab />
      </div>
    </div>
  );
}
