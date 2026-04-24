import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInstitutionAuth } from '../contexts/InstitutionAuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';

export default function PartnerLogin() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { login } = useInstitutionAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/partners/dashboard');
    } catch {
      setError(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-secondary)', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      <header
        className="px-6 h-14 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <DooodaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/partners/apply"
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
            }}
          >
            {isRTL ? 'تقدم للانضمام' : 'Apply to Join'}
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: 'rgba(var(--accent-rgb, 59,130,246),0.1)', border: '1px solid rgba(var(--accent-rgb,59,130,246),0.2)' }}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'بوابة الشركاء' : 'Partner Portal'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'دور النشر والمؤسسات الإنتاجية والأدبية' : 'Publishers, Production Companies & Literary Partners'}
            </p>
          </div>

          <div
            className="rounded-2xl shadow-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <form onSubmit={handleSubmit} className="p-7 space-y-5">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="institution@example.com"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      paddingInlineEnd: '44px',
                    }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute top-1/2 -translate-y-1/2 p-2"
                    style={{ [isRTL ? 'left' : 'right']: '8px', color: 'var(--color-text-tertiary)' }}
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {loading
                  ? (isRTL ? 'جارٍ تسجيل الدخول...' : 'Signing in...')
                  : (isRTL ? 'تسجيل الدخول' : 'Sign In')}
              </button>
            </form>

            <div className="px-7 pb-6 pt-1">
              <div
                className="flex items-center justify-center gap-1 pt-5 text-sm"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}
                </span>
                <Link to="/partners/apply" className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {isRTL ? 'تقدم للانضمام' : 'Apply to Join'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
