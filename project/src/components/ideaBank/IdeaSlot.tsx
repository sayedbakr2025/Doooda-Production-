import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import type { IdeaSlot, IdeaCard, HierarchyLevel, IdeaPoll } from '../../types';
import IdeaCardComponent from './IdeaCard';
import IdeaPollComponent from './IdeaPoll';

interface IdeaSlotProps {
  slot: IdeaSlot;
  cards: IdeaCard[];
  childSlots: IdeaSlot[];
  childCardsBySlot: Record<string, IdeaCard[]>;
  pollsBySlot: Record<string, IdeaPoll>;
  voteCountsByCard: Record<string, { count: number; total: number }>;
  commentCountsByCard: Record<string, number>;
  userVotesByCard: Record<string, boolean>;
  votersByCard: Record<string, string[]>;
  levels: HierarchyLevel[];
  maxLevel: number;
  isRTL: boolean;
  isOwner: boolean;
  canEdit: boolean;
  canVote: boolean;
  canFinalize: boolean;
  canManagePolls: boolean;
  bankId: string;
  onAddChildSlot: (parentId: string) => void;
  onAddIdea: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateSlot: (slotId: string, updates: Partial<IdeaSlot>) => void;
  onUpdateCard: (cardId: string, slotId: string, updates: Partial<IdeaCard>) => void;
  onDeleteCard: (cardId: string, slotId: string) => void;
  onFinalizeCard: (cardId: string, slotId: string) => void;
  onUnfinalizeCard: (cardId: string, slotId: string) => void;
  onCreatePoll: (slotId: string) => void;
  onClosePoll: (pollId: string) => void;
  onReopenPoll: (pollId: string) => void;
  onDeletePoll: (pollId: string) => void;
  onVote: (pollId: string, ideaCardId: string) => void;
  onReorderCards?: (slotId: string, cardIds: string[]) => void;
}

