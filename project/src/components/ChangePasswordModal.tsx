import { useState, FormEvent } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/api';
import Button from './Button';
import Input from './Input';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const labels = {
    title: language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password',
    oldPassword: language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password',
    newPassword: language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password',
    confirmPassword: language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password',
    save: language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    mismatch: language === 'ar' ? 'كلمة المرور الجديدة غير متطابقة' : 'New passwords do not match',
    tooShort: language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters',
    wrongOld: language === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect',
    success: language === 'ar' ? 'تم تغيير كلمة مرورك بنجاح' : 'Your password has been changed successfully',
    genericError: language === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, please try again',
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(labels.mismatch);
      return;
    }

    if (newPassword.length < 8) {
      setError(labels.tooShort);
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: oldPassword,
      });

      if (signInError) {
        setError(labels.wrongOld);
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.genericError);
    } finally {
      setLoading(false);
    }
  }

  function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    const Icon = show ? EyeOff : Eye;
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 p-1 rounded"
        style={{
          [isRTL ? 'left' : 'right']: '0.75rem',
          color: 'var(--color-text-secondary)',
          top: '50%',
        }}
        tabIndex={-1}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {labels.title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <Input
              type={showOld ? 'text' : 'password'}
              label={labels.oldPassword}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <PasswordToggle show={showOld} onToggle={() => setShowOld((v) => !v)} />
          </div>

          <div className="relative">
            <Input
              type={showNew ? 'text' : 'password'}
              label={labels.newPassword}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <PasswordToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              label={labels.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
            >
              {labels.success}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              {labels.save}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {labels.cancel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
