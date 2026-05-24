import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Star, CheckCircle } from 'lucide-react';
import type { IdeaSlot, IdeaCard, HierarchyLevel } from '../../types';

interface IdeaSlotProps {
  slot: IdeaSlot;
  cards: IdeaCard[];
  childSlots: IdeaSlot[];
  childCardsBySlot: Record<string, IdeaCard[]>;
  levels: HierarchyLevel[];
  maxLevel: number;
  isRTL: boolean;
  onAddChildSlot: (parentId: string) => void;
  onAddIdea: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateSlot: (slotId: string, updates: Partial<IdeaSlot>) => void;
  onUpdateCard: (cardId: string, slotId: string, updates: Partial<IdeaCard>) => void;
  onDeleteCard: (cardId: string, slotId: string) => void;
  onFinalizeCard: (cardId: string, slotId: string) => void;
  onUnfinalizeCard: (cardId: string, slotId: string) => void;
}

export default function IdeaSlotComponent({
  slot,
  cards,
  childSlots,
  childCardsBySlot,
  levels,
  maxLevel,
  isRTL,
  onAddChildSlot,
  onAddIdea,
  onDeleteSlot,
  onUpdateSlot,
  onUpdateCard,
  onDeleteCard,
  onFinalizeCard,
  onUnfinalizeCard,
}: IdeaSlotProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(slot.title || '');
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

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue !== (slot.title || '')) {
      onUpdateSlot(slot.id, { title: titleValue || null });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
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
      {/* Slot Header */}
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
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {cards.length} {cards.length === 1 ? (isRTL ? 'فكرة' : 'idea') : (isRTL ? 'أفكار' : 'ideas')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot.id); }}
          className="p-1 rounded hover:opacity-70"
          style={{ color: 'var(--color-text-tertiary)' }}
          title={isRTL ? 'حذف' : 'Delete'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          {/* Competing Ideas (horizontal) */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {cards
              .filter(c => c.status !== 'archived')
              .sort((a, b) => a.position - b.position)
              .map(card => (
                <IdeaCardComponent
                  key={card.id}
                  card={card}
                  isRTL={isRTL}
                  onUpdate={(updates) => onUpdateCard(card.id, slot.id, updates)}
                  onDelete={() => onDeleteCard(card.id, slot.id)}
                  onFinalize={() => onFinalizeCard(card.id, slot.id)}
                  onUnfinalize={() => onUnfinalizeCard(card.id, slot.id)}
                />
              ))}
            {/* Add Idea Button */}
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
              {isRTL ? 'فكرة بديلة' : 'Alternative'}
            </button>
          </div>

          {/* Child Slots (nested) */}
          {hasChildren && childSlots.length > 0 && (
            <div className="mt-2 space-y-2">
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
                      levels={levels}
                      maxLevel={maxLevel}
                      isRTL={isRTL}
                      onAddChildSlot={() => {}}
                      onAddIdea={onAddIdea}
                      onDeleteSlot={onDeleteSlot}
                      onUpdateSlot={onUpdateSlot}
                      onUpdateCard={onUpdateCard}
                      onDeleteCard={onDeleteCard}
                      onFinalizeCard={onFinalizeCard}
                      onUnfinalizeCard={onUnfinalizeCard}
                    />
                  );
                })}
            </div>
          )}

          {/* Add Child Slot */}
          {hasChildren && (
            <button
              onClick={() => onAddChildSlot(slot.id)}
              className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-tertiary)', border: '1px dashed var(--color-border)' }}
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

// ---- Idea Card (inline to keep component count minimal for Phase 2) ----

interface IdeaCardProps {
  card: IdeaCard;
  isRTL: boolean;
  onUpdate: (updates: Partial<IdeaCard>) => void;
  onDelete: () => void;
  onFinalize: () => void;
  onUnfinalize: () => void;
}

function IdeaCardComponent({ card, isRTL, onUpdate, onDelete, onFinalize, onUnfinalize }: IdeaCardProps) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);

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
        ...style,
        width: '180px',
        minWidth: '180px',
        backgroundColor: 'var(--color-bg-primary)',
        border: `2px solid var(--color-border)`,
        boxShadow: card.status === 'finalized' ? '0 0 12px rgba(34, 197, 94, 0.3)' : 'none',
        opacity: style.opacity,
      }}
    >
      {/* Card Header */}
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

      {/* Summary */}
      {card.summary && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {card.summary}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        {card.status === 'active' ? (
          <button
            onClick={onFinalize}
            className="text-xs px-2 py-0.5 rounded font-medium hover:opacity-80"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
            title={isRTL ? 'اعتماد الفكر' : 'Finalize'}
          >
            {isRTL ? 'اعتماد' : 'Finalize'}
          </button>
        ) : card.status === 'finalized' ? (
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