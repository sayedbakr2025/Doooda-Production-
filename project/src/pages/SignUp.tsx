import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { t, translateError } from '../utils/translations';
import { supabase } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';

export default function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [penName, setPenName] = useState('');
  const [writingLanguage, setWritingLanguage] = useState<'ar' | 'en' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const referralCodeRef = useRef<string | null>(null);
  const clickTrackedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      referralCodeRef.current = ref;
      sessionStorage.setItem('doooda_ref', ref);
      if (!clickTrackedRef.current) {
        clickTrackedRef.current = true;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-referral-click`;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ referral_code: ref }),
        }).catch(() => {});
      }
    } else {
      const stored = sessionStorage.getItem('doooda_ref');
      if (stored) {
        referralCodeRef.current = stored;
      }
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch', language));
      return;
    }

    if (password.length < 8) {
      setError(t('signup.passwordLength', language));
      return;
    }

    if (!writingLanguage) {
      setError(t('signup.languageRequired', language));
      return;
    }

    setLoading(true);

    try {
      console.log('[SignUp] Attempting signup with:', { email, writingLanguage });

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            pen_name: penName,
            preferred_language: writingLanguage,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (signupError) {
        console.error('[SignUp] Signup error:', signupError);
        throw signupError;
      }

      console.log('[SignUp] Signup successful:', {
        userId: data.user?.id,
        hasSession: !!data.session,
      });

      if (data?.user && !data.session) {
        setShowVerification(true);
      } else if (data?.session) {
        const refCode = referralCodeRef.current || sessionStorage.getItem('doooda_ref');
        if (refCode && data.session.access_token) {
          sessionStorage.removeItem('doooda_ref');
          const refUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-referral`;
          fetch(refUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ referral_code: refCode }),
          }).catch(() => {});
        }
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[SignUp] Caught error:', err);
      setError(err instanceof Error ? translateError(err.message, language) : t('error.unknown', language));
    } finally {
      setLoading(false);
    }
  }

  if (showVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-md w-full">
          <div className="rounded-2xl shadow-xl p-8 space-y-6 text-center" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-success)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('signup.verifyEmail', language)}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {t('signup.verifyMessage', language)}
              </p>
              <p className="text-sm pt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {email}
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => window.open('https://mail.google.com', '_blank')}
              >
                {t('signup.verifyCheck', language)}
              </Button>

              <Link to="/login">
                <Button variant="outline" className="w-full">
                  {t('signup.verifyBackLogin', language)}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'}`}>
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        <div className="rounded-2xl shadow-xl p-8 space-y-6" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex justify-center mb-4">
              <DooodaLogo />
            </Link>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('signup.title', language)}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>{t('signup.subtitle', language)}</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: `1px solid var(--color-error)`, color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                label={t('signup.firstName', language)}
                placeholder={t('placeholder.firstName', language)}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />

              <Input
                type="text"
                label={t('signup.lastName', language)}
                placeholder={t('placeholder.lastName', language)}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              type="text"
              label={t('signup.penName', language)}
              placeholder={t('placeholder.penName', language)}
              value={penName}
              onChange={(e) => setPenName(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('signup.language', language)} *
              </label>
              <select
                value={writingLanguage}
                onChange={(e) => setWritingLanguage(e.target.value as 'ar' | 'en')}
                className="input-field"
                required
              >
                <option value="">{t('signup.selectLanguage', language)}</option>
                <option value="ar">{t('signup.arabic', language)}</option>
                <option value="en">{t('signup.english', language)}</option>
              </select>
            </div>

            <Input
              type="email"
              label={t('signup.email', language)}
              placeholder={t('placeholder.email', language)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              label={t('signup.password', language)}
              placeholder={t('placeholder.password', language)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              type="password"
              label={t('signup.confirmPassword', language)}
              placeholder={t('placeholder.confirmPassword', language)}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              {t('signup.button', language)}
            </Button>
          </form>

          <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {t('signup.hasAccount', language)}{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--color-accent)' }}>
              {t('signup.login', language)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
