import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';
interface Submission {
  id: string;
  work_title: string;
  work_summary: string;
  include_cv: boolean;
  file_url: string;
  tokens_spent: number;
  status: string;
  ai_evaluation: any;
  ai_evaluated_at: string | null;
  content_deleted_at: string | null;
  created_at: string;
  user_id: string;
  writer_name?: string;
  writer_email?: string;
}

interface Competition {
  id: string;
  title_ar: string;
  title_en: string;
  partner_id: string;
}

interface Props {
  competition: Competition;
  institution: InstitutionalAccount;
  onBack: () => void;
}

export default function PartnerReceivedWorks({ competition, institution, onBack }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [criteriaNames, setCriteriaNames] = useState<string[]>([]);

  useEffect(() => {
    loadSubmissions();
    loadCriteria();
  }, [competition.id]);

  async function loadCriteria() {
    const { data, error } = await supabase.functions.invoke('institution-data', {
      body: { action: 'get_criteria', institution_id: institution.id },
    });
    if (!error && data && !data.error) {
      setCriteriaNames((data.criteria || []).map((c: { name: string }) => c.name));
    }
  }

  async function loadSubmissions() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('institution-data', {
      body: {
        action: 'get_submissions',
        institution_id: institution.id,
        competition_id: competition.id,
      },
    });

    if (!error && data && !data.error) {
      setSubmissions(data.submissions || []);
    }
    setLoading(false);
  }

  async function handleEvaluate(sub: Submission) {
    setEvaluating(sub.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const { data: criteriaData } = await supabase.functions.invoke('institution-data', {
        body: { action: 'get_criteria', institution_id: institution.id },
      });
      const criteria = criteriaData?.criteria || [];

      const response = await fetch(`${supabaseUrl}/functions/v1/evaluate-competition-work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          submission_id: sub.id,
          work_title: sub.work_title,
          work_summary: sub.work_summary,
          file_url: sub.file_url,
          criteria,
          institution_id: institution.id,
        }),
      });

      if (!response.ok) throw new Error('Evaluation failed');
      const result = await response.json();

      await supabase.functions.invoke('institution-data', {
        body: {
          action: 'update_submission_evaluation',
          institution_id: institution.id,
          competition_id: competition.id,
          submission_id: sub.id,
          ai_evaluation: result,
        },
      });

      loadSubmissions();
    } catch (err: any) {
      alert(isRTL ? 'فشل التقييم: ' + err.message : 'Evaluation failed: ' + err.message);
    } finally {
      setEvaluating(null);
    }
  }

  const title = isRTL ? competition.title_ar : competition.title_en;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-secondary)', flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {isRTL ? 'العودة' : 'Back'}
      </button>

      <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {isRTL ? 'الأعمال المستلمة' : 'Received Works'}
      </h2>
      <p className="text-xs mb-5" style={{ color: 'var(--color-text-tertiary)' }}>
        {title} — {submissions.length} {isRTL ? 'عمل' : 'works'}
      </p>

      {submissions.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-12 text-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'لا توجد أعمال مستلمة بعد' : 'No works received yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div
              key={sub.id}
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {sub.work_title || (isRTL ? 'عنوان غير محدد' : 'Untitled')}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {sub.writer_name} {sub.writer_email ? `· ${sub.writer_email}` : ''}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                  style={{
                    backgroundColor: sub.ai_evaluation ? 'rgba(34,197,94,0.1)' : 'var(--color-bg-secondary)',
                    color: sub.ai_evaluation ? '#16a34a' : 'var(--color-text-tertiary)',
                    border: sub.ai_evaluation ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--color-border)',
                  }}
                >
                  {sub.ai_evaluation
                    ? (isRTL ? 'تم التقييم' : 'Evaluated')
                    : (isRTL ? 'لم يُقيَّم' : 'Not Evaluated')}
                </span>
              </div>

              {sub.content_deleted_at ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
                  style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
                    {isRTL ? 'تم حذف محتوى العمل بعد التقييم' : 'Work content deleted after evaluation'}
                  </p>
                </div>
              ) : sub.work_summary ? (
                <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {sub.work_summary}
                </p>
              ) : null}

              {sub.ai_evaluation && (
                <div
                  className="rounded-xl px-4 py-3 mb-3"
                  style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold" style={{ color: '#16a34a' }}>
                      {isRTL ? 'نتيجة التقييم' : 'Evaluation Result'}
                    </span>
                    {sub.ai_evaluation.compatibility_score !== undefined && (
                      <span
                        className="text-sm font-bold px-2 py-0.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                      >
                        {sub.ai_evaluation.compatibility_score}%
                      </span>
                    )}
                  </div>
                  {sub.ai_evaluation.criteria_scores && (
                    <div className="space-y-1.5">
                      {Object.entries(sub.ai_evaluation.criteria_scores as Record<string, any>).map(([key, val]: any) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{key}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                              <div className="h-full rounded-full" style={{ width: `${val.score || 0}%`, backgroundColor: '#16a34a' }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>{val.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedSubmission(selectedSubmission?.id === sub.id ? null : sub)}
                    className="text-xs mt-2 font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {selectedSubmission?.id === sub.id
                      ? (isRTL ? 'إخفاء التفاصيل' : 'Hide Details')
                      : (isRTL ? 'عرض التقرير الكامل' : 'View Full Report')}
                  </button>
                </div>
              )}

              {selectedSubmission?.id === sub.id && sub.ai_evaluation && (
                <div
                  className="rounded-xl px-4 py-3 mb-3 space-y-3 text-sm"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                >
                  {sub.ai_evaluation.final_report && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {isRTL ? 'التقرير النهائي' : 'Final Report'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {sub.ai_evaluation.final_report}
                      </p>
                    </div>
                  )}
                  {sub.ai_evaluation.strengths && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#16a34a' }}>
                        {isRTL ? 'نقاط القوة' : 'Strengths'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {sub.ai_evaluation.strengths}
                      </p>
                    </div>
                  )}
                  {sub.ai_evaluation.weaknesses && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>
                        {isRTL ? 'نقاط الضعف' : 'Weaknesses'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {sub.ai_evaluation.weaknesses}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {sub.file_url && !sub.content_deleted_at && (
                  <a
                    href={sub.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isRTL ? 'تحميل الملف' : 'Download File'}
                  </a>
                )}
                {sub.include_cv && (
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    {isRTL ? 'السيرة الذاتية مرفقة' : 'CV Included'}
                  </span>
                )}
                {!sub.ai_evaluation && criteriaNames.length > 0 && (
                  <button
                    onClick={() => handleEvaluate(sub)}
                    disabled={evaluating === sub.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                  >
                    {evaluating === sub.id ? (
                      <>
                        <div className="w-3 h-3 border border-white rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                        {isRTL ? 'التقييم جارٍ...' : 'Evaluating...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {isRTL ? 'تقييم العمل' : 'Evaluate Work'}
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {new Date(sub.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
