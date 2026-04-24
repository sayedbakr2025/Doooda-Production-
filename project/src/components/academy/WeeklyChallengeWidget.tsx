import { useState, useEffect } from 'react';
import type { AcademyWeeklyChallenge, AcademyChallengeSubmission } from '../../types/academy';
import { getChallengeSubmission, submitChallengeEntry, getChallengeSubmissionCount } from '../../services/academyApi';

interface Props {
  challenge: AcademyWeeklyChallenge;
  userId: string | null;
  language: string;
  isRTL: boolean;
}

export default function WeeklyChallengeWidget({ challenge, userId, language, isRTL }: Props) {
  const [submission, setSubmission] = useState<AcademyChallengeSubmission | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const title = language === 'ar' ? challenge.title_ar : challenge.title_en;
  const prompt = language === 'ar' ? challenge.prompt_ar : challenge.prompt_en;

  const now = new Date();
  const endsAt = new Date(challenge.ends_at);
  const msLeft = endsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  useEffect(() => {
    async function load() {
      try {
        const [count] = await Promise.all([
          getChallengeSubmissionCount(challenge.id),
        ]);
        setSubmissionCount(count);

        if (userId) {
          const sub = await getChallengeSubmission(userId, challenge.id);
          if (sub) {
            setSubmission(sub);
            setContent(sub.content);
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error('[WeeklyChallenge] Load failed:', err);
      }
    }
    load();
  }, [challenge.id, userId]);

  async function handleSubmit() {
    if (!userId) return;
    if (!content.trim()) {
      setError(isRTL ? 'الرجاء كتابة إجابتك' : 'Please write your response');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await submitChallengeEntry(userId, challenge.id, content.trim());
      setSubmission(result);
      setSubmitted(true);
      setSubmissionCount((prev) => submission ? prev : prev + 1);
    } catch (err) {
      console.error('[WeeklyChallenge] Submit failed:', err);
      setError(isRTL ? 'فشل الإرسال، حاول مجدداً' : 'Submission failed, please try again');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit() {
    setSubmitted(false);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden mb-10"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.06) 100%)',
        border: '1px solid rgba(245,158,11,0.25)',
      }}
    >
      <div className={`flex items-start justify-between gap-4 p-5 pb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <div className={`flex items-center gap-2 mb-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                {isRTL ? 'تحدي الأسبوع' : "Weekly Challenge"}
              </span>
              {challenge.tokens_reward > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                >
                  +{challenge.tokens_reward} {isRTL ? 'رمز' : 'tokens'}
                </span>
              )}
            </div>
            <h3 className="font-bold text-base leading-snug" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
          </div>
        </div>

        <div className={`flex flex-col items-end gap-1 shrink-0 ${isRTL ? 'items-start' : ''}`}>
          <div className="text-xs font-semibold" style={{ color: msLeft > 0 ? '#f59e0b' : 'var(--color-error)' }}>
            {msLeft > 0
              ? (daysLeft > 0
                  ? `${daysLeft}${isRTL ? ' أيام' : 'd'} ${hoursLeft}${isRTL ? ' س' : 'h'}`
                  : `${hoursLeft}${isRTL ? ' ساعة' : 'h left'}`)
              : (isRTL ? 'انتهى' : 'Ended')}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {submissionCount} {isRTL ? 'مشارك' : 'entries'}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-2 text-sm font-medium mb-3 transition-opacity hover:opacity-80 ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? (isRTL ? 'إخفاء التحدي' : 'Hide prompt') : (isRTL ? 'عرض التحدي' : 'Show prompt')}
        </button>

        {expanded && (
          <div
            className={`rounded-xl p-4 mb-4 text-sm leading-relaxed ${isRTL ? 'text-right' : ''}`}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {prompt}
          </div>
        )}

        {!userId ? (
          <p className={`text-sm ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'سجّل دخولك للمشاركة في التحدي' : 'Sign in to participate in this challenge'}
          </p>
        ) : submitted && submission ? (
          <div>
            {submission.score !== null ? (
              <div
                className={`flex items-center gap-3 rounded-xl p-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                  style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                >
                  {submission.score}
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="text-xs font-bold" style={{ color: '#22c55e' }}>
                    {isRTL ? 'تم التقييم' : 'Scored'}
                  </p>
                  {submission.feedback && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {submission.feedback}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#22c55e' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isRTL ? 'تم إرسال مشاركتك بنجاح' : 'Your entry has been submitted'}
              </div>
            )}

            <div
              className={`rounded-xl p-3 mb-3 text-sm ${isRTL ? 'text-right' : ''}`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {submission.content}
            </div>

            {msLeft > 0 && submission.score === null && (
              <button
                onClick={handleEdit}
                className="text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {isRTL ? 'تعديل المشاركة' : 'Edit submission'}
              </button>
            )}
          </div>
        ) : msLeft > 0 ? (
          <div>
            {!expanded && (
              <p className={`text-xs mb-3 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL ? 'اضغط على "عرض التحدي" لقراءة الموضوع' : 'Click "Show prompt" to read the challenge'}
              </p>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={isRTL ? 'اكتب إجابتك هنا...' : 'Write your response here...'}
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            {error && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className={`mt-3 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ backgroundColor: '#f59e0b', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {submitting ? (isRTL ? 'جارٍ الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال المشاركة' : 'Submit Entry')}
            </button>
          </div>
        ) : (
          <p className={`text-sm ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'انتهت مدة هذا التحدي' : 'This challenge has ended'}
          </p>
        )}
      </div>
    </div>
  );
}
