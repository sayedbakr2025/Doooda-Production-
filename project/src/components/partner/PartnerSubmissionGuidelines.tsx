import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useInstitutionAuth } from '../../contexts/InstitutionAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';

interface Props {
  institution: InstitutionalAccount;
}

export default function PartnerSubmissionGuidelines({ institution }: Props) {
  const { refreshInstitution } = useInstitutionAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [text, setText] = useState(institution.submission_guidelines || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await supabase
        .from('institutional_accounts')
        .update({ submission_guidelines: text, updated_at: new Date().toISOString() })
        .eq('id', institution.id);
      await refreshInstitution();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {isRTL ? 'شروط التقديم' : 'Submission Guidelines'}
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        {isRTL
          ? 'هذه الشروط ستظهر للكتّاب عند التقديم لمسابقاتكم'
          : 'These guidelines will be shown to writers when submitting to your competitions'}
      </p>

      <textarea
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          minHeight: '200px',
        }}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={isRTL ? 'أدخل شروط وإرشادات التقديم...' : 'Enter submission conditions and guidelines...'}
      />

      <button
        onClick={handleSave}
        disabled={loading}
        className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
        style={{ backgroundColor: saved ? '#16a34a' : 'var(--color-accent)', color: 'white' }}
      >
        {saved ? (isRTL ? 'تم الحفظ' : 'Saved!') : loading ? (isRTL ? 'حفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
      </button>
    </div>
  );
}
