import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { searchUserByEmail, sendCollaborationInvitation } from '../services/api';
import type { CollaboratorRole, CollaboratorUserResult } from '../types';

interface Props {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  onShared: () => void;
}

type Step = 'search' | 'role';

export default function ShareProjectModal({ projectId, projectTitle, onClose, onShared }: Props) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [step, setStep] = useState<Step>('search');
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<CollaboratorUserResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('viewer');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFoundUser(null);
    setNotFound(false);
    setError('');

    const trimmed = email.trim();
    console.log('[ShareDebug] Email input changed. trimmed:', trimmed, '| has @:', trimmed.includes('@'));
    if (!trimmed || !trimmed.includes('@')) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      console.log('[ShareDebug] Debounce fired — calling searchUserByEmail for:', trimmed);
      setSearching(true);
      try {
        const result = await searchUserByEmail(trimmed);
        console.log('[ShareDebug] searchUserByEmail result:', result);
        if (result) {
          setFoundUser(result);
          setNotFound(false);
        } else {
          setFoundUser(null);
          setNotFound(true);
        }
      } catch (err: any) {
        console.error('[ShareDebug] searchUserByEmail threw error:', err?.message, err);
        setFoundUser(null);
        setNotFound(false);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email]);

  const handleContinue = () => {
    if (!foundUser) return;
    setStep('role');
  };

  const handleShare = async () => {
    if (!foundUser) return;
    setSharing(true);
    setError('');
    try {
      await sendCollaborationInvitation(projectId, foundUser.id, selectedRole, projectTitle);
      setSuccess(true);
      setTimeout(() => {
        onShared();
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'SELF_INVITE') {
        setError(isRtl ? 'لا يمكنك دعوة نفسك' : 'You cannot invite yourself');
      } else if (msg === 'PROJECT_DELETED') {
        setError(isRtl ? 'هذا المشروع محذوف' : 'This project has been deleted');
      } else if (msg === 'ALREADY_ACTIVE') {
        setError(isRtl ? 'هذا المستخدم عضو نشط بالفعل' : 'This user is already an active member');
      } else if (msg === 'ALREADY_PENDING') {
        setError(isRtl ? 'تم إرسال دعوة لهذا المستخدم بالفعل' : 'An invitation has already been sent to this user');
      } else if (msg === 'ACCESS_FROZEN') {
        setError(isRtl ? 'وصول هذا المستخدم مجمد حالياً' : 'This user\'s access is currently frozen');
      } else if (msg === 'INVITE_ALREADY_SENT') {
        setError(isRtl ? 'تم إرسال دعوة لهذا المستخدم بالفعل' : 'An invitation has already been sent to this user');
      } else {
        setError(isRtl ? 'حدث خطأ أثناء إرسال الدعوة' : 'Something went wrong while sending the invitation');
      }
    } finally {
      setSharing(false);
    }
  };

  const roles: { value: CollaboratorRole; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
    {
      value: 'viewer',
      labelAr: 'مشاهد',
      labelEn: 'Viewer',
      descAr: 'قراءة فقط، لا يمكنه التعديل',
      descEn: 'Read-only access, cannot edit',
    },
    {
      value: 'editor',
      labelAr: 'محرر',
      labelEn: 'Editor',
      descAr: 'تعديل النصوص فقط، بدون الحبكة أو الذكاء الاصطناعي',
      descEn: 'Edit text only, no plot or AI access',
    },
    {
      value: 'manager',
      labelAr: 'مدير',
      labelEn: 'Manager',
      descAr: 'وصول كامل ما عدا حذف المشروع أو الفصول',
      descEn: 'Full access except deleting project or chapters',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-md"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRtl ? 'مشاركة المشروع' : 'Share Project'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-success)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                {isRtl ? 'تم إرسال الدعوة بنجاح' : 'Invitation sent successfully'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRtl
                  ? 'سيظهر المشروع بعد قبول المستخدم للدعوة'
                  : 'The project will appear after the user accepts the invitation'}
              </p>
            </div>
          ) : step === 'search' ? (
            <>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {isRtl ? 'البريد الإلكتروني للمستخدم' : 'User Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRtl ? 'أدخل البريد الإلكتروني...' : 'Enter email address...'}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  autoFocus
                />
                {searching && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ [isRtl ? 'left' : 'right']: '12px' }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
                    />
                  </div>
                )}
              </div>

              {foundUser && (
                <div
                  className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {foundUser.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {foundUser.display_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {foundUser.email}
                    </p>
                  </div>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-success)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {notFound && email.includes('@') && !searching && (
                <p className="mt-2 text-xs" style={{ color: 'var(--color-error)' }}>
                  {isRtl
                    ? 'لا يوجد حساب مسجل بهذا البريد الإلكتروني'
                    : 'No account found with this email address'}
                </p>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-primary)' }}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!foundUser}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{
                    backgroundColor: foundUser ? 'var(--color-accent)' : 'var(--color-muted)',
                    color: foundUser ? 'white' : 'var(--color-text-tertiary)',
                    cursor: foundUser ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg mb-5"
                style={{ backgroundColor: 'var(--color-muted)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {foundUser?.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {foundUser?.display_name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {foundUser?.email}
                  </p>
                </div>
                <button
                  onClick={() => { setStep('search'); setFoundUser(null); setEmail(''); }}
                  className="text-xs underline"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {isRtl ? 'تغيير' : 'Change'}
                </button>
              </div>

              <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {isRtl ? 'حدد الصلاحية' : 'Select Role'}
              </p>

              <div className="flex flex-col gap-2 mb-5">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl text-start transition-all"
                    style={{
                      border: selectedRole === r.value
                        ? '2px solid var(--color-accent)'
                        : '2px solid var(--color-border)',
                      backgroundColor: selectedRole === r.value ? 'var(--color-muted)' : 'transparent',
                    }}
                  >
                    <div
                      className="w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{
                        borderColor: selectedRole === r.value ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      {selectedRole === r.value && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {isRtl ? r.labelAr : r.labelEn}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {isRtl ? r.descAr : r.descEn}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-lg mb-5"
                style={{ backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ca8a04' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: '#ca8a04' }}>
                  {isRtl
                    ? 'أنت مسؤول عن التصرفات التي يقوم بها هذا المستخدم في المشروع.'
                    : 'You are responsible for actions taken by this user on the project.'}
                </p>
              </div>

              {error && (
                <p className="text-xs mb-4" style={{ color: 'var(--color-error)' }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep('search')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-primary)' }}
                >
                  {isRtl ? 'رجوع' : 'Back'}
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ backgroundColor: 'var(--color-accent)', opacity: sharing ? 0.7 : 1 }}
                >
                  {sharing
                    ? (isRtl ? 'جاري المشاركة...' : 'Sharing...')
                    : (isRtl ? 'مشاركة' : 'Share')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
