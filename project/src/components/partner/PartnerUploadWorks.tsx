import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';

interface InstitutionWork {
  id: string;
  title: string;
  summary: string;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  ai_evaluation: any;
  ai_evaluated_at: string | null;
  created_at: string;
}

interface Props {
  institution: InstitutionalAccount;
}

const emptyForm = { title: '', summary: '', notes: '' };

export default function PartnerUploadWorks({ institution }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [works, setWorks] = useState<InstitutionWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadWorks();
  }, [institution.id]);

  async function callInstitutionData(body: Record<string, unknown>) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${supabaseUrl}/functions/v1/institution-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ institution_id: institution.id, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function loadWorks() {
    setLoading(true);
    try {
      const data = await callInstitutionData({ action: 'get_works' });
      setWorks(data.works || []);
    } catch {
      setWorks([]);
    }
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && !form.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setForm((p) => ({ ...p, title: nameWithoutExt }));
    }
  }

  async function handleAdd() {
    setFormError('');
    if (!form.title.trim()) {
      setFormError(isRTL ? 'عنوان العمل مطلوب' : 'Work title is required');
      return;
    }
    if (!selectedFile && !form.summary.trim()) {
      setFormError(
        isRTL
          ? 'يرجى رفع ملف أو إدخال نص العمل'
          : 'Please upload a file or enter the work text'
      );
      return;
    }

    setSaving(true);
    setUploading(!!selectedFile);

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let extractedText = form.summary.trim();

    if (selectedFile) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('institution_id', institution.id);

        const res = await fetch(`${supabaseUrl}/functions/v1/upload-institution-work`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
          body: fd,
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Upload failed');

        fileUrl = result.signed_url || null;
        fileName = result.file_name || selectedFile.name;

        if (result.extracted_text) {
          extractedText = result.extracted_text;
        } else if (selectedFile.type === 'text/plain') {
          extractedText = await selectedFile.text();
        }
      } catch (err: any) {
        setFormError(isRTL ? 'فشل رفع الملف: ' + err.message : 'File upload failed: ' + err.message);
        setSaving(false);
        setUploading(false);
        return;
      }
    }

    setUploading(false);

    try {
      await callInstitutionData({
        action: 'insert_work',
        title: form.title.trim(),
        summary: extractedText || null,
        file_url: fileUrl,
        file_name: fileName,
        notes: form.notes.trim() || null,
      });
    } catch (err: any) {
      setSaving(false);
      setFormError(err.message);
      return;
    }

    setSaving(false);

    setForm(emptyForm);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowForm(false);
    loadWorks();
  }

  async function handleDelete(id: string) {
    if (!confirm(isRTL ? 'هل تريد حذف هذا العمل؟' : 'Delete this work?')) return;
    try {
      await callInstitutionData({ action: 'delete_work', work_id: id });
    } catch (err: any) {
      alert(isRTL ? 'فشل الحذف: ' + err.message : 'Delete failed: ' + err.message);
    }
    loadWorks();
  }

  async function handleEvaluate(work: InstitutionWork) {
    setEvaluating(work.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const criteriaData = await callInstitutionData({ action: 'get_criteria' });
      const criteria = criteriaData.criteria;

      if (!criteria || criteria.length === 0) {
        alert(
          isRTL
            ? 'يرجى إضافة شرائح التقييم أولاً من تبويب "التقييم"'
            : 'Please add evaluation criteria first from the "Evaluation" tab'
        );
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/evaluate-competition-work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          submission_id: work.id,
          work_title: work.title,
          work_summary: work.summary,
          file_url: work.file_url,
          criteria,
          institution_id: institution.id,
          target_table: 'institution_works',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Evaluation failed');
      }

      const result = await response.json();

      await callInstitutionData({
        action: 'update_work_evaluation',
        work_id: work.id,
        ai_evaluation: result,
      });

      loadWorks();
    } catch (err: any) {
      alert(isRTL ? 'فشل التقييم: ' + err.message : 'Evaluation failed: ' + err.message);
    } finally {
      setEvaluating(null);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'قيّم أعمالك' : 'Evaluate Works'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL
              ? 'ارفع أعمالاً استلمتها من خارج دووودة وقيّمها بنظام الذكاء الاصطناعي'
              : 'Upload works received outside Doooda and evaluate them with AI'}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormError('');
            setForm(emptyForm);
            setSelectedFile(null);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 shrink-0"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          + {isRTL ? 'إضافة عمل' : 'Add Work'}
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-5 mb-5 space-y-3"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'إضافة عمل للتقييم' : 'Add Work for Evaluation'}
          </h3>

          <input
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
            placeholder={isRTL ? 'عنوان العمل *' : 'Work title *'}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />

          <div>
            <p className="text-xs mb-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'رفع ملف (PDF, Word, TXT)' : 'Upload file (PDF, Word, TXT)'}
            </p>
            <label
              className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${selectedFile ? 'var(--color-accent)' : 'var(--color-border)'}`,
                backgroundColor: selectedFile ? 'rgba(var(--color-accent-rgb, 59,130,246), 0.04)' : 'var(--color-bg-secondary)',
                minHeight: '80px',
                padding: '16px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-accent)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    ({formatFileSize(selectedFile.size)})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="ml-1 text-xs px-2 py-0.5 rounded"
                    style={{ color: '#dc2626', backgroundColor: 'rgba(239,68,68,0.08)' }}
                  >
                    {isRTL ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? 'اضغط لاختيار ملف' : 'Click to select a file'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)', opacity: 0.7 }}>
                    PDF, DOC, DOCX, TXT &mdash; {isRTL ? 'حتى 50 MB' : 'up to 50 MB'}
                  </span>
                </div>
              )}
            </label>
          </div>

          <div>
            <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'أو أدخل نص/ملخص العمل مباشرة (للتقييم)'
                : 'Or enter work text/summary directly (for evaluation)'}
            </p>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ ...inputStyle, minHeight: '100px' }}
              placeholder={isRTL ? 'نص أو ملخص العمل...' : 'Work text or summary...'}
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            />
          </div>

          <input
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
            placeholder={isRTL ? 'ملاحظات داخلية (اختياري)' : 'Internal notes (optional)'}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />

          {formError && (
            <p className="text-xs" style={{ color: 'var(--color-error)' }}>
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setShowForm(false);
                setFormError('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              {saving ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-white rounded-full animate-spin"
                    style={{ borderTopColor: 'transparent' }}
                  />
                  {uploading
                    ? isRTL ? 'جارٍ الرفع...' : 'Uploading...'
                    : isRTL ? 'جارٍ الحفظ...' : 'Saving...'}
                </>
              ) : (
                isRTL ? 'حفظ' : 'Save'
              )}
            </button>
          </div>
        </div>
      )}

      {works.length === 0 && !showForm ? (
        <div
          className="rounded-2xl px-4 py-12 text-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <svg
            className="w-10 h-10 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL
              ? 'لا توجد أعمال بعد. أضف أول عمل لتقييمه!'
              : 'No works yet. Add your first work to evaluate!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map((work) => (
            <div
              key={work.id}
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {work.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {formatDate(work.created_at)}
                    {(work as any).file_name && ` · ${(work as any).file_name}`}
                    {work.notes && ` · ${work.notes}`}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                  style={{
                    backgroundColor: work.ai_evaluation
                      ? 'rgba(34,197,94,0.1)'
                      : 'var(--color-bg-secondary)',
                    color: work.ai_evaluation ? '#16a34a' : 'var(--color-text-tertiary)',
                    border: work.ai_evaluation
                      ? '1px solid rgba(34,197,94,0.2)'
                      : '1px solid var(--color-border)',
                  }}
                >
                  {work.ai_evaluation
                    ? isRTL ? 'تم التقييم' : 'Evaluated'
                    : isRTL ? 'لم يُقيَّم' : 'Not Evaluated'}
                </span>
              </div>

              {work.summary && (
                <p
                  className="text-xs leading-relaxed mb-3 line-clamp-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {work.summary}
                </p>
              )}

              {work.ai_evaluation && (
                <div
                  className="rounded-xl px-4 py-3 mb-3"
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold" style={{ color: '#16a34a' }}>
                      {isRTL ? 'نتيجة التقييم' : 'Evaluation Result'}
                    </span>
                    {work.ai_evaluation.compatibility_score !== undefined && (
                      <span
                        className="text-sm font-bold px-2 py-0.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                      >
                        {work.ai_evaluation.compatibility_score}%
                      </span>
                    )}
                  </div>

                  {work.ai_evaluation.criteria_scores && (
                    <div className="space-y-1.5">
                      {Object.entries(work.ai_evaluation.criteria_scores as Record<string, any>).map(
                        ([key, val]: any) => (
                          <div key={key} className="flex items-center justify-between gap-2">
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {key}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-20 h-1.5 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'var(--color-border)' }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${val.score || 0}%`, backgroundColor: '#16a34a' }}
                                />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                                {val.score}%
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedWork(selectedWork === work.id ? null : work.id)}
                    className="text-xs mt-2 font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {selectedWork === work.id
                      ? isRTL ? 'إخفاء التفاصيل' : 'Hide Details'
                      : isRTL ? 'عرض التقرير الكامل' : 'View Full Report'}
                  </button>
                </div>
              )}

              {selectedWork === work.id && work.ai_evaluation && (
                <div
                  className="rounded-xl px-4 py-3 mb-3 space-y-3"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {work.ai_evaluation.final_report && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {isRTL ? 'التقرير النهائي' : 'Final Report'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {work.ai_evaluation.final_report}
                      </p>
                    </div>
                  )}
                  {work.ai_evaluation.strengths && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#16a34a' }}>
                        {isRTL ? 'نقاط القوة' : 'Strengths'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {work.ai_evaluation.strengths}
                      </p>
                    </div>
                  )}
                  {work.ai_evaluation.weaknesses && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>
                        {isRTL ? 'نقاط الضعف' : 'Weaknesses'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {work.ai_evaluation.weaknesses}
                      </p>
                    </div>
                  )}
                  {work.ai_evaluation.problem_locations && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {isRTL ? 'المواضع التي تحتاج مراجعة' : 'Areas Needing Attention'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {work.ai_evaluation.problem_locations}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap mt-2">
                {work.file_url && (
                  <a
                    href={work.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isRTL ? 'تحميل الملف' : 'Download File'}
                  </a>
                )}

                <button
                  onClick={() => handleEvaluate(work)}
                  disabled={evaluating === work.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  {evaluating === work.id ? (
                    <>
                      <div
                        className="w-3 h-3 border border-white rounded-full animate-spin"
                        style={{ borderTopColor: 'transparent' }}
                      />
                      {isRTL ? 'التقييم جارٍ...' : 'Evaluating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      {work.ai_evaluation
                        ? isRTL ? 'إعادة التقييم' : 'Re-evaluate'
                        : isRTL ? 'قيّم الآن' : 'Evaluate Now'}
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(work.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#dc2626',
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isRTL ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
