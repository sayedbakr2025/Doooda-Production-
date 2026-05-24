import { useState } from 'react';
import { Star, Trash2, ThumbsUp } from 'lucide-react';
import type { IdeaCard } from '../../types';

interface IdeaCardProps {
  card: IdeaCard;
  isRTL: boolean;
  voteCount?: number;
  totalVotes?: number;
  userVoted?: boolean;
  pollOpen?: boolean;
  onUpdate: (updates: Partial<IdeaCard>) => void;
  onDelete: () => void;
  onFinalize: () => void;
  onUnfinalize: () => void;
  onVote?: () => void;
  canFinalize?: boolean;
}

export default function IdeaCardComponent({
  card,
  isRTL,
  voteCount = 0,
  totalVotes = 0,
  userVoted = false,
  pollOpen = false,
  onUpdate,
  onDelete,
  onFinalize,
  onUnfinalize,
  onVote,
  canFinalize = true,
}: IdeaCardProps) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);

  const votePercentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

  const statusStyles: Record<string, React.CSSProperties> = {
    active: { borderColor: 'var(--color-border)', opacity: 1 },
    finalized: { borderColor: '#22c55e', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)', opacity: 1 },
    dimmed: { borderColor: 'var(--color-border)', opacity: 0.45 },
  };

  const style = statusStyles[card.status] || statusStyles.active;

  const handleTitleBlur = () => {
    setEditing(false);
    if (titleValue !== card.title) {
      onUpdate({ title: titleValue });
    }
  };

  return (
    <div
      className="flex-shrink-0 rounded-lg p-3 transition-opacity"
      style={{
        width: '180px',
        minWidth: '180px',
        backgroundColor: card.status === 'finalized' ? 'rgba(34, 197, 94, 0.04)' : 'var(--color-bg-primary)',
        border: `2px solid ${style.borderColor}`,
        boxShadow: card.status === 'finalized' ? '0 0 12px rgba(34, 197, 94, 0.3)' : 'none',
        opacity: style.opacity,
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        {card.status === 'finalized' && (
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
        )}
        {editing ? (
          <input
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleTitleBlur(); if (e.key === 'Escape') { setTitleValue(card.title); setEditing(false); } }}
            className="flex-1 text-sm font-medium px-1 rounded"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)', color: 'var(--color-text-primary)' }}
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium truncate cursor-pointer"
            style={{ color: 'var(--color-text-primary)' }}
            onDoubleClick={() => { setEditing(true); setTitleValue(card.title); }}
            title={card.title}
          >
            {card.title}
          </span>
        )}
      </div>

      {card.summary && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {card.summary}
        </p>
      )}

      {/* Vote bar */}
      {(voteCount > 0 || userVoted) && (
        <div className="mt-2">
          <div className="flex items-center gap-1 mb-1">
            <ThumbsUp className="w-3 h-3" style={{ color: userVoted ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {voteCount}/{totalVotes}
            </span>
            {votePercentage > 0 && (
              <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                {votePercentage}%
              </span>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${votePercentage}%`, backgroundColor: 'var(--color-accent)', minWidth: voteCount > 0 ? '4px' : '0' }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        {canFinalize && card.status === 'active' ? (
          <>
            {pollOpen && onVote && (
              <button
                onClick={onVote}
                className="text-xs px-2 py-0.5 rounded font-medium hover:opacity-80 flex items-center gap-1"
                style={{
                  backgroundColor: userVoted ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                  color: userVoted ? '#3b82f6' : '#6b7280',
                }}
                title={userVoted ? (isRTL ? 'تغيير التصويت' : 'Change vote') : (isRTL ? 'تصويت' : 'Vote')}
              >
                <ThumbsUp className="w-3 h-3" />
                {userVoted ? (isRTL ? 'تم التصويت' : 'Voted') : (isRTL ? 'صوّت' : 'Vote')}
              </button>
            )}
            <button
              onClick={onFinalize}
              className="text-xs px-2 py-0.5 rounded font-medium hover:opacity-80"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
              title={isRTL ? 'اعتماد الفكرة' : 'Finalize'}
            >
              {isRTL ? 'اعتماد' : 'Finalize'}
            </button>
          </>
        ) : canFinalize && card.status === 'finalized' ? (
          <button
            onClick={onUnfinalize}
            className="text-xs px-2 py-0.5 rounded font-medium hover:opacity-80"
            style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}
            title={isRTL ? 'إلغاء الاعتماد' : 'Unfinalize'}
          >
            {isRTL ? 'إلغاء' : 'Unfinalize'}
          </button>
        ) : null}
        <button
          onClick={onDelete}
          className="ml-auto p-1 rounded hover:opacity-70"
          style={{ color: 'var(--color-text-tertiary)' }}
          title={isRTL ? 'حذف' : 'Delete'}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}