export default function IdeaSlotComponent({
  slot,
  cards,
  childSlots,
  childCardsBySlot,
  pollsBySlot,
  voteCountsByCard,
  commentCountsByCard,
  userVotesByCard,
  votersByCard,
  levels,
  maxLevel,
  isRTL,
  isOwner,
  canEdit,
  canVote,
  canFinalize,
  canManagePolls,
  bankId,
  onAddChildSlot,
  onAddIdea,
  onDeleteSlot,
  onUpdateSlot,
  onUpdateCard,
  onDeleteCard,
  onFinalizeCard,
  onUnfinalizeCard,
  onCreatePoll,
  onClosePoll,
  onReopenPoll,
  onDeletePoll,
  onVote,
  onReorderCards,
}: IdeaSlotProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(slot.title || '');
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const levelInfo = levels.find(l => l.level === slot.level);
  const label = isRTL ? levelInfo?.singularAr : levelInfo?.singular;
  const hasChildren = maxLevel > 1 && slot.level === 1;
  const hasFinalized = cards.some(c => c.status === 'finalized');
  const hasNoIdeas = cards.filter(c => c.status !== 'archived').length === 0;
  const poll = pollsBySlot[slot.id];

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue !== (slot.title || '')) {
      onUpdateSlot(slot.id, { title: titleValue || null });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleBlur();
    if (e.key === 'Escape') {
      setTitleValue(slot.title || '');
      setEditingTitle(false);
    }
  };

  const borderColor = slot.level === 1
    ? 'var(--color-accent)'
    : 'var(--color-border)';

  return (
    <div
      className="rounded-xl"
      style={{
        border: `2px solid ${borderColor}`,
        backgroundColor: 'var(--color-bg-secondary)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        style={{ backgroundColor: hasFinalized ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren && (
          expanded ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
            : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
        )}
        <span className="text-xs font-medium px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
          {label || `L${slot.level}`}
        </span>
        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 px-2 py-0.5 rounded text-sm"
            style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-accent)', color: 'var(--color-text-primary)' }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium truncate"
            style={{ color: slot.title ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true); setTitleValue(slot.title || ''); }}
          >
            {slot.title || (isRTL ? `${label || ''} بدون عنوان` : `Untitled ${label || ''}`)}
          </span>
        )}
        {hasFinalized && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#22c55e' }} />}
        {!hasFinalized && !hasNoIdeas && <span title={isRTL ? 'لا توجد فكرة معتمدة' : 'No finalized idea'}><AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} /></span>}
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {cards.filter(c => c.status !== 'archived').length} {isRTL ? 'فكرة' : 'ideas'}
        </span>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot.id); }}
            className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--color-text-tertiary)' }}
          title={isRTL ? 'حذف' : 'Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          {/* Poll controls */}
          <div className="mb-2">
            <IdeaPollComponent
              poll={poll}
              isRTL={isRTL}
              isOwner={isOwner}
              onCreatePoll={() => onCreatePoll(slot.id)}
              onClosePoll={() => poll && onClosePoll(poll.id)}
              onReopenPoll={() => poll && onReopenPoll(poll.id)}
              onDeletePoll={() => poll && onDeletePoll(poll.id)}
            />
          </div>

          {/* Competing Ideas (horizontal) */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {cards
              .filter(c => c.status !== 'archived')
              .sort((a, b) => a.position - b.position)
              .map((card, index) => {
                const voteData = voteCountsByCard[card.id] || { count: 0, total: 0 };
                return (
                  <IdeaCardComponent
                    key={card.id}
                    card={card}
                    isRTL={isRTL}
                    bankId={bankId}
                    canEdit={canEdit}
                    draggable={onReorderCards !== undefined}
                    voteCount={voteData.count}
                    totalVotes={voteData.total}
                    userVoted={userVotesByCard[card.id] || false}
                    voters={votersByCard[card.id] || []}
                    commentCount={commentCountsByCard[card.id] || 0}
                    pollOpen={poll?.isOpen || false}
                    onUpdate={(updates) => onUpdateCard(card.id, slot.id, updates)}
                    onDelete={() => onDeleteCard(card.id, slot.id)}
                    onFinalize={() => onFinalizeCard(card.id, slot.id)}
                    onUnfinalize={() => onUnfinalizeCard(card.id, slot.id)}
                    onVote={poll ? () => onVote(poll.id, card.id) : undefined}
                    canFinalize={canFinalize}
                    onDragStart={() => { setDraggedCardIndex(index); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnd={() => {
                      if (draggedCardIndex !== null && draggedCardIndex !== index && onReorderCards) {
                        const sorted = cards.filter(c => c.status !== 'archived').sort((a, b) => a.position - b.position);
                        const reordered = [...sorted];
                        const [moved] = reordered.splice(draggedCardIndex, 1);
                        reordered.splice(index, 0, moved);
                        onReorderCards(slot.id, reordered.map(c => c.id));
                      }
                      setDraggedCardIndex(null);
                    }}
                  />
                );
              })}
            {canEdit && (
              <button
              onClick={() => onAddIdea(slot.id)}
              className="flex-shrink-0 flex items-center justify-center gap-1 px-4 py-3 rounded-lg text-sm border-2 border-dashed hover:opacity-80"
              style={{
                minWidth: '140px',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              <Plus className="w-4 h-4" />
              {cards.filter(c => c.status !== 'archived').length === 0
                ? (isRTL ? `إضافة فكرة ${label || ''}` : `Add ${label || ''} Idea`)
                : (isRTL ? 'فكرة بديلة' : 'Alternative')}
            </button>
            )}
          </div>

          {/* Child Slots (nested) */}
          {hasChildren && childSlots.length > 0 && (
            <div
              className="mt-2 space-y-2"
              style={{
                paddingLeft: isRTL ? 0 : '24px',
                paddingRight: isRTL ? '24px' : 0,
                borderLeft: isRTL ? 'none' : '2px solid var(--color-border)',
                borderRight: isRTL ? '2px solid var(--color-border)' : 'none',
              }}
            >
              {childSlots
                .sort((a, b) => a.position - b.position)
                .map(child => {
                  const childCards = childCardsBySlot[child.id] || [];
                  const grandChildSlots: IdeaSlot[] = [];
                  return (
                    <IdeaSlotComponent
                      key={child.id}
                      slot={child}
                      cards={childCards}
                      childSlots={grandChildSlots}
                      childCardsBySlot={childCardsBySlot}
                      pollsBySlot={pollsBySlot}
                      voteCountsByCard={voteCountsByCard}
                      commentCountsByCard={commentCountsByCard}
                      userVotesByCard={userVotesByCard}
                      votersByCard={votersByCard}
                      levels={levels}
                      maxLevel={maxLevel}
                      isRTL={isRTL}
                      isOwner={isOwner}
                      canEdit={canEdit}
                      canVote={canVote}
                      canFinalize={canFinalize}
                      canManagePolls={canManagePolls}
                      bankId={bankId}
                      onAddChildSlot={() => {}}
                      onAddIdea={onAddIdea}
                      onDeleteSlot={onDeleteSlot}
                      onUpdateSlot={onUpdateSlot}
                      onUpdateCard={onUpdateCard}
                      onDeleteCard={onDeleteCard}
                      onFinalizeCard={onFinalizeCard}
                      onUnfinalizeCard={onUnfinalizeCard}
                      onCreatePoll={onCreatePoll}
                      onClosePoll={onClosePoll}
                      onReopenPoll={onReopenPoll}
                      onDeletePoll={onDeletePoll}
                      onVote={onVote}
                    />
                  );
                })}
            </div>
          )}

          {/* Add Child Slot */}
          {hasChildren && canEdit && (
            <button
              onClick={() => onAddChildSlot(slot.id)}
              className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-tertiary)',
                border: '1px dashed var(--color-border)',
                marginLeft: isRTL ? 0 : '24px',
                marginRight: isRTL ? '24px' : 0,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              {isRTL
                ? `إضافة ${levels.find(l => l.level === 2)?.singularAr || ''}`
                : `Add ${levels.find(l => l.level === 2)?.singular || ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}