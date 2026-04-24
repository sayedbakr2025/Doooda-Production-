import { useState } from 'react';
import Button from './Button';

interface NoteModalProps {
  projectId: string;
  contextType: 'logline' | 'chapter_summary' | 'scene_summary' | 'scene_content';
  chapterNumber?: number;
  sceneNumber?: number;
  chapterId?: string;
  sceneId?: string;
  onClose: () => void;
  onSave: (noteData: { description: string; chapterId?: string; sceneId?: string }) => Promise<void>;
  language: 'ar' | 'en';
}

export default function NoteModal({
  onClose,
  onSave,
  language,
  chapterId,
  sceneId,
}: NoteModalProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!description.trim()) {
      setError(language === 'ar' ? 'الرجاء إدخال محتوى الملاحظة' : 'Please enter note content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        description: description.trim(),
        chapterId,
        sceneId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? 'محتوى الملاحظة' : 'Note Content'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 min-h-[120px]"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder={language === 'ar' ? 'اكتب ملاحظتك هنا...' : 'Write your note here...'}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              required
            />
          </div>

          {error && (
            <div className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              disabled={loading}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <Button type="submit" loading={loading}>
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
