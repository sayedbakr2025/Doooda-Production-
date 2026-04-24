import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Project } from '../types';

interface Competition {
  id: string;
  title_ar: string;
  title_en: string;
  organizer_name_ar: string;
  organizer_name_en: string;
  submission_conditions_ar: string;
  submission_conditions_en: string;
  submission_end_at: string;
  partner_id: string;
  submission_method: 'email' | 'external_link' | 'via_doooda';
}

interface Props {
  project: Project;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function CompetitionSubmitModal({ project, onClose, onSubmitted }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingComps, setLoadingComps] = useState(true);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [form, setForm] = useState({
    work_summary: '',
    include_cv: false,
    file_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userTokens, setUserTokens] = useState(0);

  useEffect(() => {
    loadCompetitions();
    loadUserTokens();
  }, []);

  async function loadCompetitions() {
    setLoadingComps(true);
    const { data } = await supabase
      .from('competitions')
      .select('id, title_ar, title_en, organizer_name_ar, organizer_name_en, submission_conditions_ar, submission_conditions_en, submission_end_at, partner_id, submission_method')
      .eq('is_active', true)
      .gte('submission_end_at', new Date().toISOString())
      .or('submission_method.eq.via_doooda,created_by_partner.eq.true')
      .order('submission_end_at');
    setCompetitions(data || []);
    setLoadingComps(false);
  }

  async function loadUserTokens() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('users')
      .select('tokens_balance')
      .eq('id', user.id)
      .maybeSingle();
    setUserTokens(data?.tokens_balance || 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComp || !user?.id) return;
    if (userTokens < 10) {
      setError(isRTL ? 'رصيدك من التوكنز غير كافٍ (يحتاج 10 توكن)' : 'Insufficient tokens (requires 10 tokens)');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { error: submitErr } = await supabase
        .from('competition_submissions')
        .insert({
          competition_id: selectedComp.id,
          user_id: user.id,
          project_id: project.id,
          work_title: project.title,
          work_summary: form.work_summary,
          include_cv: form.include_cv,
          file_url: form.file_url,
          tokens_spent: 10,
        });

      if (submitErr) throw submitErr;

      await supabase
        .from('users')
        .update({ tokens_balance: userTokens - 10 })
        .eq('id', user.id);

      setSuccess(true);
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
            <svg className="w-7 h-7" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'تم تقديم العمل بنجاح!' : 'Work Submitted!'}
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'خُصم 10 توكن من رصيدك' : '10 tokens deducted from your balance'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {isRTL ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          maxHeight: '90vh',
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'تقديم العمل لمسابقة' : 'Submit Work to Competition'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {project.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#2563eb' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isRTL
              ? `تكلفة التقديم: 10 توكن — رصيدك: ${userTokens.toLocaleString()}`
              : `Submission cost: 10 tokens — Balance: ${userTokens.toLocaleString()}`}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'اختر المسابقة *' : 'Select Competition *'}
            </label>
            {loadingComps ? (
              <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
            ) : competitions.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL ? 'لا توجد مسابقات شركاء مفتوحة حالياً' : 'No open partner competitions right now'}
              </p>
            ) : (
              <div className="space-y-2">
                {competitions.map(c => {
                  const title = isRTL ? c.title_ar : c.title_en;
                  const org = isRTL ? c.organizer_name_ar : c.organizer_name_en;
                  const isSelected = selectedComp?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComp(c)}
                      className="rounded-xl px-4 py-3 cursor-pointer transition-all"
                      style={{
                        backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.06)' : 'var(--color-bg-secondary)',
                        border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        {org} · {isRTL ? 'ينتهي: ' : 'Ends: '}
                        {new Date(c.submission_end_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
                      </p>
                      {c.submission_conditions_ar && isSelected && (
                        <p className="text-xs mt-2 pt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
                          {isRTL ? c.submission_conditions_ar : c.submission_conditions_en}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedComp && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'ملخص العمل *' : 'Work Summary *'}
                </label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                  rows={4}
                  required
                  value={form.work_summary}
                  onChange={e => setForm(p => ({ ...p, work_summary: e.target.value }))}
                  placeholder={isRTL ? 'اكتب ملخصاً موجزاً لعملك...' : 'Write a brief summary of your work...'}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'رابط ملف العمل (اختياري)' : 'Work File Link (optional)'}
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                  dir="ltr"
                  placeholder="https://..."
                  value={form.file_url}
                  onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))}
                />
              </div>

              <label
                className="flex items-center gap-3 cursor-pointer"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
              >
                <input
                  type="checkbox"
                  checked={form.include_cv}
                  onChange={e => setForm(p => ({ ...p, include_cv: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? 'أرسل سيرتي الذاتية مع العمل' : 'Send my CV with the submission'}
                </span>
              </label>
            </>
          )}

          {error && (
            <div
              className="px-3 py-2.5 rounded-xl text-xs"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedComp || competitions.length === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              {submitting ? (isRTL ? 'تقديم...' : 'Submitting...') : (isRTL ? 'تقديم العمل (10 توكن)' : 'Submit Work (10 tokens)')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
