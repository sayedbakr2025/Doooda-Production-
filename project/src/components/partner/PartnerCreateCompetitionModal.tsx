import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';

const IANA_TIMEZONES = [
  'UTC', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Riyadh',
  'Asia/Baghdad', 'Asia/Beirut', 'Asia/Dubai', 'Asia/Kuwait',
  'Asia/Qatar', 'Asia/Riyadh', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles',
];

interface Prize {
  position: number;
  title_ar: string;
  title_en: string;
  reward_description_ar: string;
  reward_description_en: string;
  amount: string;
  currency: string;
  _key: string;
}

interface Props {
  institution: InstitutionalAccount;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY_PRIZE = (position: number): Prize => ({
  position,
  title_ar: '',
  title_en: '',
  reward_description_ar: '',
  reward_description_en: '',
  amount: '',
  currency: 'USD',
  _key: `${Date.now()}-${Math.random()}`,
});

export default function PartnerCreateCompetitionModal({ institution, onClose, onCreated }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [form, setForm] = useState({
    title_ar: '',
    title_en: '',
    organizer_name_ar: institution.name,
    organizer_name_en: institution.name,
    description_ar: '',
    description_en: '',
    submission_conditions_ar: institution.submission_guidelines || '',
    submission_conditions_en: institution.submission_guidelines || '',
    submission_start_at: '',
    submission_end_at: '',
    timezone: 'Africa/Cairo',
    submission_method: 'external_link' as 'email' | 'external_link' | 'via_doooda',
    submission_email: '',
    submission_link: '',
    boost_enabled: false,
    boost_budget_tokens: '',
  });
  const [prizes, setPrizes] = useState<Prize[]>([EMPTY_PRIZE(1)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addPrize() {
    setPrizes(p => [...p, EMPTY_PRIZE(p.length + 1)]);
  }

  function removePrize(key: string) {
    setPrizes(p => p.filter(x => x._key !== key).map((x, i) => ({ ...x, position: i + 1 })));
  }

  function updatePrize(key: string, field: keyof Prize, value: string) {
    setPrizes(p => p.map(x => x._key === key ? { ...x, [field]: value } : x));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.title_ar || !form.submission_start_at || !form.submission_end_at) {
      setError(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (form.boost_enabled) {
      const budget = parseInt(form.boost_budget_tokens);
      if (isNaN(budget) || budget <= 0) {
        setError(isRTL ? 'يرجى تحديد ميزانية التوكنز للترويج' : 'Please set boost token budget');
        return;
      }
      if (budget > institution.tokens_balance) {
        setError(isRTL ? 'رصيدك من التوكنز غير كافٍ' : 'Insufficient token balance');
        return;
      }
    }

    setLoading(true);
    try {
      const validPrizes = prizes.filter(p => p.title_ar || p.reward_description_ar).map(p => ({
        position: p.position,
        title_ar: p.title_ar,
        title_en: p.title_en || p.title_ar,
        reward_description_ar: p.reward_description_ar,
        reward_description_en: p.reward_description_en || p.reward_description_ar,
        amount: p.amount ? parseFloat(p.amount) : null,
        currency: p.currency || null,
      }));

      const { data, error: fnErr } = await supabase.functions.invoke('create-institution-competition', {
        body: {
          institution_id: institution.id,
          competition: {
            title_ar: form.title_ar,
            title_en: form.title_en || form.title_ar,
            organizer_name_ar: form.organizer_name_ar,
            organizer_name_en: form.organizer_name_en || form.organizer_name_ar,
            description_ar: form.description_ar,
            description_en: form.description_en || form.description_ar,
            submission_conditions_ar: form.submission_conditions_ar,
            submission_conditions_en: form.submission_conditions_en || form.submission_conditions_ar,
            submission_start_at: form.submission_start_at,
            submission_end_at: form.submission_end_at,
            timezone: form.timezone,
            submission_method: form.submission_method,
            submission_email: form.submission_method === 'email' ? form.submission_email : null,
            submission_link: form.submission_method === 'external_link' ? form.submission_link : null,
            boost_enabled: form.boost_enabled,
            boost_budget_tokens: form.boost_enabled ? parseInt(form.boost_budget_tokens) : 0,
          },
          prizes: validPrizes,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      onCreated();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          maxHeight: '92vh',
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 z-10" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'إنشاء مسابقة جديدة' : 'Create New Competition'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'اسم المسابقة (عربي) *' : 'Competition Name (Arabic) *'}
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir="rtl"
                value={form.title_ar}
                onChange={e => setForm(p => ({ ...p, title_ar: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'اسم المسابقة (إنجليزي)' : 'Competition Name (English)'}
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir="ltr"
                value={form.title_en}
                onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'وصف المسابقة (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
                dir="rtl"
                rows={3}
                value={form.description_ar}
                onChange={e => setForm(p => ({ ...p, description_ar: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'وصف المسابقة (إنجليزي)' : 'Description (English)'}
              </label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
                dir="ltr"
                rows={3}
                value={form.description_en}
                onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'تاريخ البدء *' : 'Start Date *'}
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir="ltr"
                value={form.submission_start_at}
                onChange={e => setForm(p => ({ ...p, submission_start_at: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'تاريخ الانتهاء *' : 'End Date *'}
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir="ltr"
                value={form.submission_end_at}
                onChange={e => setForm(p => ({ ...p, submission_end_at: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'المنطقة الزمنية' : 'Timezone'}
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir="ltr"
                value={form.timezone}
                onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
              >
                {IANA_TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'طريقة التقديم' : 'Submission Method'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['external_link', 'email', 'via_doooda'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, submission_method: m }))}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: form.submission_method === m ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: form.submission_method === m ? 'white' : 'var(--color-text-secondary)',
                    border: `1px solid ${form.submission_method === m ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {m === 'external_link'
                    ? (isRTL ? 'رابط خارجي' : 'External Link')
                    : m === 'email'
                    ? (isRTL ? 'بريد إلكتروني' : 'Email')
                    : (isRTL ? 'عبر دووودة' : 'Via Doooda')}
                </button>
              ))}
            </div>
            {form.submission_method === 'via_doooda' ? (
              <div
                className="mt-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#2563eb' }}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {isRTL
                  ? 'سيتمكن الكتّاب من تقديم أعمالهم مباشرةً عبر منصة دووودة (سوّق العمل).'
                  : 'Writers will be able to submit their works directly through the Doooda platform (Marketing Hub).'}
              </div>
            ) : (
              <input
                type={form.submission_method === 'email' ? 'email' : 'url'}
                className="w-full mt-2 px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                dir="ltr"
                placeholder={form.submission_method === 'email' ? 'submissions@example.com' : 'https://...'}
                value={form.submission_method === 'email' ? form.submission_email : form.submission_link}
                onChange={e => setForm(p => ({
                  ...p,
                  [form.submission_method === 'email' ? 'submission_email' : 'submission_link']: e.target.value,
                }))}
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL ? 'الجوائز' : 'Prizes'}
              </label>
              <button type="button" onClick={addPrize} className="text-xs" style={{ color: 'var(--color-accent)' }}>
                + {isRTL ? 'إضافة جائزة' : 'Add Prize'}
              </button>
            </div>
            <div className="space-y-3">
              {prizes.map((p, i) => (
                <div key={p._key} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                      {isRTL ? `الجائزة ${i + 1}` : `Prize ${i + 1}`}
                    </span>
                    {prizes.length > 1 && (
                      <button type="button" onClick={() => removePrize(p._key)} className="text-xs" style={{ color: 'var(--color-error)' }}>
                        {isRTL ? 'حذف' : 'Remove'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ ...inputStyle, backgroundColor: 'var(--color-surface)' }}
                      dir="rtl"
                      placeholder={isRTL ? 'الجائزة (عربي)' : 'Prize (Arabic)'}
                      value={p.title_ar}
                      onChange={e => updatePrize(p._key, 'title_ar', e.target.value)}
                    />
                    <input
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ ...inputStyle, backgroundColor: 'var(--color-surface)' }}
                      dir="ltr"
                      placeholder="Prize (English)"
                      value={p.title_en}
                      onChange={e => updatePrize(p._key, 'title_en', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ ...inputStyle, backgroundColor: 'var(--color-surface)' }}
                      dir="rtl"
                      placeholder={isRTL ? 'وصف الجائزة (عربي)' : 'Reward desc (Arabic)'}
                      value={p.reward_description_ar}
                      onChange={e => updatePrize(p._key, 'reward_description_ar', e.target.value)}
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ ...inputStyle, backgroundColor: 'var(--color-surface)' }}
                        dir="ltr"
                        placeholder={isRTL ? 'المبلغ' : 'Amount'}
                        value={p.amount}
                        onChange={e => updatePrize(p._key, 'amount', e.target.value)}
                      />
                      <input
                        className="w-16 px-2 py-2 rounded-lg text-xs outline-none uppercase"
                        style={{ ...inputStyle, backgroundColor: 'var(--color-surface)' }}
                        dir="ltr"
                        placeholder="USD"
                        value={p.currency}
                        onChange={e => updatePrize(p._key, 'currency', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: form.boost_enabled ? 'rgba(234,179,8,0.06)' : 'var(--color-bg-secondary)', border: `1px solid ${form.boost_enabled ? 'rgba(234,179,8,0.3)' : 'var(--color-border)'}` }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, boost_enabled: !p.boost_enabled }))}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ backgroundColor: form.boost_enabled ? '#ca8a04' : 'var(--color-border)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ [isRTL ? 'right' : 'left']: form.boost_enabled ? '1.25rem' : '0.125rem', transform: 'none' }}
                />
              </button>
              <div>
                <p className="text-sm font-semibold" style={{ color: form.boost_enabled ? '#ca8a04' : 'var(--color-text-primary)' }}>
                  {isRTL ? 'روّج المسابقة' : 'Boost Competition'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {isRTL ? 'عرض المسابقة للكتّاب مقابل 15 توكن لكل ظهور' : '15 tokens per popup shown to writers'}
                </p>
              </div>
            </div>

            {form.boost_enabled && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? `ميزانية الترويج (توكن) — رصيدك: ${institution.tokens_balance.toLocaleString()}` : `Boost Budget (tokens) — Balance: ${institution.tokens_balance.toLocaleString()}`}
                </label>
                <input
                  type="number"
                  min={15}
                  max={institution.tokens_balance}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                  dir="ltr"
                  value={form.boost_budget_tokens}
                  onChange={e => setForm(p => ({ ...p, boost_budget_tokens: e.target.value }))}
                />
                {form.boost_budget_tokens && (
                  <p className="text-xs mt-1" style={{ color: '#ca8a04' }}>
                    {isRTL
                      ? `≈ ${Math.floor(parseInt(form.boost_budget_tokens) / 15).toLocaleString()} ظهور للكتّاب`
                      : `≈ ${Math.floor(parseInt(form.boost_budget_tokens) / 15).toLocaleString()} impressions to writers`}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 px-5 py-4 flex gap-2" style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {loading ? (isRTL ? 'إنشاء...' : 'Creating...') : (isRTL ? 'إنشاء المسابقة' : 'Create Competition')}
          </button>
        </div>
      </form>
    </div>
  );
}
