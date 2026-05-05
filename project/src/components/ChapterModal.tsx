import { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';
import type { ProjectType } from '../types';

interface ChapterData {
  title: string;
  summary?: string;
  hook?: string;
  page_type?: 'single' | 'double';
  page_number?: number;
}

interface ChapterModalProps {
  projectId: string;
  onClose: () => void;
  onSave: (chapter: ChapterData) => Promise<void>;
  language: 'ar' | 'en';
  containerLabelAr?: string;
  containerLabelEn?: string;
  projectType?: ProjectType;
}

export default function ChapterModal({
  onClose,
  onSave,
  language,
  containerLabelAr = 'فصل',
  containerLabelEn = 'Chapter',
  projectType = 'novel',
}: ChapterModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [hook, setHook] = useState('');
  const [pageType, setPageType] = useState<'single' | 'double'>('single');
  const [pageNumber, setPageNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeConfig = getProjectTypeConfig(projectType);
  const hasChildrenFields = typeConfig.hasChildrenFields;

  const label = language === 'ar' ? containerLabelAr : containerLabelEn;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await onSave({
        title: title.trim(),
        summary: summary.trim() || undefined,
        hook: hasChildrenFields ? (hook.trim() || undefined) : undefined,
        page_type: hasChildrenFields ? pageType : undefined,
        page_number: hasChildrenFields && pageNumber ? parseInt(pageNumber, 10) : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      setError(
        language === 'ar'
          ? `فشل حفظ ال${label}. حاول مرة أخرى.`
          : `Failed to save ${label}. Please try again`
      );
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          {language === 'ar' ? `إضافة ${label} جديد` : `Add New ${label}`}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}

          {hasChildrenFields && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'نوع الصفحة' : 'Page Type'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${pageType === 'single' ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: pageType === 'single' ? 'var(--color-muted)' : 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <input type="radio" name="pageType" value="single" checked={pageType === 'single'} onChange={() => setPageType('single')} className="sr-only" />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {language === 'ar' ? 'صفحة فردية' : 'Single Page'}
                  </span>
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${pageType === 'double' ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: pageType === 'double' ? 'var(--color-muted)' : 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <input type="radio" name="pageType" value="double" checked={pageType === 'double'} onChange={() => setPageType('double')} className="sr-only" />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {language === 'ar' ? 'صفحة مزدوجة' : 'Double Page'}
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {language === 'ar' ? 'رقم الصفحة' : 'Page Number'}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={inputStyle}
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder={language === 'ar' ? 'رقم الصفحة' : 'Page number'}
                />
              </div>
              {pageType === 'double' && (
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {language === 'ar' 
                    ? 'ستحتاج لإدخال صفحتين للمشهد المزدوج' 
                    : 'You will need to add two scenes for the double page'}
                </p>
              )}
            </div>
          )}

          <Input
            label={language === 'ar' ? `عنوان ال${label}` : `${label} Title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={language === 'ar' ? `أدخل عنوان ال${label}` : `Enter ${label} title`}
          />

          {hasChildrenFields && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar' ? 'الخطاف (ما يجعل القارئ يستمر)' : 'Hook (what makes the reader want to continue)'}
              </label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={inputStyle}
                placeholder={language === 'ar' ? 'ما الذي يجعل القارئ يريد معرفة ما يحدث بعد ذلك؟' : 'What makes the reader want to know what happens next?'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? `ملخص ال${label}` : `${label} Summary`}
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={inputStyle}
              placeholder={language === 'ar' ? `ملخص مختصر لل${label}` : `Brief summary of the ${label}`}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving || !title.trim()} className="flex-1">
              {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}