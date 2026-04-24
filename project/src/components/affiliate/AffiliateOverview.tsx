import type { AffiliateAccount } from '../../contexts/AffiliateAuthContext';

interface Props {
  affiliate: AffiliateAccount;
  isRTL: boolean;
}

export default function AffiliateOverview({ affiliate, isRTL }: Props) {
  const pending = Math.max(0, affiliate.total_commission_earned - affiliate.total_commission_paid);
  const convRate = affiliate.total_clicks > 0 ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(1) : '0.0';

  const stats = [
    { labelAr: 'إجمالي النقرات', labelEn: 'Total Clicks', value: affiliate.total_clicks.toLocaleString(), icon: '👆', color: '#3b82f6' },
    { labelAr: 'التسجيلات', labelEn: 'Signups', value: affiliate.total_signups.toLocaleString(), icon: '👤', color: '#8b5cf6' },
    { labelAr: 'التحويلات', labelEn: 'Conversions', value: affiliate.total_conversions.toLocaleString(), icon: '🎯', color: '#f59e0b' },
    { labelAr: 'معدل التحويل', labelEn: 'Conv. Rate', value: convRate + '%', icon: '📊', color: '#10b981' },
    { labelAr: 'العمولة المكتسبة', labelEn: 'Total Earned', value: '$' + affiliate.total_commission_earned.toFixed(2), icon: '💰', color: '#16a34a' },
    { labelAr: 'عمولة قيد الانتظار', labelEn: 'Pending Payout', value: '$' + pending.toFixed(2), icon: '⏳', color: '#f97316' },
  ];

  const commissionLabel = affiliate.commission_type === 'percentage'
    ? `${affiliate.commission_value}%`
    : `$${affiliate.commission_value}`;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'مرحباً، ' + affiliate.name : 'Welcome, ' + affiliate.name}
        </h2>
        <div className="flex flex-wrap gap-3 mt-2">
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
            {isRTL ? 'كود الإحالة: ' : 'Referral Code: '}{affiliate.referral_code}
          </span>
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            {isRTL ? 'العمولة: ' : 'Commission: '}{commissionLabel} {affiliate.commission_type === 'percentage' ? (isRTL ? 'لكل عملية شراء' : 'per sale') : (isRTL ? 'لكل اشتراك' : 'per subscription')}
          </span>
        </div>
      </div>

      {affiliate.status !== 'approved' && (
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#d97706' }}>
            {affiliate.status === 'pending'
              ? (isRTL ? 'طلبك قيد المراجعة' : 'Application Under Review')
              : (isRTL ? 'تم تعليق الحساب' : 'Account Suspended')}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {affiliate.status === 'pending'
              ? (isRTL ? 'سيتم تفعيل حسابك بعد مراجعة الطلب من قِبل الفريق.' : 'Your account will be activated after our team reviews the application.')
              : (isRTL ? 'تواصل مع الدعم للمزيد من المعلومات.' : 'Contact support for more information.')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.labelEn} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-lg mb-1">{s.icon}</div>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? s.labelAr : s.labelEn}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'معلومات الحساب' : 'Account Information'}
        </h3>
        <div className="space-y-2">
          {[
            { labelAr: 'البريد الإلكتروني', labelEn: 'Email', value: affiliate.email },
            { labelAr: 'الدولة', labelEn: 'Country', value: affiliate.country || '-' },
            { labelAr: 'طريقة الترويج', labelEn: 'Promotion Method', value: affiliate.promotion_method || '-' },
            { labelAr: 'الحد الأدنى للسحب', labelEn: 'Min. Payout', value: '$' + affiliate.minimum_payout },
            { labelAr: 'تاريخ الانضمام', labelEn: 'Joined', value: new Date(affiliate.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB') },
          ].map(row => (
            <div key={row.labelEn} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{isRTL ? row.labelAr : row.labelEn}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
