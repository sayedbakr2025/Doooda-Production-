import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';

const INSTITUTION_TYPES = [
  { value: 'publisher', ar: 'دار نشر', en: 'Publishing House' },
  { value: 'production_company', ar: 'شركة إنتاج', en: 'Production Company' },
  { value: 'agency', ar: 'وكالة أدبية', en: 'Literary Agency' },
  { value: 'festival', ar: 'مهرجان', en: 'Festival' },
];

const GENRES = [
  { value: 'novel', ar: 'رواية', en: 'Novel' },
  { value: 'short_story', ar: 'قصة قصيرة', en: 'Short Story' },
  { value: 'poetry', ar: 'شعر', en: 'Poetry' },
  { value: 'children', ar: 'أدب أطفال', en: "Children's Literature" },
  { value: 'drama', ar: 'مسرح', en: 'Drama' },
  { value: 'screenplay', ar: 'سيناريو', en: 'Screenplay' },
  { value: 'biography', ar: 'سيرة ذاتية', en: 'Biography' },
  { value: 'non_fiction', ar: 'غير خيالي', en: 'Non-Fiction' },
];

const WORK_TYPES = [
  { value: 'novel', ar: 'رواية', en: 'Novel' },
  { value: 'short_story', ar: 'مجموعة قصصية', en: 'Short Stories Collection' },
  { value: 'film_script', ar: 'سيناريو فيلم', en: 'Film Script' },
  { value: 'tv_series', ar: 'مسلسل تلفزيوني', en: 'TV Series' },
  { value: 'theatre_play', ar: 'مسرحية', en: 'Theatre Play' },
  { value: 'children_story', ar: 'قصة أطفال', en: "Children's Story" },
  { value: 'book', ar: 'كتاب', en: 'Book' },
];

const STEPS = ['basic', 'contact', 'preferences'] as const;
type Step = typeof STEPS[number];

