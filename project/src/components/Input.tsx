import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', type, ...props }: InputProps) {
  const isLTR = type === 'email' || type === 'password';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        type={type}
        dir={isLTR ? 'ltr' : undefined}
        className={`input-field ${isLTR ? 'text-left' : ''} ${className}`}
        style={error ? { borderColor: 'var(--color-error)' } : undefined}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
      )}
    </div>
  );
}
