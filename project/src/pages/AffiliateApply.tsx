import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';

const PROMOTION_METHODS = [
  { value: 'blog', ar: 'مدونة / موقع', en: 'Blog / Website' },
  { value: 'youtube', ar: 'يوتيوب', en: 'YouTube' },
  { value: 'instagram', ar: 'إنستغرام', en: 'Instagram' },
  { value: 'twitter', ar: 'تويتر / X', en: 'Twitter / X' },
  { value: 'tiktok', ar: 'تيك توك', en: 'TikTok' },
  { value: 'podcast', ar: 'بودكاست', en: 'Podcast' },
  { value: 'email', ar: 'قائمة بريدية', en: 'Email List' },
  { value: 'other', ar: 'أخرى', en: 'Other' },
];

const STEPS = ['info', 'social', 'review'] as const;
type Step = typeof STEPS[number];

export default function AffiliateApply() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirm: '',
    website: '',
    country: '',
    promotion_method: 'blog',
    social_instagram: '',
    social_twitter: '',
    social_youtube: '',
    social_tiktok: '',
    social_other: '',
  });

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function nextStep() {
    setError('');
    if (step === 'info') {
      if (!form.name.trim() || !form.email.trim()) {
        setError(isRTL ? 'الاسم والبريد الإلكتروني مطلوبان' : 'Name and email are required');
        return;
      }
      if (!form.password || form.password.length < 6) {
        setError(isRTL ? 'كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
        return;
      }
      if (form.password !== form.password_confirm) {
        setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
        return;
      }
      setStep('social');
    } else if (step === 'social') {
      setStep('review');
    }
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const hashRes = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'hash', password: form.password },
      });
      if (hashRes.error) throw new Error(hashRes.error.message);

      const social_links: Record<string, string> = {};
      if (form.social_instagram) social_links.instagram = form.social_instagram;
      if (form.social_twitter) social_links.twitter = form.social_twitter;
      if (form.social_youtube) social_links.youtube = form.social_youtube;
      if (form.social_tiktok) social_links.tiktok = form.social_tiktok;
      if (form.social_other) social_links.other = form.social_other;

      const { data: codeData } = await supabase.rpc('generate_referral_code');
      const referral_code = codeData || 'AFF' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error: insertErr } = await supabase.from('affiliates').insert({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password_hash: hashRes.data.hash,
        website: form.website.trim() || null,
        country: form.country.trim() || null,
        promotion_method: form.promotion_method || null,
        social_links,
        referral_code,
        status: 'pending',
      });

      if (insertErr) {
        if (insertErr.message.includes('unique') || insertErr.message.includes('duplicate')) {
          setError(isRTL ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'This email is already registered');
        } else {
          setError(insertErr.message);
        }
        return;
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const stepIdx = STEPS.indexOf(step);

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#16a34a' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'تم استلام طلبك!' : 'Application Received!'}
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL
              ? 'سيراجع فريقنا طلبك ويتواصل معك خلال 2-3 أيام عمل. بعد الموافقة ستحصل على رابط الإحالة الخاص بك.'
              : 'Our team will review your application and contact you within 2-3 business days. After approval, you will receive your unique referral link.'}
          </p>
          <Link to="/affiliate/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}>
      <header className="px-6 h-14 flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <DooodaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/affiliate/login" className="text-sm font-semibold px-4 py-2 rounded-xl transition-all" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(var(--accent-rgb,59,130,246),0.1)', border: '1px solid rgba(var(--accent-rgb,59,130,246),0.2)' }}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'برنامج التسويق بالعمولة' : 'Affiliate Program'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'احصل على عمولة لكل مشترك تجلبه لدووودة' : 'Earn commission for every subscriber you refer to Doooda'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-7">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      backgroundColor: i <= stepIdx ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                      color: i <= stepIdx ? 'white' : 'var(--color-text-tertiary)',
                      border: `2px solid ${i <= stepIdx ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: i === stepIdx ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                    {s === 'info' ? (isRTL ? 'المعلومات' : 'Info') : s === 'social' ? (isRTL ? 'التواصل' : 'Social') : (isRTL ? 'مراجعة' : 'Review')}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-border)' }} />}
              </div>
            ))}
          </div>

          <div className="rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-7 space-y-4">
              {step === 'info' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                    </label>
                    <input className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder={isRTL ? 'اسمك الكامل' : 'Your full name'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <input type="email" dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'كلمة المرور *' : 'Password *'}
                    </label>
                    <input type="password" dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                    </label>
                    <input type="password" dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.password_confirm} onChange={e => set('password_confirm', e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الدولة' : 'Country'}
                    </label>
                    <input className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} placeholder={isRTL ? 'دولتك' : 'Your country'} />
                  </div>
                </>
              )}

              {step === 'social' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'طريقة الترويج الرئيسية' : 'Primary Promotion Method'}
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.promotion_method} onChange={e => set('promotion_method', e.target.value)}>
                      {PROMOTION_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{isRTL ? m.ar : m.en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الموقع الإلكتروني' : 'Website'}
                    </label>
                    <input dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yoursite.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Instagram</label>
                    <input dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.social_instagram} onChange={e => set('social_instagram', e.target.value)} placeholder="@username" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Twitter / X</label>
                    <input dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.social_twitter} onChange={e => set('social_twitter', e.target.value)} placeholder="@username" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>YouTube</label>
                    <input dir="ltr" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} value={form.social_youtube} onChange={e => set('social_youtube', e.target.value)} placeholder="youtube.com/c/yourchannel" />
                  </div>
                </>
              )}

              {step === 'review' && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {isRTL ? 'مراجعة البيانات' : 'Review Your Information'}
                  </p>
                  {[
                    { label: isRTL ? 'الاسم' : 'Name', value: form.name },
                    { label: isRTL ? 'البريد' : 'Email', value: form.email },
                    { label: isRTL ? 'الدولة' : 'Country', value: form.country || '-' },
                    { label: isRTL ? 'طريقة الترويج' : 'Promotion', value: PROMOTION_METHODS.find(m => m.value === form.promotion_method)?.[isRTL ? 'ar' : 'en'] || form.promotion_method },
                    { label: isRTL ? 'الموقع' : 'Website', value: form.website || '-' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{row.label}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.value}</span>
                    </div>
                  ))}
                  <div className="rounded-xl p-3 mt-2" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL
                        ? 'بتقديم الطلب أنت توافق على شروط برنامج العمولة. سيتم مراجعة طلبك من قِبل الفريق.'
                        : 'By submitting, you agree to the affiliate program terms. Your application will be reviewed by our team.'}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {step !== 'info' && (
                  <button onClick={() => setStep(step === 'review' ? 'social' : 'info')} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {isRTL ? 'رجوع' : 'Back'}
                  </button>
                )}
                {step !== 'review' ? (
                  <button onClick={nextStep} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
                    {isRTL ? 'التالي' : 'Next'}
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent)' }}>
                    {loading ? (isRTL ? 'جارٍ الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال الطلب' : 'Submit Application')}
                  </button>
                )}
              </div>
            </div>

            <div className="px-7 pb-6 pt-1">
              <div className="flex items-center justify-center gap-1 pt-5 text-sm" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'لديك حساب؟' : 'Already have an account?'}</span>
                <Link to="/affiliate/login" className="font-semibold" style={{ color: 'var(--color-accent)' }}>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
