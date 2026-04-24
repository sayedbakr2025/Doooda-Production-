import { useState } from 'react';
import type { AffiliateAccount } from '../../contexts/AffiliateAuthContext';

interface Props {
  affiliate: AffiliateAccount;
  isRTL: boolean;
}

const BASE_URL = 'https://doooda.com';

export default function AffiliateLinks({ affiliate, isRTL }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const links = [
    { id: 'home', labelAr: 'رابط الصفحة الرئيسية', labelEn: 'Homepage Link', url: `${BASE_URL}/?ref=${affiliate.referral_code}` },
    { id: 'signup', labelAr: 'رابط التسجيل', labelEn: 'Signup Link', url: `${BASE_URL}/signup?ref=${affiliate.referral_code}` },
    { id: 'pricing', labelAr: 'رابط صفحة الأسعار', labelEn: 'Pricing Page Link', url: `${BASE_URL}/#pricing?ref=${affiliate.referral_code}` },
  ];

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'روابط الإحالة' : 'Referral Links'}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'شارك هذه الروابط لتتبع نقراتك وتحويلاتك وكسب عمولتك.' : 'Share these links to track your clicks, conversions, and earn commissions.'}
        </p>
      </div>

      <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#3b82f6' }}>{isRTL ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}</p>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-widest" style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{affiliate.referral_code}</span>
          <button onClick={() => copy(affiliate.referral_code, 'code')} className="text-xs px-3 py-1 rounded-lg font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
            {copied === 'code' ? (isRTL ? 'تم!' : 'Copied!') : (isRTL ? 'نسخ' : 'Copy')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {links.map(link => (
          <div key={link.id} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? link.labelAr : link.labelEn}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', direction: 'ltr' }}>
                {link.url}
              </div>
              <button onClick={() => copy(link.url, link.id)} className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80" style={{ backgroundColor: copied === link.id ? '#16a34a' : 'var(--color-accent)', color: 'white' }}>
                {copied === link.id ? (isRTL ? 'تم!' : 'Copied!') : (isRTL ? 'نسخ' : 'Copy')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mt-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'تعليمات الاستخدام' : 'How It Works'}
        </h3>
        <ul className="space-y-2">
          {[
            { ar: 'انسخ أي رابط أعلاه وشاركه على منصاتك', en: 'Copy any link above and share it on your platforms' },
            { ar: 'كل نقرة يتم تتبعها تلقائياً لمدة 30 يوماً', en: 'Every click is tracked automatically for 30 days' },
            { ar: 'إذا اشترى المستخدم خلال 30 يوماً تحصل على عمولتك', en: 'If the user purchases within 30 days, you earn your commission' },
            { ar: 'يمكنك طلب السحب بعد تجاوز الحد الأدنى', en: 'Request payout once you reach the minimum threshold' },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{i + 1}</span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? item.ar : item.en}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
