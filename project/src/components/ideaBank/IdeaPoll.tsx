import { useState } from 'react';
import { BarChart3, X, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import type { IdeaPoll } from '../../types';

interface IdeaPollProps {
  poll: IdeaPoll | null;
  isRTL: boolean;
  isOwner: boolean;
  onCreatePoll: () => void;
  onClosePoll: () => void;
  onReopenPoll: () => void;
  onDeletePoll: () => void;
}

export default function IdeaPollComponent({
  poll,
  isRTL,
  isOwner,
  onCreatePoll,
  onClosePoll,
  onReopenPoll,
  onDeletePoll,
}: IdeaPollProps) {
  const [expanded, setExpanded] = useState(false);

  if (!poll) {
    if (!isOwner) return null;
    return (
      <button
        onClick={onCreatePoll}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        {isRTL ? 'بدء تصويت' : 'Start Poll'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
        style={{
          backgroundColor: poll.isOpen ? 'rgba(34, 197, 94, 0.08)' : 'rgba(156, 163, 175, 0.08)',
          color: poll.isOpen ? '#22c55e' : '#9ca3af',
        }}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        {poll.isOpen
          ? (isRTL ? 'التصويت مفتوح' : 'Poll Open')
          : (isRTL ? 'التصويت مغلق' : 'Poll Closed')}
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {expanded && isOwner && (
        <div className="flex items-center gap-1">
          {poll.isOpen ? (
            <button
              onClick={onClosePoll}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80"
              style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', color: '#eab308' }}
            >
              <X className="w-3 h-3" />
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          ) : (
            <button
              onClick={onReopenPoll}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', color: '#22c55e' }}
            >
              <RotateCcw className="w-3 h-3" />
              {isRTL ? 'إعادة فتح' : 'Reopen'}
            </button>
          )}
          <button
            onClick={onDeletePoll}
            className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--color-text-tertiary)' }}
            title={isRTL ? 'حذف التصويت' : 'Delete poll'}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}