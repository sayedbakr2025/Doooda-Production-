import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DailyGoalModalProps {
  currentGoal: number | null;
  onSave: (goal: number) => void;
  onClose: () => void;
}

export default function DailyGoalModal({ currentGoal, onSave, onClose }: DailyGoalModalProps) {
  const { language } = useLanguage();
  const [value, setValue] = useState(currentGoal ? String(currentGoal) : '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (!value || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      setError(language === 'ar' ? 'أدخل رقمًا صحيحًا أكبر من صفر' : 'Please enter a valid number greater than zero');
      return;
    }
    onSave(num);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '' || /^\d+$/.test(raw)) {
      setValue(raw);
      setError('');
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl w-full max-w-sm p-6"
        style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'حدد هدفًا يوميًا' : 'Set a Daily Goal'}
          </h3>
          <button
            onClick={onClose}
            style={{ color: 'var(--color-text-tertiary)' }}
            className="p-1 rounded hover:opacity-70 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {language === 'ar'
            ? 'حدد هدفًا تستطيع تحقيقه دون عناء، لا تقلق تستطيع تغييره في أي وقت تشاء'
            : 'Set a realistic goal you can achieve comfortably. You can always change it later.'}
        </p>

        <form onSubmit={handleSubmit}>
          {language === 'ar' ? (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                هدفي اليومي كتابة
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={value}
                onChange={handleInputChange}
                placeholder="500"
                className="flex-1 rounded-lg px-3 py-2 text-center text-lg font-semibold focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: `2px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
                  color: 'var(--color-text-primary)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                autoFocus
              />
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                كلمة
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                My daily goal:
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={value}
                onChange={handleInputChange}
                placeholder="500"
                className="flex-1 rounded-lg px-3 py-2 text-center text-lg font-semibold focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: `2px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
                  color: 'var(--color-text-primary)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                autoFocus
              />
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                words
              </span>
            </div>
          )}

          {error && (
            <p
              className="text-xs mb-3"
              style={{ color: 'var(--color-error)', textAlign: language === 'ar' ? 'right' : 'left' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white mt-4 transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {language === 'ar' ? 'سجّل هدفي' : 'Save Goal'}
          </button>
        </form>
      </div>
    </div>
  );
}
