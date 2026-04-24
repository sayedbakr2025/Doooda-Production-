import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabaseClient';

type BroadcastCategory = 'news' | 'important';

export default function AdminBroadcast() {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [ctaLabelEn, setCtaLabelEn] = useState('');
  const [ctaLabelAr, setCtaLabelAr] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [category, setCategory] = useState<BroadcastCategory>('news');
  const [targetType, setTargetType] = useState<'all' | 'plan' | 'email'>('all');
  const [planTarget, setPlanTarget] = useState('free');
  const [emailTarget, setEmailTarget] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!titleEn.trim() || !messageEn.trim()) {
      setError(isRtl ? 'العنوان والرسالة بالإنجليزي مطلوبان' : 'English title and message are required');
      return;
    }
    if (!titleAr.trim() || !messageAr.trim()) {
      setError(isRtl ? 'العنوان والرسالة بالعربي مطلوبان' : 'Arabic title and message are required');
      return;
    }
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const payload = {
        p_title: titleEn.trim(),
        p_message: messageEn.trim(),
        p_category: category,
        p_cta_label: ctaLabelEn.trim() || null,
        p_cta_link: ctaLink.trim() || null,
        p_plan_target: targetType === 'plan' ? planTarget : null,
        p_user_email: targetType === 'email' ? emailTarget.trim() : null,
        p_title_ar: titleAr.trim(),
        p_message_ar: messageAr.trim(),
        p_cta_label_ar: ctaLabelAr.trim() || null,
      };
      console.log('[Broadcast] Sending payload:', payload);
      const { data, error: fnError } = await supabase.rpc('admin_broadcast_notification', payload);
      if (fnError) {
        console.error('[Broadcast] RPC error:', fnError);
        throw fnError;
      }
      console.log('[Broadcast] Success, data:', data);
      const count = data as number;
      setResult(isRtl
        ? `تم إرسال الإشعار إلى ${count} مستخدم`
        : `Notification sent to ${count} user(s)`);
      setTitleEn(''); setTitleAr('');
      setMessageEn(''); setMessageAr('');
      setCtaLabelEn(''); setCtaLabelAr(''); setCtaLink('');
    } catch (err: any) {
      console.error('[Broadcast] Caught error:', err);
      setError(err.message || String(err));
    } finally {
      setSending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 500,
    marginBottom: '0.25rem',
    color: 'var(--color-text-secondary)',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        {isRtl ? 'بث إشعار' : 'Broadcast Notification'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>{isRtl ? 'الفئة' : 'Category'}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCategory('news')}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${category === 'news' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                backgroundColor: category === 'news' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: category === 'news' ? '#fff' : 'var(--color-text-primary)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              📰 {isRtl ? 'أخبار' : 'News'}
            </button>
            <button
              onClick={() => setCategory('important')}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${category === 'important' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                backgroundColor: category === 'important' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: category === 'important' ? '#fff' : 'var(--color-text-primary)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              ⚠️ {isRtl ? 'هام' : 'Important'}
            </button>
          </div>
        </div>

        {/* English */}
        <div style={sectionStyle}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-accent)' }}>
            🇬🇧 English
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Notification title" />
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={messageEn} onChange={e => setMessageEn(e.target.value)} placeholder="Notification message" />
            </div>
            <div>
              <label style={labelStyle}>CTA Button Label (optional)</label>
              <input style={inputStyle} value={ctaLabelEn} onChange={e => setCtaLabelEn(e.target.value)} placeholder="Button label" />
            </div>
          </div>
        </div>

        {/* Arabic */}
        <div style={sectionStyle}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-accent)' }}>
            🇸🇦 العربية
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>العنوان</label>
              <input style={{ ...inputStyle, direction: 'rtl' }} value={titleAr} onChange={e => setTitleAr(e.target.value)} placeholder="عنوان الإشعار" />
            </div>
            <div>
              <label style={labelStyle}>الرسالة</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', direction: 'rtl' }} value={messageAr} onChange={e => setMessageAr(e.target.value)} placeholder="محتوى الإشعار" />
            </div>
            <div>
              <label style={labelStyle}>نص الزر (اختياري)</label>
              <input style={{ ...inputStyle, direction: 'rtl' }} value={ctaLabelAr} onChange={e => setCtaLabelAr(e.target.value)} placeholder="نص الزر بالعربي" />
            </div>
          </div>
        </div>

        {/* CTA Link (shared) */}
        <div>
          <label style={labelStyle}>{isRtl ? 'رابط الزر' : 'CTA Link (shared)'}</label>
          <input style={inputStyle} value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="https://..." />
        </div>

        {/* Targeting */}
        <div>
          <label style={labelStyle}>{isRtl ? 'إرسال إلى' : 'Send to'}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'plan', 'email'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTargetType(t)}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${targetType === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: targetType === t ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: targetType === t ? '#fff' : 'var(--color-text-primary)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                }}
              >
                {t === 'all' ? (isRtl ? 'جميع المستخدمين' : 'All users')
                  : t === 'plan' ? (isRtl ? 'حسب الخطة' : 'By plan')
                  : (isRtl ? 'بريد إلكتروني' : 'By email')}
              </button>
            ))}
          </div>
        </div>

        {targetType === 'plan' && (
          <div>
            <label style={labelStyle}>{isRtl ? 'الخطة' : 'Plan'}</label>
            <select style={inputStyle} value={planTarget} onChange={e => setPlanTarget(e.target.value)}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        )}

        {targetType === 'email' && (
          <div>
            <label style={labelStyle}>{isRtl ? 'البريد الإلكتروني' : 'Email'}</label>
            <input style={inputStyle} value={emailTarget} onChange={e => setEmailTarget(e.target.value)} placeholder="user@example.com" />
          </div>
        )}

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.85rem' }}>
            {result}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !titleEn.trim() || !messageEn.trim() || !titleAr.trim() || !messageAr.trim()}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none',
            backgroundColor: sending || !titleEn.trim() || !messageEn.trim() || !titleAr.trim() || !messageAr.trim() ? 'var(--color-bg-tertiary)' : 'var(--color-accent)',
            color: sending || !titleEn.trim() || !messageEn.trim() || !titleAr.trim() || !messageAr.trim() ? 'var(--color-text-tertiary)' : '#fff',
            fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
          }}
        >
          {sending ? '...' : (isRtl ? 'إرسال' : 'Send')}
        </button>
      </div>
    </div>
  );
}