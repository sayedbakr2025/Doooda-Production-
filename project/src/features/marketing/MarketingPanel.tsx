import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserPlan } from '../../hooks/useUserPlan';
import { t } from '../../utils/translations';
import type { Project } from '../../types';
import UpgradeModal from './UpgradeModal';
import PublishersSearch from './PublishersSearch';
import CompetitionsTab from './CompetitionsTab';
import ExportModal from '../../components/ExportModal';
import CompetitionSubmitModal from '../../components/CompetitionSubmitModal';

type TabKey = 'export' | 'publishers' | 'competitions';

interface MarketingPanelProps {
  project: Project;
  onClose: () => void;
}

const TABS: { key: TabKey; labelKey: string; icon: string }[] = [
  { key: 'export', labelKey: 'marketing.export.title', icon: '📤' },
  { key: 'publishers', labelKey: 'marketing.publishers.title', icon: '🔍' },
  { key: 'competitions', labelKey: 'marketing.competitions.title', icon: '🏆' },
];

export default function MarketingPanel({ project, onClose }: MarketingPanelProps) {
  const { language } = useLanguage();
  const { isPaid, canMarketing } = useUserPlan();
  const isRTL = language === 'ar';

  const paid = isPaid && canMarketing;

  const [activeTab, setActiveTab] = useState<TabKey>('export');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  function handleExportTabClick() {
    if (!paid) {
      setShowUpgrade(true);
      return;
    }
    setShowExportModal(true);
  }

  return (
    <>
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.24)',
            maxHeight: '90vh',
            animation: 'panelSlideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {t('marketing.panel.title', language)}
              </h2>
              <p className="text-xs mt-0.5 truncate max-w-[240px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {project.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!paid && (
            <div
              className="mx-5 mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}
            >
              <span className="text-base shrink-0">💎</span>
              <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
                {isRTL
                  ? 'أدوات التسويق متاحة فقط للمشتركين. يمكنك الاستعراض لكن التنفيذ يتطلب اشتراكًا.'
                  : 'Marketing tools require a subscription. You can browse but execution requires an upgrade.'}
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#ca8a04', color: 'white' }}
              >
                {t('marketing.upgrade.cta', language)}
              </button>
            </div>
          )}

          <div className="flex px-5 gap-1 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg relative"
                style={{
                  color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                }}
              >
                <span className="me-1">{tab.icon}</span>
                {t(tab.labelKey, language)}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-5">
            {activeTab === 'export' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL
                    ? 'صدّر عملك بصيغ احترافية متعددة تشمل Word والطباعة وKindle وأمازون KDP.'
                    : 'Export your work in multiple professional formats including Word, Print, Kindle, and Amazon KDP.'}
                </p>
                <button
                  onClick={handleExportTabClick}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    backgroundColor: paid ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    border: paid ? 'none' : '1px solid var(--color-border)',
                    color: paid ? 'white' : 'var(--color-text-primary)',
                  }}
                >
                  <span className="text-base">📤</span>
                  <span className="flex-1 text-start">
                    {isRTL ? 'فتح خيارات التصدير' : 'Open Export Options'}
                  </span>
                  {!paid && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>
                      PRO
                    </span>
                  )}
                  {paid && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>

                <div
                  className="rounded-xl px-4 py-3 space-y-2"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? 'الصيغ المتاحة:' : 'Available formats:'}
                  </p>
                  {[
                    { icon: '📄', ar: 'Word (.doc)', en: 'Word (.doc)' },
                    { icon: '📋', ar: 'طباعة / PDF', en: 'Print / PDF' },
                    { icon: '📱', ar: 'Kindle (XHTML)', en: 'Kindle (XHTML)' },
                    { icon: '🖨️', ar: 'طباعة 6×9 بوصة', en: 'Print 6×9 inch' },
                    { icon: '🎬', ar: 'سيناريو احترافي', en: 'Screenplay' },
                    { icon: '🛒', ar: 'Amazon KDP', en: 'Amazon KDP' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>{item.icon}</span>
                      <span>{isRTL ? item.ar : item.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'publishers' && (
              paid ? (
                <PublishersSearch />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                  <span className="text-3xl">💎</span>
                  <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {isRTL
                      ? 'البحث عن دور النشر متاح فقط للمشتركين. قم بالترقية للوصول إلى الدليل الكامل.'
                      : 'Publisher search is available for premium subscribers. Upgrade to access the full directory.'}
                  </p>
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                  >
                    {t('marketing.upgrade.cta', language)}
                  </button>
                </div>
              )
            )}

            {activeTab === 'competitions' && (
              <div className="space-y-4">
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                >
                  <span className="text-base">🏆</span>
                  <span className="flex-1 text-start">
                    {isRTL ? 'قدّم العمل لمسابقة' : 'Submit Work to Competition'}
                  </span>
                  <span className="text-xs opacity-75">10 {isRTL ? 'توكن' : 'tokens'}</span>
                </button>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? 'استعراض المسابقات' : 'Browse Competitions'}
                  </p>
                  <CompetitionsTab onDooodaSubmit={() => setShowSubmitModal(true)} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {showExportModal && (
        <ExportModal
          project={project}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showSubmitModal && (
        <CompetitionSubmitModal
          project={project}
          onClose={() => setShowSubmitModal(false)}
        />
      )}

      <style>{`
        @keyframes panelSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
