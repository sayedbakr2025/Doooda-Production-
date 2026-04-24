import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/api';
import Button from './Button';
import Input from './Input';

interface EditProfileModalProps {
  onClose: () => void;
}

export default function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const meta = user?.user_metadata || {};

  const [firstName, setFirstName] = useState<string>(meta.first_name || '');
  const [lastName, setLastName] = useState<string>(meta.last_name || '');
  const [penName, setPenName] = useState<string>(meta.pen_name || '');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(meta.preferred_language || 'ar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          pen_name: penName.trim(),
          preferred_language: preferredLanguage,
        },
      });

      if (updateError) throw updateError;

      if (data.user) {
        updateUser({ user_metadata: data.user.user_metadata });
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, please try again'));
    } finally {
      setLoading(false);
    }
  }

  const labels = {
    title: language === 'ar' ? 'تعديل البيانات الشخصية' : 'Edit Profile',
    firstName: language === 'ar' ? 'الاسم الأول' : 'First Name',
    lastName: language === 'ar' ? 'اسم العائلة' : 'Last Name',
    penName: language === 'ar' ? 'الاسم المستعار' : 'Pen Name',
    writingLang: language === 'ar' ? 'لغة الكتابة' : 'Writing Language',
    arabic: language === 'ar' ? 'العربية' : 'Arabic',
    english: language === 'ar' ? 'الإنجليزية' : 'English',
    emailNote: language === 'ar' ? 'الإيميل لا يمكن تعديله' : 'Email cannot be changed',
    save: language === 'ar' ? 'حفظ التغييرات' : 'Save Changes',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    saved: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
  };

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
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? 'الإيميل:' : 'Email:'}
            </span>
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{user?.email}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', marginRight: isRTL ? 'auto' : undefined, marginLeft: isRTL ? undefined : 'auto' }}
            >
              {labels.emailNote}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="text"
              label={labels.firstName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              type="text"
              label={labels.lastName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            type="text"
            label={labels.penName}
            value={penName}
            onChange={(e) => setPenName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {labels.writingLang}
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="input-field w-full"
            >
              <option value="ar">{labels.arabic}</option>
              <option value="en">{labels.english}</option>
            </select>
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
              {labels.saved}
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
