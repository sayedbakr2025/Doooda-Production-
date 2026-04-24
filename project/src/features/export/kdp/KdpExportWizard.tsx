import { useState, useEffect } from 'react';
import type { Project, Chapter, Scene } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { runKdpValidation, type KdpValidationResult } from './kdpValidation';
import { renderKdpPrintHTML } from './kdpFormatter';
import { KDP_TRIM_SPECS, buildPrintLayoutSpec, type KdpTrimSize } from './kdpPrintEngine';
import { buildEpubManifest, buildEpubFileList } from './kindleEpubEngine';
import { buildEpubBlob } from './kindleEpubZip';
import { runKindleValidation, type KindleValidationResult } from './kindleValidation';
import { runKdpComplianceValidation, type KdpComplianceResult } from './kdpComplianceValidator';
import KdpComplianceBadge from './KdpComplianceBadge';
import {
  EMPTY_METADATA,
  getDefaultCategories,
  suggestKeywords,
  generateAiDescription,
  type KdpMetadata,
} from './kdpMetadataGenerator';

interface Props {
  project: Project;
  chapters: Chapter[];
  scenesMap: Record<string, Scene[]>;
  onClose: () => void;
}

type FormatChoice = 'print' | 'kindle' | 'both';
type Step = 'format' | 'metadata' | 'validate' | 'revenue' | 'export';

export interface KdpRevenueOptions {
  listPrice: number;
  pageCount: number;
  colorInterior: boolean;
}

export function calcKdpRevenue(opts: KdpRevenueOptions) {
  const printingCost = opts.colorInterior
    ? 0.85 + 0.07 * opts.pageCount
    : 0.85 + 0.012 * opts.pageCount;
  const royaltyPerSale = Math.max(0, opts.listPrice * 0.6 - printingCost);
  const breakEvenSales = royaltyPerSale > 0 ? Math.ceil(printingCost / royaltyPerSale) : null;
  return { printingCost, royaltyPerSale, breakEvenSales };
}

