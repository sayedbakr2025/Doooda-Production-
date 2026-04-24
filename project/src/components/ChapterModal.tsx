import { useState } from 'react';
import Button from './Button';
import Input from './Input';

interface ChapterData {
  title: string;
  summary?: string;
}

interface ChapterModalProps {
  projectId: string;
  onClose: () => void;
  onSave: (chapter: ChapterData) => Promise<void>;
  language: 'ar' | 'en';
  containerLabelAr?: string;
  containerLabelEn?: string;
}

export default function ChapterModal({
  onClose,
  onSave,
  language,
  containerLabelAr = 'فصل',
  containerLabelEn = 'Chapter',
}: ChapterModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      setError(
        language === 'ar'
          ? `فشل حفظ ال${label}. حاول مرة أخرى.`
          : `Failed to save ${label}. Please try again.`
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-lg p-6 max-w-2xl w-full" style={{ backgroundColor: 'var(--color-surface)' }}>
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

          <Input
            label={language === 'ar' ? `عنوان ال${label}` : `${label} Title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={language === 'ar' ? `أدخل عنوان ال${label}` : `Enter ${label} title`}
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? `ملخص ال${label}` : `${label} Summary`}
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
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
