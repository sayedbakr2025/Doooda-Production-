import { useState, useEffect, useRef } from 'react';
import type { Project, Chapter, Scene } from '../types';
import KdpExportWizard from '../features/export/kdp/KdpExportWizard';
import KdpSettingsModal from '../features/export/kdp/KdpSettingsModal';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getPresetByProjectType,
  FONT_OPTIONS,
  SPACING_OPTIONS,
  MARGIN_OPTIONS,
  PRINT_READY_DEFAULTS,
  KINDLE_DEFAULTS,
  SCREENPLAY_DEFAULTS,
  type ExportPreset,
  type FontFamily,
  type LineSpacing,
  type MarginSize,
  type PrintReadyOptions,
  type KindleOptions,
  type ScreenplayOptions,
} from '../utils/ExportPresetEngine';
import { renderExportHTML } from '../utils/exportRenderer';
import { renderKindleHTML } from '../utils/kindleRenderer';
import { renderScreenplayHTML, calculateScreenplayRuntime } from '../utils/screenplayRenderer';
import { api, getScenes } from '../services/api';

interface Props {
  project: Project;
  onClose: () => void;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
      {title}
    </p>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <div
        dir="ltr"
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
        style={{ backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-border)' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </div>
    </label>
  );
}

export default function ExportModal({ project, onClose }: Props) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const basePreset = getPresetByProjectType(project.project_type);
  const [preset, setPreset] = useState<ExportPreset>(basePreset);

  const ARABIC_FONTS = ['Amiri', 'Tajawal'];
  const exportLanguage: 'ar' | 'en' = ARABIC_FONTS.includes(preset.font) ? 'ar' : 'en';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printReady, setPrintReady] = useState<PrintReadyOptions>(PRINT_READY_DEFAULTS);
  const [kindle, setKindle] = useState<KindleOptions>(KINDLE_DEFAULTS);
  const [screenplay, setScreenplay] = useState<ScreenplayOptions>(SCREENPLAY_DEFAULTS);
  const [runtimeMinutes, setRuntimeMinutes] = useState<number | null>(null);
  const [showKdpWizard, setShowKdpWizard] = useState(false);
  const [showKdpSettings, setShowKdpSettings] = useState(false);
  const [kdpData, setKdpData] = useState<{ chapters: Chapter[]; scenesMap: Record<string, Scene[]> } | null>(null);
  const presetLoadedRef = useRef(false);

  useEffect(() => {
    if (!presetLoadedRef.current) {
      presetLoadedRef.current = true;
      setPreset(getPresetByProjectType(project.project_type));
    }
  }, [project.project_type]);

  function updateFont(v: FontFamily) {
    setPreset((p) => ({ ...p, font: v }));
  }
  function updateFontSize(v: number) {
    setPreset((p) => ({ ...p, fontSize: v }));
  }
  function updateSpacing(v: LineSpacing) {
    setPreset((p) => ({ ...p, lineSpacing: v }));
  }
  function updateMargins(v: MarginSize) {
    setPreset((p) => ({ ...p, margins: v }));
  }
  function updateBehavior(key: keyof ExportPreset['pageBehavior'], v: boolean) {
    setPreset((p) => ({ ...p, pageBehavior: { ...p.pageBehavior, [key]: v } }));
  }

  async function fetchAllData() {
    const chapters: Chapter[] = await api.getChapters(project.id);
    const scenesMap: Record<string, Scene[]> = {};
    await Promise.all(
      chapters.map(async (ch) => {
        const scenes = await getScenes(ch.id);
        scenesMap[ch.id] = scenes.filter((s) => s.is_active !== false);
      })
    );
    return { project, chapters, scenesMap };
  }

  async function handleExportHTML() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData();
      const html = renderExportHTML(data, preset, exportLanguage, printReady);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportWord() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData();
      const html = renderExportHTML(data, preset, exportLanguage, printReady);
      const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.replace(/^<!DOCTYPE[^>]*>\s*/, '')}</html>`;
      const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Word export failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData();
      const html = renderExportHTML(data, preset, exportLanguage, printReady);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) { setError(ar ? 'تعذّر فتح نافذة الطباعة' : 'Could not open print window'); return; }
      win.addEventListener('load', () => {
        win.focus();
        win.print();
        URL.revokeObjectURL(url);
      });
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportKindle() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData();
      const html = renderKindleHTML(data, kindle, exportLanguage);
      const blob = new Blob([html], { type: 'application/xhtml+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}_kindle.xhtml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Kindle export failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportScreenplay() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData();
      const runtime = calculateScreenplayRuntime(data.chapters, data.scenesMap);
      setRuntimeMinutes(runtime);
      const html = renderScreenplayHTML(data, screenplay);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}_screenplay.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Screenplay export failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenKdp() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData();
      setKdpData({ chapters: data.chapters, scenesMap: data.scenesMap });
      setShowKdpWizard(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewRuntime() {
    try {
      const data = await fetchAllData();
      const runtime = calculateScreenplayRuntime(data.chapters, data.scenesMap);
      setRuntimeMinutes(runtime);
    } catch {
      // silent
    }
  }

  const presetNote = ar ? preset.noteAr : preset.noteEn;
  const isScreenplayProject = preset.layoutType === 'screenplay';

  return (
    <>
    {showKdpWizard && kdpData && (
      <KdpExportWizard
        project={project}
        chapters={kdpData.chapters}
        scenesMap={kdpData.scenesMap}
        onClose={() => setShowKdpWizard(false)}
      />
    )}
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl w-full flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          maxWidth: '720px',
          maxHeight: '90vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {ar ? 'تصدير المشروع' : 'Export Project'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {presetNote}
            </p>
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

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
          >
            <span className="text-2xl">{getTypeIcon(project.project_type)}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {ar ? preset.labelAr : preset.labelEn}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {ar ? 'تم تحميل الإعدادات تلقائيًا بناءً على نوع المشروع' : 'Preset auto-loaded based on project type'}
              </p>
            </div>
          </div>

          <div>
            <SectionHeader title={ar ? 'الخط والحجم' : 'Font & Size'} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {ar ? 'نوع الخط' : 'Font Family'}
                </label>
                <select
                  className="input-field w-full text-sm"
                  value={preset.font}
                  onChange={(e) => updateFont(e.target.value as FontFamily)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{ar ? f.labelAr : f.labelEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {ar ? 'حجم الخط (pt)' : 'Font Size (pt)'}
                </label>
                <input
                  type="number"
                  className="input-field w-full text-sm"
                  value={preset.fontSize}
                  min={8}
                  max={24}
                  onChange={(e) => updateFontSize(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title={ar ? 'التخطيط والهوامش' : 'Layout & Margins'} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {ar ? 'تباعد الأسطر' : 'Line Spacing'}
                </label>
                <select
                  className="input-field w-full text-sm"
                  value={preset.lineSpacing}
                  onChange={(e) => updateSpacing(e.target.value as LineSpacing)}
                >
                  {SPACING_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {ar ? 'الهوامش' : 'Margins'}
                </label>
                <select
                  className="input-field w-full text-sm"
                  value={preset.margins}
                  onChange={(e) => updateMargins(e.target.value as MarginSize)}
                >
                  {MARGIN_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{ar ? m.labelAr : m.labelEn}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader title={ar ? 'سلوك الصفحات' : 'Page Behavior'} />
            <div className="space-y-1 rounded-xl px-4 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
              <ToggleRow
                label={ar ? `صفحة جديدة لكل ${preset.containerLabel.ar}` : `New page per ${preset.containerLabel.en}`}
                checked={preset.pageBehavior.chapterBreak}
                onChange={(v) => updateBehavior('chapterBreak', v)}
              />
              <ToggleRow
                label={ar ? 'ترقيم المشاهد' : 'Scene Numbering'}
                checked={preset.pageBehavior.sceneNumbering}
                onChange={(v) => updateBehavior('sceneNumbering', v)}
              />
              <ToggleRow
                label={ar ? 'فهرس المحتويات' : 'Table of Contents'}
                checked={preset.pageBehavior.tocEnabled}
                onChange={(v) => updateBehavior('tocEnabled', v)}
              />
              {preset.layoutType === 'children' && (
                <ToggleRow
                  label={ar ? 'مساحات للرسوم التوضيحية' : 'Illustration Placeholders'}
                  checked={preset.pageBehavior.illustrationPlaceholders}
                  onChange={(v) => updateBehavior('illustrationPlaceholders', v)}
                />
              )}
            </div>
          </div>

          <div>
            <SectionHeader title={ar ? 'وضع الطباعة الاحترافي' : 'Print-Ready Mode'} />
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${printReady.enabled ? 'var(--color-accent)' : 'var(--color-border-light)'}`, transition: 'border-color 0.2s' }}
            >
              <div
                className="px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: printReady.enabled ? 'rgba(var(--color-accent-rgb,0,0,0),0.05)' : 'var(--color-muted)' }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {ar ? 'تنسيق 6×9 بوصة جاهز للطباعة' : '6×9 inch print-ready format'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {ar
                      ? 'هوامش محاذاة للتجليد · ترقيم الصفحات · رأس صفحة متناوب · تحكم في الأرامل والأيتام'
                      : 'Mirrored binding margins · Page numbers · Running headers · Widow & orphan control'}
                  </p>
                </div>
                <div
                  onClick={() => setPrintReady((p) => ({ ...p, enabled: !p.enabled }))}
                  dir="ltr" className="relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 mt-0.5"
                  style={{ backgroundColor: printReady.enabled ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: printReady.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </div>
              </div>

              {printReady.enabled && (
                <div
                  className="px-4 py-3 space-y-3"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {ar ? 'اسم المؤلف (يظهر في رأس الصفحة)' : 'Author name (shown in running header)'}
                    </label>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={printReady.authorName}
                      onChange={(e) => setPrintReady((p) => ({ ...p, authorName: e.target.value }))}
                      placeholder={ar ? 'اسم المؤلف...' : 'Author name...'}
                    />
                  </div>
                  <div
                    className="rounded-lg px-3 py-2 text-xs space-y-1"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'حجم الصفحة: 6×9 بوصة' : 'Page size: 6×9 inches'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'هامش داخلي: 1 بوصة · هامش خارجي: 0.75 بوصة' : 'Inner margin: 1 in · Outer: 0.75 in'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'الأرقام في الزاوية الخارجية السفلية' : 'Page numbers at outer bottom corner'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'الصفحات الزوجية: عنوان الكتاب · الفردية: اسم المؤلف' : 'Left pages: book title · Right: author name'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isScreenplayProject && (
          <div>
            <SectionHeader title={ar ? 'تصدير السيناريو الاحترافي' : 'Industry Screenplay Export'} />
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${screenplay.enabled ? 'var(--color-accent)' : 'var(--color-border-light)'}`, transition: 'border-color 0.2s' }}
            >
              <div
                className="px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: screenplay.enabled ? 'rgba(var(--color-accent-rgb,0,0,0),0.05)' : 'var(--color-muted)' }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {ar ? 'تنسيق هوليوود الاحترافي للسيناريو' : 'Hollywood industry-standard screenplay format'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {ar
                      ? 'Courier 12pt · هوامش قياسية · ترويسات مشاهد · تقدير وقت العرض'
                      : 'Courier 12pt · Standard margins · Scene headings · Runtime estimate'}
                  </p>
                </div>
                <div
                  onClick={() => setScreenplay((s) => ({ ...s, enabled: !s.enabled }))}
                  dir="ltr" className="relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 mt-0.5"
                  style={{ backgroundColor: screenplay.enabled ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: screenplay.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </div>
              </div>

              {screenplay.enabled && (
                <div
                  className="px-4 py-3 space-y-3"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {ar ? 'اسم المؤلف' : 'Written by'}
                      </label>
                      <input
                        type="text"
                        className="input-field w-full text-sm"
                        value={screenplay.authorName}
                        onChange={(e) => setScreenplay((s) => ({ ...s, authorName: e.target.value }))}
                        placeholder={ar ? 'اسم المؤلف...' : 'Author name...'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {ar ? 'بيانات التواصل (غلاف)' : 'Contact info (cover)'}
                      </label>
                      <input
                        type="text"
                        className="input-field w-full text-sm"
                        value={screenplay.contactInfo}
                        onChange={(e) => setScreenplay((s) => ({ ...s, contactInfo: e.target.value }))}
                        placeholder={ar ? 'البريد الإلكتروني / الوكيل...' : 'Email / agent...'}
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {ar ? 'إظهار أرقام المشاهد' : 'Show scene numbers'}
                    </span>
                    <div
                      onClick={() => setScreenplay((s) => ({ ...s, showSceneNumbers: !s.showSceneNumbers }))}
                      dir="ltr"
                      className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
                      style={{ backgroundColor: screenplay.showSceneNumbers ? 'var(--color-accent)' : 'var(--color-border)' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                        style={{ transform: screenplay.showSceneNumbers ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </div>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePreviewRuntime}
                      className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      {ar ? 'احسب وقت العرض' : 'Estimate Runtime'}
                    </button>
                    {runtimeMinutes !== null && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                        {ar
                          ? `~ ${runtimeMinutes} دقيقة`
                          : `~ ${runtimeMinutes} min (${Math.floor(runtimeMinutes / 60)}h ${runtimeMinutes % 60}m)`}
                      </span>
                    )}
                  </div>

                  <div
                    className="rounded-lg px-3 py-2 text-xs space-y-1"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'ترويسات مشاهد: INT./EXT. – LOCATION – TIME' : 'Scene headings: INT./EXT. LOCATION – TIME'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'أسماء الشخصيات مُركزة بأحرف كبيرة' : 'Character names centred in caps'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'الحوار مُحاذى باحترافية مع الإرشادات بين قوسين' : 'Dialogue with indented parentheticals'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'انتقالات: CUT TO · FADE IN · DISSOLVE TO' : 'Transitions: CUT TO · FADE IN · DISSOLVE TO'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'Courier New 12pt · هوامش 8.5×11 بوصة' : 'Courier New 12pt · 8.5×11 in page size'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'قاعدة صفحة واحدة = دقيقة عرض واحدة' : '1 page ≈ 1 minute rule applied'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          <div>
            <SectionHeader title={ar ? 'تصدير Kindle' : 'Kindle Export'} />
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${kindle.enabled ? 'var(--color-accent)' : 'var(--color-border-light)'}`, transition: 'border-color 0.2s' }}
            >
              <div
                className="px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: kindle.enabled ? 'rgba(var(--color-accent-rgb,0,0,0),0.05)' : 'var(--color-muted)' }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {ar ? 'تنسيق XHTML متوافق مع Kindle' : 'Kindle-compatible XHTML format'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {ar
                      ? 'تخطيط سائل · خطوط النظام · فهرس قابل للنقر · بيانات الكتاب'
                      : 'Reflowable layout · System fonts · Clickable TOC · Book metadata'}
                  </p>
                </div>
                <div
                  onClick={() => setKindle((k) => ({ ...k, enabled: !k.enabled }))}
                  dir="ltr" className="relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 mt-0.5"
                  style={{ backgroundColor: kindle.enabled ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: kindle.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </div>
              </div>

              {kindle.enabled && (
                <div
                  className="px-4 py-3 space-y-3"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {ar ? 'اسم المؤلف' : 'Author name'}
                    </label>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={kindle.authorName}
                      onChange={(e) => setKindle((k) => ({ ...k, authorName: e.target.value }))}
                      placeholder={ar ? 'اسم المؤلف...' : 'Author name...'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {ar ? 'وصف الكتاب (اختياري)' : 'Book description (optional)'}
                    </label>
                    <textarea
                      className="input-field w-full text-sm resize-none"
                      rows={2}
                      value={kindle.description}
                      onChange={(e) => setKindle((k) => ({ ...k, description: e.target.value }))}
                      placeholder={ar ? 'وصف مختصر...' : 'Short description...'}
                    />
                  </div>
                  <div
                    className="rounded-lg px-3 py-2 text-xs space-y-1"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'تخطيط سائل بدون هوامش ثابتة' : 'Reflowable — no fixed margins'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'خطوط النظام الافتراضية فقط' : 'System default fonts only'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'فهرس قابل للنقر (epub:type="toc")' : 'Clickable TOC (epub:type="toc")'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'بيانات مُضمّنة: العنوان، المؤلف، اللغة' : 'Embedded metadata: title, author, language'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      <span>{ar ? 'دعم كامل للغة العربية واتجاه RTL' : 'Full RTL & Arabic language support'}</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {ar
                      ? 'بعد التنزيل، أضف الملف إلى Kindle Previewer أو Calibre لتحويله إلى EPUB/MOBI.'
                      : 'After download, add the file to Kindle Previewer or Calibre to convert to EPUB/MOBI.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader title={ar ? 'النشر على Amazon' : 'Amazon Publishing'} />
            <div className="space-y-2">
              <button
                onClick={handleOpenKdp}
                disabled={loading}
                className="w-full rounded-xl flex items-center gap-4 px-4 py-3.5 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #232F3E 0%, #37475A 100%)',
                  border: '1px solid rgba(255,153,0,0.3)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-extrabold shrink-0"
                  style={{ backgroundColor: '#FF9900', color: '#fff' }}
                >
                  K
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: '#FF9900' }}>
                    {ar ? 'تصدير لـ Amazon KDP' : 'Export for Amazon KDP'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {ar
                      ? 'ورقي 6×9 + Kindle · بيانات تلقائية · تحقق من الجودة'
                      : 'Paperback 6×9 + Kindle · Auto metadata · Quality check'}
                  </p>
                </div>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF9900' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => setShowKdpSettings(true)}
                className="w-full rounded-xl flex items-center gap-3 px-4 py-3 transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-muted)',
                  border: '1px solid rgba(255,153,0,0.2)',
                }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF9900' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {ar ? 'إعدادات KDP' : 'KDP Settings'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {ar
                      ? 'بيانات الكتاب · الكلمات المفتاحية · التصنيفات · إعدادات الطباعة'
                      : 'Book metadata · Keywords · Categories · Print settings'}
                  </p>
                </div>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <div
              className="text-sm rounded-lg px-4 py-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          className="px-6 py-4 flex gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {ar ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {ar ? 'طباعة / PDF' : 'Print / PDF'}
          </button>
          <button
            onClick={handleExportWord}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-white"
            style={{ backgroundColor: '#2B579A' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {loading ? (ar ? 'جاري...' : 'Loading...') : (ar ? 'تنزيل Word' : 'Download Word')}
          </button>
          <button
            onClick={handleExportHTML}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {loading ? (ar ? 'جاري...' : 'Loading...') : (ar ? 'تنزيل HTML' : 'Download HTML')}
          </button>
          {isScreenplayProject && screenplay.enabled && (
            <button
              onClick={handleExportScreenplay}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              {loading ? (ar ? 'جاري...' : 'Loading...') : (ar ? 'تنزيل السيناريو' : 'Download Screenplay')}
            </button>
          )}
          {kindle.enabled && (
            <button
              onClick={handleExportKindle}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#232F3E', color: '#FF9900' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {loading ? (ar ? 'جاري...' : 'Loading...') : (ar ? 'تنزيل Kindle' : 'Download Kindle')}
            </button>
          )}
        </div>
      </div>
    </div>

    {showKdpSettings && (
      <KdpSettingsModal
        project={project}
        onClose={() => setShowKdpSettings(false)}
      />
    )}
    </>
  );
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    novel: '📖',
    short_story: '📝',
    long_story: '📃',
    book: '📚',
    film_script: '🎬',
    tv_series: '📺',
    theatre_play: '🎭',
    radio_series: '📻',
    children_story: '🧒',
  };
  return icons[type] || '📄';
}