export default function PartnerApply() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [step, setStep] = useState<Step>('basic');

  const [form, setForm] = useState({
    name: '',
    institution_type: 'publisher',
    country: '',
    city: '',
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    website: '',
    description: '',
    submission_guidelines: '',
    accepted_genres: [] as string[],
    accepted_work_types: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function toggleMulti(field: 'accepted_genres' | 'accepted_work_types', value: string) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  }

  function nextStep() {
    setError('');
    if (step === 'basic') {
      if (!form.name || !form.country) {
        setError(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
        return;
      }
      setStep('contact');
    } else if (step === 'contact') {
      if (!form.email) {
        setError(isRTL ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
        return;
      }
      if (!form.password || form.password.length < 8) {
        setError(isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
        return;
      }
      if (form.password !== form.password_confirm) {
        setError(isRTL ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
        return;
      }
      setStep('preferences');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: hashData, error: hashError } = await supabase.functions.invoke('institution-auth', {
        body: { action: 'hash', password: form.password },
      });
      if (hashError || !hashData?.hash) throw new Error(hashError?.message || 'Hash error');

      const { error: insertError } = await supabase.from('institutional_accounts').insert({
        name: form.name,
        institution_type: form.institution_type,
        country: form.country,
        city: form.city,
        email: form.email.toLowerCase().trim(),
        password_hash: hashData.hash,
        phone: form.phone,
        website: form.website,
        description: form.description,
        submission_guidelines: form.submission_guidelines,
        accepted_genres: form.accepted_genres,
        accepted_work_types: form.accepted_work_types,
        is_active: false,
        tokens_balance: 0,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError(isRTL ? 'هذا البريد الإلكتروني مسجل مسبقًا' : 'This email is already registered');
        } else {
          setError(insertError.message);
        }
        return;
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm transition-all outline-none';
  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const STEP_LABELS: Record<Step, { ar: string; en: string }> = {
    basic: { ar: 'معلومات المؤسسة', en: 'Institution Info' },
    contact: { ar: 'بيانات الدخول', en: 'Account Details' },
    preferences: { ar: 'التفضيلات', en: 'Preferences' },
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}
      >
        <header className="px-6 h-14 flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <DooodaLogo />
          <ThemeToggle />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="max-w-md w-full rounded-2xl p-10 text-center shadow-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <svg className="w-8 h-8" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'تم إرسال طلبك بنجاح!' : 'Application Submitted!'}
            </h2>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'سيقوم فريق دووودة بمراجعة طلبك والتواصل معك عبر البريد الإلكتروني خلال 2-3 أيام عمل.'
                : 'The Doooda team will review your application and contact you by email within 2-3 business days.'}
            </p>
            <p className="text-xs mb-8" style={{ color: 'var(--color-text-tertiary)' }}>
              {form.email}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      <header className="px-6 h-14 flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <DooodaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/partners/login"
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </div>
      </header>

      <div className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'انضم كشريك في دووودة' : 'Join Doooda as a Partner'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'دور النشر والمؤسسات الإنتاجية — ابدأ باستقبال الأعمال وإدارة المسابقات'
                : 'Publishers & Production Companies — Start receiving submissions and managing competitions'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      backgroundColor: i < stepIndex ? 'var(--color-success)' : i === stepIndex ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                      color: i <= stepIndex ? 'white' : 'var(--color-text-tertiary)',
                      border: i > stepIndex ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    {i < stepIndex ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-xs whitespace-nowrap hidden sm:block" style={{ color: i === stepIndex ? 'var(--color-accent)' : 'var(--color-text-tertiary)', fontWeight: i === stepIndex ? 600 : 400 }}>
                    {isRTL ? STEP_LABELS[s].ar : STEP_LABELS[s].en}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-16 h-px mx-2 mt-[-12px]" style={{ backgroundColor: i < stepIndex ? 'var(--color-success)' : 'var(--color-border)' }} />
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? STEP_LABELS[step].ar : STEP_LABELS[step].en}
              </h2>
            </div>

            <form onSubmit={step === 'preferences' ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
              <div className="p-6 space-y-5">
                {step === 'basic' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'اسم المؤسسة *' : 'Institution Name *'}
                        </label>
                        <input
                          className={inputClass}
                          style={inputStyle}
                          value={form.name}
                          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          placeholder={isRTL ? 'اسم المؤسسة أو دار النشر' : 'Name of institution or publisher'}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'نوع المؤسسة *' : 'Institution Type *'}
                        </label>
                        <select
                          className={inputClass}
                          style={inputStyle}
                          value={form.institution_type}
                          onChange={e => setForm(p => ({ ...p, institution_type: e.target.value }))}
                        >
                          {INSTITUTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'الدولة *' : 'Country *'}
                        </label>
                        <input
                          className={inputClass}
                          style={inputStyle}
                          value={form.country}
                          onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                          placeholder={isRTL ? 'مثلاً: السعودية' : 'e.g. Saudi Arabia'}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'المدينة' : 'City'}
                        </label>
                        <input
                          className={inputClass}
                          style={inputStyle}
                          value={form.city}
                          onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                          placeholder={isRTL ? 'مثلاً: الرياض' : 'e.g. Riyadh'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {isRTL ? 'الموقع الإلكتروني' : 'Website'}
                      </label>
                      <input
                        type="url"
                        className={inputClass}
                        style={inputStyle}
                        value={form.website}
                        onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                        dir="ltr"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {isRTL ? 'نبذة عن المؤسسة' : 'About the Institution'}
                      </label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        style={inputStyle}
                        rows={3}
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder={isRTL ? 'اكتب نبذة مختصرة عن مؤسستك...' : 'Brief description of your institution...'}
                      />
                    </div>
                  </>
                )}

                {step === 'contact' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'البريد الإلكتروني *' : 'Email Address *'}
                        </label>
                        <input
                          type="email"
                          className={inputClass}
                          style={inputStyle}
                          value={form.email}
                          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                          required
                          dir="ltr"
                          placeholder="institution@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                        </label>
                        <input
                          type="tel"
                          className={inputClass}
                          style={inputStyle}
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          dir="ltr"
                          placeholder="+966 5x xxx xxxx"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'كلمة المرور *' : 'Password *'}
                        </label>
                        <input
                          type="password"
                          className={inputClass}
                          style={inputStyle}
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          required
                          dir="ltr"
                          minLength={8}
                          placeholder={isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {isRTL ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                        </label>
                        <input
                          type="password"
                          className={inputClass}
                          style={inputStyle}
                          value={form.password_confirm}
                          onChange={e => setForm(p => ({ ...p, password_confirm: e.target.value }))}
                          required
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </>
                )}

                {step === 'preferences' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {isRTL ? 'الأنواع الأدبية المقبولة' : 'Accepted Genres'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map(g => (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => toggleMulti('accepted_genres', g.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              backgroundColor: form.accepted_genres.includes(g.value) ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                              color: form.accepted_genres.includes(g.value) ? 'white' : 'var(--color-text-secondary)',
                              border: `1px solid ${form.accepted_genres.includes(g.value) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            }}
                          >
                            {isRTL ? g.ar : g.en}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {isRTL ? 'أنواع الأعمال المقبولة' : 'Accepted Work Types'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {WORK_TYPES.map(w => (
                          <button
                            key={w.value}
                            type="button"
                            onClick={() => toggleMulti('accepted_work_types', w.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              backgroundColor: form.accepted_work_types.includes(w.value) ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                              color: form.accepted_work_types.includes(w.value) ? 'white' : 'var(--color-text-secondary)',
                              border: `1px solid ${form.accepted_work_types.includes(w.value) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            }}
                          >
                            {isRTL ? w.ar : w.en}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {isRTL ? 'شروط التقديم' : 'Submission Guidelines'}
                      </label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        style={inputStyle}
                        rows={4}
                        value={form.submission_guidelines}
                        onChange={e => setForm(p => ({ ...p, submission_guidelines: e.target.value }))}
                        placeholder={isRTL ? 'اكتب شروط وتعليمات التقديم للكتّاب...' : 'Write submission requirements for writers...'}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                {step !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep(STEPS[stepIndex - 1]); }}
                    className="px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {isRTL ? 'السابق' : 'Back'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  {step === 'preferences'
                    ? (loading ? (isRTL ? 'جارٍ الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال طلب الانضمام' : 'Submit Application'))
                    : (isRTL ? 'التالي' : 'Next')}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'هل لديك حساب بالفعل؟ ' : 'Already have an account? '}
            <Link to="/partners/login" className="font-semibold" style={{ color: 'var(--color-accent)' }}>
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
