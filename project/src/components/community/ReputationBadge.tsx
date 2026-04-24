import type { ReputationLevel, CommunityUserStats } from '../../services/communityApi';

const LEVEL_CONFIG: Record<ReputationLevel, {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  shortLabel: string;
}> = {
  'Beginner Writer': {
    icon: '✦',
    color: '#6b7280',
    bgColor: 'rgba(107,114,128,0.08)',
    borderColor: 'rgba(107,114,128,0.2)',
    shortLabel: 'Beginner',
  },
  'Emerging Writer': {
    icon: '◈',
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.2)',
    shortLabel: 'Emerging',
  },
  'Active Contributor': {
    icon: '◆',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.2)',
    shortLabel: 'Active',
  },
  'Community Pillar': {
    icon: '★',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
    shortLabel: 'Pillar',
  },
  'Master Storyteller': {
    icon: '⬟',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.25)',
    shortLabel: 'Master',
  },
};

interface ReputationBadgeProps {
  level: ReputationLevel;
  points?: number;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  showFullLabel?: boolean;
}

export function ReputationBadge({
  level,
  points,
  size = 'sm',
  showPoints = false,
  showFullLabel = false,
}: ReputationBadgeProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG['Beginner Writer'];

  const sizeStyles = {
    sm: { fontSize: '10px', padding: '1px 6px', gap: '3px', iconSize: '10px' },
    md: { fontSize: '11px', padding: '2px 8px', gap: '4px', iconSize: '11px' },
    lg: { fontSize: '13px', padding: '4px 10px', gap: '5px', iconSize: '13px' },
  }[size];

  const label = showFullLabel ? level : config.shortLabel;

  return (
    <span
      className="inline-flex items-center font-semibold rounded-full whitespace-nowrap"
      style={{
        fontSize: sizeStyles.fontSize,
        padding: sizeStyles.padding,
        gap: sizeStyles.gap,
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <span style={{ fontSize: sizeStyles.iconSize }}>{config.icon}</span>
      {label}
      {showPoints && points !== undefined && (
        <span style={{ opacity: 0.7 }}>· {points}pts</span>
      )}
    </span>
  );
}

interface ReputationProfileCardProps {
  stats: CommunityUserStats;
  language?: string;
}

export function ReputationProfileCard({ stats, language }: ReputationProfileCardProps) {
  const isRTL = language === 'ar';
  const config = LEVEL_CONFIG[stats.reputation_level as ReputationLevel] || LEVEL_CONFIG['Beginner Writer'];

  const nextLevel = getNextLevel(stats.reputation_level as ReputationLevel);
  const progressPct = nextLevel ? Math.min(100, (stats.points / nextLevel.threshold) * 100) : 100;

  const STAT_LABELS = {
    points:         isRTL ? 'نقاط' : 'Points',
    topics_created: isRTL ? 'مواضيع' : 'Topics',
    replies_count:  isRTL ? 'ردود' : 'Replies',
    badges_count:   isRTL ? 'شارات' : 'Badges',
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}` }}
    >
      <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span style={{ fontSize: 20, color: config.color }}>{config.icon}</span>
          <div className={isRTL ? 'text-right' : ''}>
            <p className="text-xs font-bold" style={{ color: config.color }}>{stats.reputation_level}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {stats.points} {isRTL ? 'نقطة' : 'pts'}
            </p>
          </div>
        </div>
        {nextLevel && (
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? `${nextLevel.threshold - stats.points} نقطة للمستوى التالي` : `${nextLevel.threshold - stats.points}pts to ${nextLevel.label}`}
          </p>
        )}
      </div>

      {nextLevel && (
        <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: config.color }}
          />
        </div>
      )}

      <div className={`grid grid-cols-4 gap-2 ${isRTL ? 'direction-rtl' : ''}`}>
        {(Object.entries(STAT_LABELS) as [keyof typeof STAT_LABELS, string][]).map(([key, label]) => (
          <div key={key} className="text-center">
            <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {stats[key]}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getNextLevel(level: ReputationLevel): { label: ReputationLevel; threshold: number } | null {
  const thresholds: { level: ReputationLevel; threshold: number }[] = [
    { level: 'Emerging Writer', threshold: 20 },
    { level: 'Active Contributor', threshold: 50 },
    { level: 'Community Pillar', threshold: 100 },
    { level: 'Master Storyteller', threshold: 200 },
  ];

  const idx = thresholds.findIndex((t) => t.level === level);
  if (idx === -1) {
    const first = thresholds[0];
    return { label: first.level, threshold: first.threshold };
  }
  const next = thresholds[idx + 1];
  if (!next) return null;
  return { label: next.level, threshold: next.threshold };
}

export function getLevelConfig(level: ReputationLevel) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG['Beginner Writer'];
}
