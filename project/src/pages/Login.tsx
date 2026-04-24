import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { t, translateError } from '../utils/translations';
import Button from '../components/Button';
import Input from '../components/Input';
import DooodaLogo from '../components/DooodaLogo';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const role = await login(email, password);
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message, language) : t('error.unknown', language));
    } finally {
      setLoading(false);
    }
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
              {t('login.title', language)}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>{t('login.subtitle', language)}</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: `1px solid var(--color-error)`, color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label={t('login.email', language)}
              placeholder={t('placeholder.email', language)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              label={t('login.password', language)}
              placeholder={t('placeholder.password', language)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="rounded" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }} />
                <span className={`${language === 'ar' ? 'mr-2' : 'ml-2'}`} style={{ color: 'var(--color-text-secondary)' }}>
                  {t('login.remember', language)}
                </span>
              </label>
              <a href="#" className="font-medium" style={{ color: 'var(--color-accent)' }}>
                {t('login.forgot', language)}
              </a>
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              {t('login.button', language)}
            </Button>
          </form>

          <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {t('login.noAccount', language)}{' '}
            <Link to="/signup" className="font-medium" style={{ color: 'var(--color-accent)' }}>
              {t('login.signup', language)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