function safeName(title: string): string {
  return title.replace(/[^a-zA-Z0-9\u0600-\u06ff\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

function StepIndicator({
  current,
  steps,
  ar,
}: {
  current: number;
  steps: { label: string; labelAr: string }[];
  ar: boolean;
}) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              style={{
                backgroundColor: i < current ? 'var(--color-accent)' : i === current ? 'var(--color-accent)' : 'var(--color-border)',
                color: i <= current ? '#fff' : 'var(--color-text-tertiary)',
              }}
            >
              {i < current ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className="text-xs mt-1 text-center" style={{ color: i === current ? 'var(--color-accent)' : 'var(--color-text-tertiary)', fontSize: '10px' }}>
              {ar ? s.labelAr : s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="h-px flex-1 mx-1 mb-4"
              style={{ backgroundColor: i < current ? 'var(--color-accent)' : 'var(--color-border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { label: 'Format', labelAr: 'التنسيق' },
  { label: 'Metadata', labelAr: 'البيانات' },
  { label: 'Validate', labelAr: 'التحقق' },
  { label: 'Revenue', labelAr: 'الأرباح' },
  { label: 'Export', labelAr: 'التصدير' },
];

const STEP_SEQUENCE: Step[] = ['format', 'metadata', 'validate', 'revenue', 'export'];

function estimatePageCount(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 250));
}

export default function KdpExportWizard({ project, chapters, scenesMap, onClose }: Props) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep: Step = STEP_SEQUENCE[stepIndex];

  const [formatChoice, setFormatChoice] = useState<FormatChoice>('both');
  const [showRunningHeader, setShowRunningHeader] = useState(false);
  const [trimSize, setTrimSize] = useState<KdpTrimSize>('6x9');
  const [metadata, setMetadata] = useState<KdpMetadata>({
    ...EMPTY_METADATA,
    title: project.title,
    categories: getDefaultCategories(project.project_type, language),
    keywords: suggestKeywords(project.title, project.project_type, language),
  });
  const [keywordInput, setKeywordInput] = useState(metadata.keywords.join(', '));
  const [validation, setValidation] = useState<KdpValidationResult | null>(null);
  const [kindleValidation, setKindleValidation] = useState<KindleValidationResult | null>(null);
  const [complianceResult, setComplianceResult] = useState<KdpComplianceResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportedFiles, setExportedFiles] = useState<string[]>([]);
  const [revenue, setRevenue] = useState<KdpRevenueOptions>({
    listPrice: 14.99,
    pageCount: estimatePageCount(project.current_word_count || 0),
    colorInterior: false,
  });

  const totalWords = project.current_word_count || 0;

  useEffect(() => {
    if (currentStep === 'validate') {
      if (!validation) {
        const result = runKdpValidation(chapters, scenesMap, project.project_type, totalWords);
        setValidation(result);
      }
      if (!kindleValidation && (formatChoice === 'kindle' || formatChoice === 'both')) {
        const epubManifest = buildEpubManifest(project, chapters, scenesMap, metadata, language);
        const result = runKindleValidation(epubManifest);
        setKindleValidation(result);
      }
      if (!complianceResult) {
        const result = runKdpComplianceValidation(metadata, totalWords);
        setComplianceResult(result);
      }
    }
  }, [currentStep]);

  useEffect(() => {
    const spec = buildPrintLayoutSpec(
      totalWords,
      trimSize,
      revenue.colorInterior ? 'premium_color' : 'black_white',
      'cream'
    );
    setRevenue((r) => ({ ...r, pageCount: spec.estimatedPageCount }));
  }, [trimSize, totalWords]);

  function updateKeywords(val: string) {
    setKeywordInput(val);
    setMetadata((m) => ({
      ...m,
      keywords: val.split(',').map((k) => k.trim()).filter(Boolean),
    }));
  }

  async function handleGenerateDescription() {
    setAiLoading(true);
    setAiError('');
    try {
      const desc = await generateAiDescription(
        project.title,
        project.idea,
        project.project_type,
        language
      );
      setMetadata((m) => ({ ...m, description: desc }));
    } catch (err: any) {
      setAiError(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError('');
    const files: string[] = [];

    try {
      const finalMeta: KdpMetadata = { ...metadata };

      if (formatChoice === 'print' || formatChoice === 'both') {
        const html = renderKdpPrintHTML(project, chapters, scenesMap, {
          authorName: metadata.authorName,
          showRunningHeader,
          language,
          trimSize,
          interiorType: revenue.colorInterior ? 'premium_color' : 'black_white',
        }, finalMeta);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fname = `${safeName(project.title)}_KDP_Print.html`;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);
        files.push(fname);
      }

      if (formatChoice === 'kindle' || formatChoice === 'both') {
        const epubManifest = buildEpubManifest(project, chapters, scenesMap, finalMeta, language);
        const epubFiles = buildEpubFileList(epubManifest);
        const epubBlob = await buildEpubBlob(epubFiles);
        const epubUrl = URL.createObjectURL(epubBlob);
        const epubLink = document.createElement('a');
        epubLink.href = epubUrl;
        const fname = `${safeName(project.title)}_KDP_Kindle.epub`;
        epubLink.download = fname;
        epubLink.click();
        URL.revokeObjectURL(epubUrl);
        files.push(fname);
      }

      setExportedFiles(files);
    } catch (err: any) {
      setExportError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl w-full flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          maxWidth: '640px',
          maxHeight: '90vh',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="px-6 py-4 shrink-0 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold"
              style={{ backgroundColor: '#FF9900', color: '#fff' }}
            >
              K
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {ar ? 'معالج تصدير Amazon KDP' : 'Amazon KDP Export Wizard'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {ar ? 'ملفات جاهزة للنشر على Amazon' : 'Publication-ready files for Amazon'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-muted)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <StepIndicator current={stepIndex} steps={STEPS} ar={ar} />

          {currentStep === 'format' && (
            <StepFormat
              ar={ar}
              formatChoice={formatChoice}
              setFormatChoice={setFormatChoice}
              showRunningHeader={showRunningHeader}
              setShowRunningHeader={setShowRunningHeader}
              trimSize={trimSize}
              setTrimSize={setTrimSize}
              wordCount={totalWords}
              colorInterior={revenue.colorInterior}
            />
          )}

          {currentStep === 'metadata' && (
            <StepMetadata
              ar={ar}
              metadata={metadata}
              setMetadata={setMetadata}
              keywordInput={keywordInput}
              updateKeywords={updateKeywords}
              onGenerateDesc={handleGenerateDescription}
              aiLoading={aiLoading}
              aiError={aiError}
            />
          )}

          {currentStep === 'validate' && validation && (
            <StepValidate
              ar={ar}
              validation={validation}
              kindleValidation={kindleValidation}
              formatChoice={formatChoice}
              complianceResult={complianceResult}
            />
          )}

          {currentStep === 'revenue' && (
            <StepRevenue
              ar={ar}
              revenue={revenue}
              setRevenue={setRevenue}
              trimSize={trimSize}
              totalWords={totalWords}
            />
          )}

          {currentStep === 'export' && (
            <StepExport
              ar={ar}
              formatChoice={formatChoice}
              projectTitle={project.title}
              exportError={exportError}
              exportedFiles={exportedFiles}
              metadata={metadata}
              revenue={revenue}
              complianceResult={complianceResult}
            />
          )}
        </div>

        <div
          className="px-6 py-4 flex gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {stepIndex === 0 ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          ) : (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {ar ? 'السابق' : 'Back'}
            </button>
          )}

          {currentStep !== 'export' ? (
            <button
              onClick={() => setStepIndex((i) => i + 1)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#FF9900' }}
            >
              {ar ? 'التالي' : 'Next'}
            </button>
          ) : exportedFiles.length > 0 ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {ar ? 'تم' : 'Done'}
            </button>
          ) : (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#FF9900' }}
            >
              {exporting
                ? (ar ? 'جاري التصدير...' : 'Exporting...')
                : (ar ? 'تصدير الآن' : 'Export Now')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepFormat({
  ar,
  formatChoice,
  setFormatChoice,
  showRunningHeader,
  setShowRunningHeader,
  trimSize,
  setTrimSize,
  wordCount,
  colorInterior,
}: {
  ar: boolean;
  formatChoice: FormatChoice;
  setFormatChoice: (v: FormatChoice) => void;
  showRunningHeader: boolean;
  setShowRunningHeader: (v: boolean) => void;
  trimSize: KdpTrimSize;
  setTrimSize: (v: KdpTrimSize) => void;
  wordCount: number;
  colorInterior: boolean;
}) {
  const spec = buildPrintLayoutSpec(
    wordCount,
    trimSize,
    colorInterior ? 'premium_color' : 'black_white',
    'cream'
  );

  const formatOptions: { value: FormatChoice; icon: string; label: string; labelAr: string; desc: string; descAr: string }[] = [
    {
      value: 'print',
      icon: '🖨️',
      label: `Paperback (${trimSize.replace('x', '×')}")`,
      labelAr: `ورقي (${trimSize.replace('x', '×')} بوصة)`,
      desc: 'KDP-compliant print-ready HTML · Mirrored margins · Page numbers',
      descAr: 'HTML جاهز للطباعة · هوامش محاذاة للتجليد · أرقام صفحات',
    },
    {
      value: 'kindle',
      icon: '📱',
      label: 'Kindle eBook',
      labelAr: 'كتاب Kindle الإلكتروني',
      desc: 'Reflowable XHTML · Clickable TOC · Clean semantic markup',
      descAr: 'XHTML سائل · فهرس قابل للنقر · ترميز دلالي نظيف',
    },
    {
      value: 'both',
      icon: '📦',
      label: 'Both Formats',
      labelAr: 'كلا التنسيقين',
      desc: 'Export print + Kindle files in one click',
      descAr: 'تصدير الورقي والإلكتروني بنقرة واحدة',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {ar ? 'اختر تنسيق التصدير' : 'Choose Export Format'}
      </p>

      <div className="space-y-2">
        {formatOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFormatChoice(opt.value)}
            className="w-full text-left rounded-xl px-4 py-3 flex items-start gap-3 transition-all"
            style={{
              border: `2px solid ${formatChoice === opt.value ? '#FF9900' : 'var(--color-border-light)'}`,
              backgroundColor: formatChoice === opt.value ? 'rgba(255,153,0,0.06)' : 'var(--color-muted)',
            }}
          >
            <span className="text-xl mt-0.5">{opt.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {ar ? opt.labelAr : opt.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {ar ? opt.descAr : opt.desc}
              </p>
            </div>
            {formatChoice === opt.value && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: '#FF9900' }}
              >
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {(formatChoice === 'print' || formatChoice === 'both') && (
        <div
          className="rounded-xl px-4 py-4 space-y-3"
          style={{ border: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-muted)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar ? 'خيارات الطباعة' : 'Print Options'}
          </p>

          <div>
            <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {ar ? 'حجم الطباعة (Trim Size)' : 'Trim Size'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {KDP_TRIM_SPECS.map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => setTrimSize(ts.id)}
                  className="rounded-xl px-3 py-2.5 text-center transition-all"
                  style={{
                    border: `2px solid ${trimSize === ts.id ? '#FF9900' : 'var(--color-border)'}`,
                    backgroundColor: trimSize === ts.id ? 'rgba(255,153,0,0.1)' : 'transparent',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: trimSize === ts.id ? '#FF9900' : 'var(--color-text-primary)' }}>
                    {ts.id === '6x9' ? (ar ? '6×9 (قياسي)' : '6×9 (Std)') : ts.id.replace('x', '×')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)', fontSize: '10px' }}>
                    {ar ? `${ts.heightIn}×${ts.widthIn} بوصة` : `${ts.widthIn}"×${ts.heightIn}"`}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-lg px-3 py-3 space-y-1.5 text-xs"
            style={{ backgroundColor: 'rgba(255,153,0,0.07)', border: '1px solid rgba(255,153,0,0.15)' }}
          >
            <p className="font-semibold text-xs mb-1" style={{ color: '#FF9900' }}>
              {ar ? 'مواصفات التنسيق المحسوبة' : 'Calculated Layout Spec'}
            </p>
            {[
              {
                labelEn: 'Trim size',
                labelAr: 'حجم الطباعة',
                value: `${spec.trim.widthIn}" × ${spec.trim.heightIn}"`,
              },
              {
                labelEn: 'Est. pages',
                labelAr: 'الصفحات المقدّرة',
                value: `${spec.estimatedPageCount}`,
              },
              {
                labelEn: 'Spine width',
                labelAr: 'عرض العمود الفقري',
                value: `${spec.spine.spineWidthIn.toFixed(4)}" (${spec.estimatedPageCount} × 0.002252)`,
              },
              {
                labelEn: 'Inner margin (gutter)',
                labelAr: 'الهامش الداخلي',
                value: `${spec.margins.innerIn}"`,
              },
              {
                labelEn: 'Outer margin',
                labelAr: 'الهامش الخارجي',
                value: `${spec.margins.outerIn}"`,
              },
              {
                labelEn: 'Top / Bottom',
                labelAr: 'أعلى / أسفل',
                value: `${spec.margins.topIn}" / ${spec.margins.bottomIn}"`,
              },
              {
                labelEn: 'Font size',
                labelAr: 'حجم الخط',
                value: `${spec.fontSizePt}pt`,
              },
              {
                labelEn: 'Cover total width',
                labelAr: 'عرض الغلاف الكامل',
                value: `${spec.spine.totalWidthIn.toFixed(4)}"`,
              },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-32" style={{ color: 'var(--color-text-secondary)' }}>
                  {ar ? row.labelAr : row.labelEn}
                </span>
                <span className="font-mono" style={{ color: 'var(--color-text-primary)', fontSize: '11px' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {spec.warnings.length > 0 && (
            <div className="space-y-1.5">
              {spec.warnings.map((w, i) => (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2.5 flex items-start gap-2 text-xs"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{ar ? w.messageAr : w.messageEn}</span>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center justify-between cursor-pointer pt-1">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {ar ? 'رأس صفحة متكرر (عنوان / مؤلف)' : 'Running header (title / author)'}
            </span>
            <div
              onClick={() => setShowRunningHeader(!showRunningHeader)}
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: showRunningHeader ? '#FF9900' : 'var(--color-border)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: showRunningHeader ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </div>
          </label>

          <div className="rounded-lg px-3 py-2 text-xs space-y-1" style={{ backgroundColor: 'rgba(255,153,0,0.08)', color: 'var(--color-text-tertiary)' }}>
            {[
              ar ? 'كل فصل يبدأ في صفحة يمنى (recto)' : 'Each chapter starts on a right (recto) page',
              ar ? 'الصفحات اليتيمة والأرامل: 3 أسطر على الأقل' : 'Orphan/widow control: min 3 lines',
              ar ? 'أرقام الصفحات تبدأ بعد الواجهة' : 'Page numbers start after the cover',
              ar ? 'ألوان CMYK آمنة — لا RGB' : 'CMYK-safe colors — no RGB',
              ar ? 'دعم الخطوط العربية (Amiri)' : 'Embedded-ready serif fonts',
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span style={{ color: '#FF9900' }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(formatChoice === 'kindle' || formatChoice === 'both') && (
        <div
          className="rounded-xl px-4 py-3 space-y-2"
          style={{ border: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-muted)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar ? 'مواصفات Kindle' : 'Kindle Specs'}
          </p>
          <div className="rounded-lg px-3 py-2 text-xs space-y-1" style={{ backgroundColor: 'rgba(255,153,0,0.08)', color: 'var(--color-text-tertiary)' }}>
            {[
              ar ? 'تخطيط سائل — بدون هوامش ثابتة' : 'Reflowable layout — no fixed margins',
              ar ? 'فهرس قابل للنقر (epub:type="toc")' : 'Clickable TOC (epub:type="toc")',
              ar ? 'بدون أرقام صفحات' : 'No page numbers',
              ar ? 'خطوط النظام الافتراضية' : 'System default fonts only',
              ar ? 'بنية HTML دلالية نظيفة' : 'Clean semantic HTML structure',
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span style={{ color: '#FF9900' }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepMetadata({
  ar,
  metadata,
  setMetadata,
  keywordInput,
  updateKeywords,
  onGenerateDesc,
  aiLoading,
  aiError,
}: {
  ar: boolean;
  metadata: KdpMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<KdpMetadata>>;
  keywordInput: string;
  updateKeywords: (v: string) => void;
  onGenerateDesc: () => void;
  aiLoading: boolean;
  aiError: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {ar ? 'بيانات الكتاب لـ Amazon KDP' : 'Book Metadata for Amazon KDP'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {ar ? 'عنوان الكتاب *' : 'Book Title *'}
          </label>
          <input
            type="text"
            className="input-field w-full text-sm"
            value={metadata.title}
            onChange={(e) => setMetadata((m) => ({ ...m, title: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {ar ? 'العنوان الفرعي (اختياري)' : 'Subtitle (optional)'}
          </label>
          <input
            type="text"
            className="input-field w-full text-sm"
            value={metadata.subtitle}
            onChange={(e) => setMetadata((m) => ({ ...m, subtitle: e.target.value }))}
            placeholder={ar ? 'مثال: رواية عربية...' : 'e.g. A Novel...'}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {ar ? 'اسم المؤلف' : 'Author Name'}
          </label>
          <input
            type="text"
            className="input-field w-full text-sm"
            value={metadata.authorName}
            onChange={(e) => setMetadata((m) => ({ ...m, authorName: e.target.value }))}
            placeholder={ar ? 'اسم المؤلف...' : 'Author name...'}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {ar ? 'وصف الكتاب (الغلاف الخلفي)' : 'Book Description (Back Cover)'}
          </label>
          <button
            onClick={onGenerateDesc}
            disabled={aiLoading}
            className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center gap-1.5"
            style={{ backgroundColor: 'rgba(255,153,0,0.12)', color: '#FF9900', border: '1px solid rgba(255,153,0,0.3)' }}
          >
            {aiLoading ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {ar ? 'جاري...' : 'Generating...'}
              </>
            ) : (
              <>
                <span>✨</span>
                {ar ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI'}
              </>
            )}
          </button>
        </div>
        {aiError && (
          <p className="text-xs mb-1" style={{ color: '#ef4444' }}>{aiError}</p>
        )}
        <textarea
          className="input-field w-full text-sm resize-none"
          rows={5}
          value={metadata.description}
          onChange={(e) => setMetadata((m) => ({ ...m, description: e.target.value }))}
          placeholder={ar ? 'وصف تسويقي جذاب للقراء...' : 'Compelling marketing description for readers...'}
        />
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          {ar ? 'الكلمات المفتاحية (5-7، مفصولة بفواصل)' : 'Keywords (5–7, comma-separated)'}
        </label>
        <input
          type="text"
          className="input-field w-full text-sm"
          value={keywordInput}
          onChange={(e) => updateKeywords(e.target.value)}
          placeholder={ar ? 'كلمة1، كلمة2، ...' : 'keyword1, keyword2, ...'}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {ar
            ? `${metadata.keywords.length} كلمة من أصل 7`
            : `${metadata.keywords.length} of 7 keywords`}
        </p>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          {ar ? 'التصنيفات المقترحة' : 'Suggested Categories'}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {metadata.categories.map((cat, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,153,0,0.12)', color: '#FF9900', border: '1px solid rgba(255,153,0,0.25)' }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ValidationIssueList({
  ar,
  issues,
  label,
  labelAr,
  color,
  bg,
  border,
  icon,
}: {
  ar: boolean;
  issues: { messageEn: string; messageAr: string }[];
  label: string;
  labelAr: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {ar ? labelAr : label}
      </p>
      {issues.map((issue, i) => (
        <div
          key={i}
          className="rounded-lg px-3 py-2.5 flex gap-2 text-sm"
          style={{ backgroundColor: bg, border: `1px solid ${border}` }}
        >
          <span style={{ color }}>{icon}</span>
          <span style={{ color: 'var(--color-text-primary)' }}>
            {ar ? issue.messageAr : issue.messageEn}
          </span>
        </div>
      ))}
    </div>
  );
}

function StepValidate({
  ar,
  validation,
  kindleValidation,
  formatChoice,
  complianceResult,
}: {
  ar: boolean;
  validation: KdpValidationResult;
  kindleValidation: KindleValidationResult | null;
  formatChoice: FormatChoice;
  complianceResult: KdpComplianceResult | null;
}) {
  const errors = validation.issues.filter((i) => i.severity === 'error');
  const warnings = validation.issues.filter((i) => i.severity === 'warning');

  const kindleErrors = kindleValidation?.issues.filter((i) => i.severity === 'error') ?? [];
  const kindleWarnings = kindleValidation?.issues.filter((i) => i.severity === 'warning') ?? [];
  const showKindle = (formatChoice === 'kindle' || formatChoice === 'both') && kindleValidation !== null;

  const overallPassed = validation.passed && (!showKindle || (kindleValidation?.passed ?? true));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: overallPassed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}
        >
          {overallPassed ? '✓' : '✕'}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {overallPassed
              ? (ar ? 'التحقق ناجح' : 'Validation Passed')
              : (ar ? 'تم العثور على مشاكل' : 'Issues Found')}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar
              ? `KDP: ${errors.length} خطأ · ${warnings.length} تحذير`
              : `KDP: ${errors.length} error(s) · ${warnings.length} warning(s)`}
            {showKindle && (
              ar
                ? ` · Kindle: ${kindleErrors.length} خطأ · ${kindleWarnings.length} تحذير`
                : ` · Kindle: ${kindleErrors.length} error(s) · ${kindleWarnings.length} warning(s)`
            )}
          </p>
        </div>
      </div>

      {validation.issues.length === 0 && (!showKindle || kindleValidation?.issues.length === 0) && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: 'var(--color-text-secondary)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          {ar ? 'لا توجد مشاكل. كتابك جاهز للتصدير.' : 'No issues found. Your book is ready to export.'}
        </div>
      )}

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar ? 'تحقق KDP (الورقي)' : 'KDP (Print) Validation'}
          </p>
          <ValidationIssueList ar={ar} issues={errors} label="Errors (must fix)" labelAr="أخطاء (يجب إصلاحها)" color="#ef4444" bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.2)" icon="✕" />
          <ValidationIssueList ar={ar} issues={warnings} label="Warnings (can export anyway)" labelAr="تحذيرات (يمكن تجاهلها)" color="#f59e0b" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)" icon="⚠" />
        </div>
      )}

      {showKindle && (kindleErrors.length > 0 || kindleWarnings.length > 0) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar ? 'تحقق Kindle ePub' : 'Kindle ePub Validation'}
          </p>
          <ValidationIssueList ar={ar} issues={kindleErrors} label="Errors (must fix)" labelAr="أخطاء (يجب إصلاحها)" color="#ef4444" bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.2)" icon="✕" />
          <ValidationIssueList ar={ar} issues={kindleWarnings} label="Warnings (can export anyway)" labelAr="تحذيرات (يمكن تجاهلها)" color="#f59e0b" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)" icon="⚠" />
        </div>
      )}

      {showKindle && kindleValidation?.issues.length === 0 && (
        <div
          className="rounded-xl px-4 py-3 text-xs"
          style={{ backgroundColor: 'rgba(34,197,94,0.07)', color: 'var(--color-text-secondary)', border: '1px solid rgba(34,197,94,0.18)' }}
        >
          <p className="font-semibold text-xs mb-1" style={{ color: '#22c55e' }}>
            {ar ? 'Kindle ePub — جاهز' : 'Kindle ePub — Ready'}
          </p>
          {(ar ? [
            'لا توجد فصول فارغة',
            'لا روابط مكسورة',
            'لا أنماط مضمّنة',
            'بنية OPF/NCX/XHTML صالحة',
          ] : [
            'No empty chapters',
            'No broken anchor links',
            'No inline styles',
            'Valid OPF / NCX / XHTML structure',
          ]).map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 mt-0.5">
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      {complianceResult && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <KdpComplianceBadge result={complianceResult} ar={ar} />
        </div>
      )}
    </div>
  );
}

function StepRevenue({
  ar,
  revenue,
  setRevenue,
  trimSize,
  totalWords,
}: {
  ar: boolean;
  revenue: KdpRevenueOptions;
  setRevenue: React.Dispatch<React.SetStateAction<KdpRevenueOptions>>;
  trimSize: KdpTrimSize;
  totalWords: number;
}) {
  const spec = buildPrintLayoutSpec(
    totalWords,
    trimSize,
    revenue.colorInterior ? 'premium_color' : 'black_white',
    'cream'
  );
  const { printingCost, royaltyPerSale, breakEvenSales } = calcKdpRevenue(revenue);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const royaltyColor = royaltyPerSale > 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {ar ? 'حاسبة أرباح Amazon KDP' : 'Amazon KDP Revenue Calculator'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {ar ? 'سعر البيع ($)' : 'List Price ($)'}
          </label>
          <input
            type="number"
            className="input-field w-full text-sm"
            min={0.99}
            max={999}
            step={0.01}
            value={revenue.listPrice}
            onChange={(e) => setRevenue((r) => ({ ...r, listPrice: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {ar ? 'عدد الصفحات' : 'Page Count'}
          </label>
          <input
            type="number"
            className="input-field w-full text-sm"
            min={1}
            max={9999}
            value={revenue.pageCount}
            onChange={(e) => setRevenue((r) => ({ ...r, pageCount: parseInt(e.target.value) || 1 }))}
          />
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar
              ? `محسوب تلقائيًا (${spec.wordsPerPage} كلمة/صفحة) · عمود: ${spec.spine.spineWidthIn.toFixed(3)}"`
              : `Auto (${spec.wordsPerPage} words/page) · Spine: ${spec.spine.spineWidthIn.toFixed(3)}"`}
          </p>
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between cursor-pointer py-1">
          <div>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {ar ? 'طباعة ملونة' : 'Color Interior'}
            </span>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {ar ? 'تكلفة أعلى: 0.85 + (0.07 × الصفحات)' : 'Higher cost: 0.85 + (0.07 × pages)'}
            </p>
          </div>
          <div
            onClick={() => setRevenue((r) => ({ ...r, colorInterior: !r.colorInterior }))}
            className="relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0"
            style={{ backgroundColor: revenue.colorInterior ? '#FF9900' : 'var(--color-border)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: revenue.colorInterior ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </div>
        </label>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-light)' }}
      >
        <div
          className="px-4 py-2.5"
          style={{ backgroundColor: 'var(--color-muted)', borderBottom: '1px solid var(--color-border-light)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar ? 'نتائج التحليل' : 'Results'}
          </p>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {ar ? 'تكلفة الطباعة' : 'Printing Cost'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {ar
                  ? `0.85 + (${revenue.colorInterior ? '0.07' : '0.012'} × ${revenue.pageCount} صفحة)`
                  : `0.85 + (${revenue.colorInterior ? '0.07' : '0.012'} × ${revenue.pageCount} pages)`}
              </p>
            </div>
            <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
              {fmt(printingCost)}
            </span>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {ar ? 'معدل الإتاوة (60%)' : 'Royalty Rate (60%)'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {ar
                  ? `${fmt(revenue.listPrice)} × 60% = ${fmt(revenue.listPrice * 0.6)}`
                  : `${fmt(revenue.listPrice)} × 60% = ${fmt(revenue.listPrice * 0.6)}`}
              </p>
            </div>
            <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
              {fmt(revenue.listPrice * 0.6)}
            </span>
          </div>

          <div
            className="px-4 py-4 flex items-center justify-between"
            style={{ backgroundColor: royaltyPerSale > 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {ar ? 'الربح لكل نسخة' : 'Royalty Per Sale'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {ar ? '(السعر × 60%) − تكلفة الطباعة' : '(Price × 60%) − Printing Cost'}
              </p>
            </div>
            <span className="text-xl font-bold tabular-nums" style={{ color: royaltyColor }}>
              {fmt(royaltyPerSale)}
            </span>
          </div>

          {breakEvenSales !== null && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {ar ? 'نقطة التعادل' : 'Break-Even Sales'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {ar ? 'عدد النسخ لاسترداد تكلفة الطباعة' : 'Copies to recover printing cost'}
                </p>
              </div>
              <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                {breakEvenSales} {ar ? 'نسخة' : 'copies'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 text-xs space-y-1"
        style={{ backgroundColor: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)', color: 'var(--color-text-tertiary)' }}
      >
        <p className="font-semibold mb-1" style={{ color: '#FF9900' }}>
          {ar ? 'ملاحظة' : 'Note'}
        </p>
        {(ar ? [
          'الحسابات تقديرية بناءً على نموذج KDP للإتاوة (60%)',
          'تكاليف الطباعة الفعلية قد تختلف بناءً على الدولة والشحن',
          'الكتب الإلكترونية Kindle لا تشمل تكاليف طباعة',
        ] : [
          'Estimates based on KDP 60% royalty plan',
          'Actual printing costs may vary by market and shipping',
          'Kindle eBooks have no printing costs',
        ]).map((t, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span style={{ color: '#FF9900' }}>·</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text, label, ar }: { text: string; label: string; ar: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-medium"
      style={{
        backgroundColor: copied ? 'rgba(34,197,94,0.12)' : 'var(--color-muted)',
        color: copied ? '#22c55e' : 'var(--color-text-secondary)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--color-border-light)'}`,
      }}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {ar ? 'تم!' : 'Copied!'}
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function StepExport({
  ar,
  formatChoice,
  projectTitle,
  exportError,
  exportedFiles,
  metadata,
  revenue,
  complianceResult,
}: {
  ar: boolean;
  formatChoice: FormatChoice;
  projectTitle: string;
  exportError: string;
  exportedFiles: string[];
  metadata: KdpMetadata;
  revenue: KdpRevenueOptions;
  complianceResult: KdpComplianceResult | null;
}) {
  const safeTitleName = projectTitle.replace(/[^a-zA-Z0-9\u0600-\u06ff\s]/g, '').replace(/\s+/g, '_').substring(0, 50);

  const files = [];
  if (formatChoice === 'print' || formatChoice === 'both') {
    files.push({
      name: `${safeTitleName}_KDP_Print.html`,
      desc: ar ? 'HTML ورقي جاهز للطباعة (6×9)' : 'Print-ready HTML (6×9 in)',
      icon: '🖨️',
    });
  }
  if (formatChoice === 'kindle' || formatChoice === 'both') {
    files.push({
      name: `${safeTitleName}_KDP_Kindle.epub`,
      desc: ar ? 'ePub 3 جاهز لـ Kindle وKDP' : 'ePub 3 — Kindle & KDP ready',
      icon: '📱',
    });
  }

  return (
    <div className="space-y-4">
      {complianceResult && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
        >
          <KdpComplianceBadge result={complianceResult} ar={ar} compact />
        </div>
      )}

      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {ar ? 'ملفات الإخراج' : 'Output Files'}
      </p>

      <div className="space-y-2">
        {files.map((f, i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              border: `1px solid ${exportedFiles.length > 0 ? 'rgba(34,197,94,0.3)' : 'var(--color-border-light)'}`,
              backgroundColor: exportedFiles.length > 0 ? 'rgba(34,197,94,0.06)' : 'var(--color-muted)',
            }}
          >
            <span className="text-xl">{f.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-text-primary)', fontSize: '11px' }}>
                {f.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{f.desc}</p>
            </div>
            {exportedFiles.length > 0 && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {exportError && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
        >
          {exportError}
        </div>
      )}

      {exportedFiles.length === 0 && (
        <div
          className="rounded-xl px-4 py-3 text-xs space-y-1"
          style={{ backgroundColor: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)', color: 'var(--color-text-tertiary)' }}
        >
          <p className="font-semibold text-sm mb-2" style={{ color: '#FF9900' }}>
            {ar ? 'بعد التنزيل' : 'After Download'}
          </p>
          {(ar ? [
            'الملف الورقي: افتح في المتصفح → طباعة → PDF',
            'ملف Kindle ePub: ارفعه مباشرة على KDP أو افتحه في Kindle Previewer للمراجعة',
            'ارفع الملفات على kdp.amazon.com',
          ] : [
            'Print file: Open in browser → Print → Save as PDF',
            'Kindle ePub: Upload directly to KDP or open in Kindle Previewer to review',
            'Upload files at kdp.amazon.com',
          ]).map((tip, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: '#FF9900' }}>→</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {exportedFiles.length > 0 && (
        <>
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
              {ar ? 'تم التصدير بنجاح!' : 'Export successful!'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {ar
                ? `تم تنزيل ${exportedFiles.length} ملف`
                : `${exportedFiles.length} file(s) downloaded`}
            </p>
          </div>

          <KdpSubmissionHelper ar={ar} metadata={metadata} revenue={revenue} formatChoice={formatChoice} />
        </>
      )}
    </div>
  );
}

function KdpSubmissionHelper({
  ar,
  metadata,
  revenue,
  formatChoice,
}: {
  ar: boolean;
  metadata: KdpMetadata;
  revenue: KdpRevenueOptions;
  formatChoice: FormatChoice;
}) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const { royaltyPerSale } = calcKdpRevenue(revenue);

  const steps = ar ? [
    {
      num: 1,
      title: 'اذهب إلى KDP',
      detail: 'افتح kdp.amazon.com وسجّل الدخول إلى حسابك',
      action: (
        <a
          href="https://kdp.amazon.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80 shrink-0"
          style={{ backgroundColor: '#FF9900', color: '#fff' }}
        >
          فتح KDP
        </a>
      ),
    },
    {
      num: 2,
      title: 'أنشئ عنوانًا جديدًا',
      detail: 'انقر "إنشاء" واختر Paperback أو Kindle eBook',
    },
    {
      num: 3,
      title: 'أدخل معلومات الكتاب',
      detail: 'الصق الوصف والكلمات المفتاحية والتصنيفات',
    },
    {
      num: 4,
      title: 'ارفع ملف المحتوى',
      detail: formatChoice === 'kindle'
        ? 'ارفع ملف ePub مباشرة — KDP يقبل ePub 3'
        : formatChoice === 'print'
        ? 'ارفع ملف HTML كـ PDF (افتح في المتصفح ← طباعة ← حفظ كـ PDF)'
        : 'ارفع ملف PDF للنسخة الورقية وملف ePub لـ Kindle',
    },
    {
      num: 5,
      title: 'حدد السعر',
      detail: `استخدم السعر المقترح: ${fmt(revenue.listPrice)} (ربح ${fmt(royaltyPerSale)} لكل نسخة)`,
    },
    {
      num: 6,
      title: 'أرسل للمراجعة',
      detail: 'انقر "نشر الكتاب الورقي" أو "نشر الكتاب الإلكتروني" — تستغرق المراجعة 24–72 ساعة',
    },
  ] : [
    {
      num: 1,
      title: 'Go to KDP',
      detail: 'Open kdp.amazon.com and sign in to your account',
      action: (
        <a
          href="https://kdp.amazon.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80 shrink-0"
          style={{ backgroundColor: '#FF9900', color: '#fff' }}
        >
          Open KDP
        </a>
      ),
    },
    {
      num: 2,
      title: 'Create a new title',
      detail: 'Click "Create" and choose Paperback or Kindle eBook',
    },
    {
      num: 3,
      title: 'Enter book details',
      detail: 'Paste your description, keywords, and categories below',
    },
    {
      num: 4,
      title: 'Upload your manuscript',
      detail: formatChoice === 'kindle'
        ? 'Upload the .epub file directly — KDP accepts ePub 3'
        : formatChoice === 'print'
        ? 'Upload the HTML as PDF (Open in browser → Print → Save as PDF)'
        : 'Upload the PDF for print and the .epub file for Kindle',
    },
    {
      num: 5,
      title: 'Set pricing',
      detail: `Use the suggested price: ${fmt(revenue.listPrice)} (earns ${fmt(royaltyPerSale)} per sale)`,
    },
    {
      num: 6,
      title: 'Submit for review',
      detail: 'Click "Publish" — review takes 24–72 hours',
    },
  ];

  const copyItems = [
    {
      labelEn: 'Copy Description',
      labelAr: 'نسخ الوصف',
      value: metadata.description,
      previewLines: 2,
    },
    {
      labelEn: 'Copy Keywords',
      labelAr: 'نسخ الكلمات المفتاحية',
      value: metadata.keywords.join(', '),
      previewLines: 1,
    },
    {
      labelEn: 'Copy Author Name',
      labelAr: 'نسخ اسم المؤلف',
      value: metadata.authorName,
      previewLines: 1,
    },
    {
      labelEn: 'Copy Categories',
      labelAr: 'نسخ التصنيفات',
      value: metadata.categories.join('\n'),
      previewLines: 1,
    },
  ].filter((item) => item.value && item.value.trim().length > 0);

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border-light)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {ar ? 'دليل النشر خطوة بخطوة' : 'Step-by-Step Submission Guide'}
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border-light)' }} />
      </div>

      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.num}
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
              style={{ backgroundColor: '#FF9900', color: '#fff' }}
            >
              {s.num}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {s.title}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                {s.detail}
              </p>
            </div>
            {'action' in s && s.action}
          </div>
        ))}
      </div>

      {copyItems.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border-light)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {ar ? 'انسخ للصق في KDP' : 'Copy & Paste into KDP'}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border-light)' }} />
          </div>

          <div className="space-y-2">
            {copyItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    {ar ? item.labelAr : item.labelEn}
                  </p>
                  <CopyButton
                    text={item.value}
                    label={ar ? 'نسخ' : 'Copy'}
                    ar={ar}
                  />
                </div>
                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: 'var(--color-text-tertiary)', fontFamily: 'monospace', wordBreak: 'break-word' }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
