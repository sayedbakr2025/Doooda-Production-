import type { KdpComplianceResult, ComplianceCheck, ComplianceSeverity } from './kdpComplianceValidator';

interface Props {
  result: KdpComplianceResult;
  ar: boolean;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  content: { en: 'Content', ar: 'المحتوى' },
  metadata: { en: 'Metadata', ar: 'البيانات التعريفية' },
  technical: { en: 'Technical', ar: 'التقني' },
  pricing: { en: 'Pricing', ar: 'التسعير' },
};

function SeverityIcon({ severity }: { severity: ComplianceSeverity }) {
  if (severity === 'pass') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5" />
        <path d="M5 8.5l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (severity === 'warning') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14.5 13H1.5L8 2z" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6.5v3" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="#f59e0b" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function severityColor(s: ComplianceSeverity): string {
  if (s === 'pass') return '#22c55e';
  if (s === 'warning') return '#f59e0b';
  return '#ef4444';
}

function severityBg(s: ComplianceSeverity): string {
  if (s === 'pass') return 'rgba(34,197,94,0.06)';
  if (s === 'warning') return 'rgba(245,158,11,0.06)';
  return 'rgba(239,68,68,0.06)';
}

function severityBorder(s: ComplianceSeverity): string {
  if (s === 'pass') return 'rgba(34,197,94,0.2)';
  if (s === 'warning') return 'rgba(245,158,11,0.2)';
  return 'rgba(239,68,68,0.2)';
}

function CheckRow({ check, ar }: { check: ComplianceCheck; ar: boolean }) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: severityBg(check.severity),
        border: `1px solid ${severityBorder(check.severity)}`,
      }}
    >
      <SeverityIcon severity={check.severity} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: severityColor(check.severity) }}>
          {ar ? check.labelAr : check.labelEn}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {ar ? check.detailAr : check.detailEn}
        </p>
      </div>
    </div>
  );
}

export default function KdpComplianceBadge({ result, ar, compact = false }: Props) {
  const { checks, kdpReady, errorCount, warningCount, passCount } = result;

  const categories = ['metadata', 'technical', 'content', 'pricing'] as const;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {kdpReady ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1.5px solid #22c55e' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1.5" />
              <path d="M5 8.5l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ar ? 'جاهز لـ KDP' : 'KDP Ready'}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: errorCount > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)',
              color: errorCount > 0 ? '#ef4444' : '#f59e0b',
              border: `1.5px solid ${errorCount > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
            }}
          >
            {errorCount > 0 ? '✕' : '⚠'}
            {ar
              ? `${errorCount} خطأ · ${warningCount} تحذير`
              : `${errorCount} error(s) · ${warningCount} warning(s)`}
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {ar ? `${passCount} فحص ناجح` : `${passCount} checks passed`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {ar ? 'محاكاة فحص Amazon KDP' : 'Amazon KDP Compliance Check'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar
              ? `${passCount} ناجح · ${warningCount} تحذير · ${errorCount} خطأ`
              : `${passCount} passed · ${warningCount} warnings · ${errorCount} errors`}
          </p>
        </div>

        {kdpReady ? (
          <span
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl"
            style={{
              backgroundColor: 'rgba(34,197,94,0.12)',
              color: '#22c55e',
              border: '2px solid #22c55e',
              boxShadow: '0 0 0 4px rgba(34,197,94,0.08)',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1.5" />
              <path d="M5 8.5l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ar ? 'جاهز لـ KDP' : 'KDP Ready'}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl"
            style={{
              backgroundColor: errorCount > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)',
              color: errorCount > 0 ? '#ef4444' : '#f59e0b',
              border: `2px solid ${errorCount > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)'}`,
            }}
          >
            {errorCount > 0 ? (ar ? 'يحتاج تصحيح' : 'Needs Fixes') : (ar ? 'تحذيرات موجودة' : 'Has Warnings')}
          </span>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-2 rounded-xl p-3"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
      >
        {[
          { label: ar ? 'ناجح' : 'Passed', count: passCount, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          { label: ar ? 'تحذيرات' : 'Warnings', count: warningCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: ar ? 'أخطاء' : 'Errors', count: errorCount, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center rounded-lg py-2 px-1"
            style={{ backgroundColor: item.bg }}
          >
            <span className="text-xl font-bold tabular-nums" style={{ color: item.color }}>
              {item.count}
            </span>
            <span className="text-xs mt-0.5" style={{ color: item.color, opacity: 0.8 }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const catChecks = checks.filter((c) => c.category === cat);
          if (catChecks.length === 0) return null;
          return (
            <div key={cat}>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {ar ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
              </p>
              <div className="space-y-1.5">
                {catChecks.map((check) => (
                  <CheckRow key={check.code} check={check} ar={ar} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!kdpReady && (
        <div
          className="rounded-xl px-4 py-3 text-xs"
          style={{
            backgroundColor: 'rgba(255,153,0,0.07)',
            border: '1px solid rgba(255,153,0,0.2)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: '#FF9900' }}>
            {ar ? 'ملاحظة' : 'Note'}
          </p>
          {ar
            ? 'هذا فحص محلي تقريبي. Amazon KDP قد يطبّق متطلبات إضافية عند الرفع الفعلي.'
            : 'This is a local simulation. Amazon KDP may apply additional checks during actual upload.'}
        </div>
      )}
    </div>
  );
}
