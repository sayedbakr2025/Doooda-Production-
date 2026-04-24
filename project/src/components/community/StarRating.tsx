interface StarRatingProps {
  value: number;
  onChange?: (score: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  language?: string;
}

const SCORE_LABELS_AR = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];
const SCORE_LABELS_EN = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export function StarRating({ value, onChange, readonly = false, size = 'md', showLabel = false, language }: StarRatingProps) {
  const isRTL = language === 'ar';
  const sizePx = { sm: 14, md: 18, lg: 24 }[size];
  const labels = isRTL ? SCORE_LABELS_AR : SCORE_LABELS_EN;

  return (
    <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          style={{
            color: star <= value ? '#f59e0b' : 'var(--color-border)',
            cursor: readonly ? 'default' : 'pointer',
            transition: 'color 0.15s',
            background: 'none',
            border: 'none',
            padding: 0,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            if (readonly) return;
            const parent = e.currentTarget.parentElement;
            if (!parent) return;
            Array.from(parent.children).forEach((child, idx) => {
              (child as HTMLElement).style.color = idx < star ? '#f59e0b' : 'var(--color-border)';
            });
          }}
          onMouseLeave={(e) => {
            if (readonly) return;
            const parent = e.currentTarget.parentElement;
            if (!parent) return;
            Array.from(parent.children).forEach((child, idx) => {
              (child as HTMLElement).style.color = idx < value ? '#f59e0b' : 'var(--color-border)';
            });
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: sizePx, height: sizePx }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {showLabel && value > 0 && (
        <span className="text-xs font-semibold ms-1" style={{ color: '#f59e0b' }}>
          {labels[value]}
        </span>
      )}
    </div>
  );
}

interface AverageRatingProps {
  ratings: { score: number }[];
  language?: string;
  showCount?: boolean;
}

export function AverageRating({ ratings, language, showCount = true }: AverageRatingProps) {
  const isRTL = language === 'ar';
  if (ratings.length === 0) return null;

  const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
  const rounded = Math.round(avg * 10) / 10;

  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <StarRating value={Math.round(avg)} readonly size="sm" />
      <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{rounded}</span>
      {showCount && (
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          ({ratings.length} {isRTL ? 'تقييم' : ratings.length === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  );
}
