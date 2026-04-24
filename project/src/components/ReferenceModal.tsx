import { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';

interface ReferenceModalProps {
  projectId?: string;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    reference_name: string;
    author_name?: string;
    translator_name?: string;
    editor_name?: string;
    page_number?: string;
    quote?: string;
    edition?: string;
    publication_year?: string;
    publisher?: string;
  }) => Promise<void>;
  initialName?: string;
  existingReference?: any;
  language: 'ar' | 'en';
}

export default function ReferenceModal({
  onClose,
  onSave,
  initialName,
  existingReference,
  language
}: ReferenceModalProps) {
  const [referenceName, setReferenceName] = useState(existingReference?.reference_name || initialName || '');
  const [authorName, setAuthorName] = useState(existingReference?.author_name || '');
  const [translatorName, setTranslatorName] = useState(existingReference?.translator_name || '');
  const [editorName, setEditorName] = useState(existingReference?.editor_name || '');
  const [pageNumber, setPageNumber] = useState(existingReference?.page_number || '');
  const [quote, setQuote] = useState(existingReference?.quote || '');
  const [edition, setEdition] = useState(existingReference?.edition || '');
  const [publicationYear, setPublicationYear] = useState(existingReference?.publication_year || '');
  const [publisher, setPublisher] = useState(existingReference?.publisher || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await onSave({
        id: existingReference?.id,
        reference_name: referenceName.trim(),
        author_name: authorName.trim() || undefined,
        translator_name: translatorName.trim() || undefined,
        editor_name: editorName.trim() || undefined,
        page_number: pageNumber.trim() || undefined,
        quote: quote.trim() || undefined,
        edition: edition.trim() || undefined,
        publication_year: publicationYear.trim() || undefined,
        publisher: publisher.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save reference:', error);
      setError(language === 'ar' ? 'فشل حفظ المرجع. حاول مرة أخرى.' : 'Failed to save reference. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 p-6 border-b z-10" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {existingReference
                ? (language === 'ar' ? 'تعديل المرجع' : 'Edit Reference')
                : (language === 'ar' ? 'إضافة مرجع جديد' : 'Add New Reference')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-10"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'اسم المرجع *' : 'Reference Name *'}
              </label>
              <Input
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                placeholder={language === 'ar' ? 'اسم الكتاب أو المرجع' : 'Book or reference name'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'اسم المؤلف' : 'Author Name'}
              </label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={language === 'ar' ? 'اسم المؤلف' : 'Author name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'اسم المترجم' : 'Translator Name'}
              </label>
              <Input
                value={translatorName}
                onChange={(e) => setTranslatorName(e.target.value)}
                placeholder={language === 'ar' ? 'اسم المترجم' : 'Translator name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'اسم المحقق' : 'Editor Name'}
              </label>
              <Input
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder={language === 'ar' ? 'اسم المحقق' : 'Editor name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'رقم الصفحة' : 'Page Number'}
              </label>
              <Input
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder={language === 'ar' ? 'رقم الصفحة' : 'Page number'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'الاقتباس' : 'Quote'}
              </label>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder={language === 'ar' ? 'النص المقتبس من المرجع' : 'Quoted text from reference'}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {language === 'ar' ? 'الطبعة' : 'Edition'}
                </label>
                <Input
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  placeholder={language === 'ar' ? 'الطبعة' : 'Edition'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {language === 'ar' ? 'سنة النشر' : 'Publication Year'}
                </label>
                <Input
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(e.target.value)}
                  placeholder={language === 'ar' ? 'سنة النشر' : 'Year'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {language === 'ar' ? 'دار النشر' : 'Publisher'}
                </label>
                <Input
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder={language === 'ar' ? 'دار النشر' : 'Publisher'}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit" disabled={saving || !referenceName.trim()}>
              {saving
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-text-primary)'
              }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
