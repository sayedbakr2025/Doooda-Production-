import { useState } from 'react';
import { upsertFeedbackReply, upsertRating } from '../../services/communityApi';
import type { CommunityFeedbackReply } from '../../services/communityApi';
import { StarRating } from './StarRating';

interface FeedbackReplyModalProps {
  topicId: string;
  userId: string;
  language: string;
  isRTL: boolean;
  existing?: CommunityFeedbackReply | null;
  onClose: () => void;
  onSubmitted: (feedback: CommunityFeedbackReply) => void;
}

const FIELD_LABELS = {
  structure_feedback: {
    ar: 'ملاحظات على البنية والحبكة',
    en: 'Structure & Plot Feedback',
    placeholder_ar: 'كيف كانت بنية القصة والحبكة؟',
    placeholder_en: 'How was the story structure and plot?',
  },
  character_feedback: {
    ar: 'ملاحظات على الشخصيات',
    en: 'Character Feedback',
    placeholder_ar: 'كيف كانت الشخصيات وتطورها؟',
    placeholder_en: 'How were the characters and their development?',
  },
  dialogue_feedback: {
    ar: 'ملاحظات على الحوار',
    en: 'Dialogue Feedback',
    placeholder_ar: 'كيف كان الحوار وأسلوب الكتابة؟',
    placeholder_en: 'How was the dialogue and writing style?',
  },
};

export default function FeedbackReplyModal({
  topicId,
  userId,
  language,
  isRTL,
  existing,
  onClose,
  onSubmitted,
}: FeedbackReplyModalProps) {
  const [form, setForm] = useState({
    structure_feedback: existing?.structure_feedback || '',
    character_feedback: existing?.character_feedback || '',
    dialogue_feedback: existing?.dialogue_feedback || '',
    overall_rating: existing?.overall_rating || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasContent =
    form.structure_feedback.trim().length > 0 ||
    form.character_feedback.trim().length > 0 ||
    form.dialogue_feedback.trim().length > 0;

  async function handleSubmit() {
    if (!hasContent) {
      setError(isRTL ? 'أضف ملاحظة واحدة على الأقل' : 'Please add at least one feedback field');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const feedback = await upsertFeedbackReply(topicId, userId, {
        structure_feedback: form.structure_feedback.trim(),
        character_feedback: form.character_feedback.trim(),
        dialogue_feedback: form.dialogue_feedback.trim(),
        overall_rating: form.overall_rating || null,
      });
      if (form.overall_rating > 0) {
        await upsertRating(topicId, userId, form.overall_rating).catch(() => {});
      }
      onSubmitted(feedback);
    } catch (err) {
      console.error('[FeedbackReplyModal] Failed:', err);
      setError(isRTL ? 'فشل الإرسال، حاول مجدداً' : 'Submission failed, please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div
          className={`sticky top-0 flex items-center justify-between p-5 border-b ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className={isRTL ? 'text-right' : ''}>
            <div className={`flex items-center gap-2 mb-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              <h2 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'تقديم تغذية راجعة' : 'Submit Writing Feedback'}
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'شارك ملاحظاتك البنّاءة' : 'Share your constructive observations'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((key) => {
            const meta = FIELD_LABELS[key];
            return (
              <div key={key}>
                <label
                  className={`block text-xs font-bold mb-1.5 ${isRTL ? 'text-right' : ''}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {isRTL ? meta.ar : meta.en}
                </label>
                <textarea
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  rows={3}
                  placeholder={isRTL ? meta.placeholder_ar : meta.placeholder_en}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                />
              </div>
            );
          })}

          <div>
            <label
              className={`block text-xs font-bold mb-2 ${isRTL ? 'text-right' : ''}`}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {isRTL ? 'التقييم الكلي' : 'Overall Rating'}
            </label>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <StarRating
                value={form.overall_rating}
                onChange={(score) => setForm({ ...form, overall_rating: score })}
                size="lg"
                showLabel
                language={language}
              />
              {form.overall_rating > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, overall_rating: 0 })}
                  className="text-xs hover:opacity-80"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {isRTL ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className={`text-xs ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-error, #ef4444)' }}>
              {error}
            </p>
          )}
        </div>

        <div
          className={`sticky bottom-0 flex gap-3 p-5 border-t ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !hasContent}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#f59e0b', color: '#fff' }}
          >
            {saving
              ? (isRTL ? 'جارٍ الإرسال...' : 'Submitting...')
              : existing
              ? (isRTL ? 'تحديث التغذية الراجعة' : 'Update Feedback')
              : (isRTL ? 'إرسال التغذية الراجعة' : 'Submit Feedback')}
          </button>
        </div>
      </div>
    </div>
  );
}
