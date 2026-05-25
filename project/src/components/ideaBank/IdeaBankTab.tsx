import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Lightbulb, ZoomIn, ZoomOut, AlertTriangle, Share2, Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ProjectType, IdeaBank, IdeaSlot, IdeaCard, IdeaPoll } from '../../types';
import { getHierarchyLevels, getMaxLevel } from '../../utils/hierarchyConfig';
import { useLiteraryTypeConfig } from '../../hooks/useLiteraryTypeConfig';
import { useIdeaBankPermissions } from '../../hooks/useIdeaBankPermissions';
import { useIdeaBankRealtime } from '../../hooks/useIdeaBankRealtime';
import {
  getOrCreateIdeaBank,
  getIdeaSlots,
  createIdeaSlot,
  deleteIdeaSlot,
  createIdeaCard,
  updateIdeaSlot,
  updateIdeaCard,
  deleteIdeaCard,
  finalizeIdeaCard,
  unfinalizeIdeaCard,
  getPollForSlot,
  getPollResults,
  getUserVote,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll as deletePollApi,
  voteOnIdea,
  reorderIdeaSlots,
  reorderIdeaCards,
  loadIdeaBankBulk,
} from '../../services/api';
import { supabase } from '../../lib/supabaseClient';
import IdeaSlotComponent from './IdeaSlot';
import IdeaBankShareModal from './IdeaBankShareModal';
import IdeaBankImportModal from './IdeaBankImportModal';

interface IdeaBankTabProps {
  projectId: string;
  projectType: ProjectType;
}

export default function IdeaBankTab({ projectId, projectType }: IdeaBankTabProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { config: _literaryConfig, loading: configLoading } = useLiteraryTypeConfig(projectType);
  const [ideaBank, setIdeaBank] = useState<IdeaBank | null>(null);
  const [slots, setSlots] = useState<IdeaSlot[]>([]);
  const [cardsBySlot, setCardsBySlot] = useState<Record<string, IdeaCard[]>>({});
  const [pollsBySlot, setPollsBySlot] = useState<Record<string, IdeaPoll>>({});
  const [voteCountsByCard, setVoteCountsByCard] = useState<Record<string, { count: number; total: number }>>({});
  const [userVotesByCard, setUserVotesByCard] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const { canEdit, canVote, canManageCollaborators, canCreateIdeas, canFinalize, canManagePolls } = useIdeaBankPermissions(ideaBank?.id, projectId);

  useEffect(() => {
    loadIdeaBank();
  }, [projectId]);

  const loadIdeaBank = useCallback(async () => {
    setLoading(true);
    try {
      const bank = await getOrCreateIdeaBank(projectId);
      setIdeaBank(bank);
      const data = await loadIdeaBankBulk(bank.id);
      setSlots(data.slots);
      setCardsBySlot(data.cardsBySlot);
      setPollsBySlot(data.pollsBySlot);
      setVoteCountsByCard(data.voteCountsByCard);
      setUserVotesByCard(data.userVotesByCard);
      slotsLoadedRef.current = true;
    } catch (err) {
      console.error('[IdeaBank] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const levels = getHierarchyLevels(projectType);
  const maxLevel = getMaxLevel(projectType);
  const level1 = levels.find(l => l.level === 1);

  const refreshVoteData = useCallback(async (slotId: string) => {
    const poll = await getPollForSlot(slotId);
    if (poll) {
      setPollsBySlot(prev => ({ ...prev, [slotId]: poll }));
      const results = await getPollResults(poll.id);
      const cards = cardsBySlot[slotId] || [];
      const totalVotes = Object.values(results).reduce((sum, c) => sum + c, 0);
      const newCounts: Record<string, { count: number; total: number }> = {};
      const newVotes: Record<string, boolean> = {};
      const userVoteId = await getUserVote(poll.id);
      for (const card of cards) {
        newCounts[card.id] = { count: results[card.id] || 0, total: totalVotes };
        newVotes[card.id] = card.id === userVoteId;
      }
      setVoteCountsByCard(prev => ({ ...prev, ...newCounts }));
      setUserVotesByCard(prev => ({ ...prev, ...newVotes }));
    }
  }, [cardsBySlot]);

  // Realtime: subscribe to changes after initial load
  const slotsLoadedRef = useRef(false);
  useIdeaBankRealtime(ideaBank?.id, {
    onCardChange: (card: IdeaCard) => {
      setCardsBySlot(prev => {
        const slotCards = prev[card.slotId] || [];
        const exists = slotCards.some(c => c.id === card.id);
        if (exists) {
          return { ...prev, [card.slotId]: slotCards.map(c => c.id === card.id ? card : c) };
        }
        return { ...prev, [card.slotId]: [...slotCards, card] };
      });
    },
    onCardDelete: (cardId: string) => {
      setCardsBySlot(prev => {
        for (const slotId of Object.keys(prev)) {
          const slotCards = prev[slotId];
          if (slotCards.some(c => c.id === cardId)) {
            return { ...prev, [slotId]: slotCards.filter(c => c.id !== cardId) };
          }
        }
        return prev;
      });
    },
    onVoteChange: (pollId: string) => {
      const slotEntry = Object.entries(pollsBySlot).find(([, p]) => p.id === pollId);
      if (slotEntry) {
        refreshVoteData(slotEntry[0]);
      }
    },
    onPollChange: (poll: IdeaPoll) => {
      setPollsBySlot(prev => ({ ...prev, [poll.slotId]: poll }));
    },
    onPollDelete: (slotId: string) => {
      setPollsBySlot(prev => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
    },
    onCommentChange: (_cardId: string) => {
      // Comment counts are lazy-loaded per card; no full refresh needed
    },
  });

  // Reload slots when slot structure changes (via realtime idea_slots channel)
  useEffect(() => {
    if (!ideaBank || !slotsLoadedRef.current) return;
    const channel = supabase
      .channel(`idea-bank-slots:${ideaBank.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_slots', filter: `idea_bank_id=eq.${ideaBank.id}` }, async () => {
        const freshSlots = await getIdeaSlots(ideaBank.id);
        setSlots(freshSlots);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ideaBank?.id]);

const handleAddSlot = async (parentSlotId?: string, level?: number) => {
    if (!ideaBank) return;
    const slotLevel = level ?? 1;
    const siblingSlots = slots.filter(s =>
      slotLevel === 1 ? !s.parentSlotId : s.parentSlotId === parentSlotId
    );
    const position = siblingSlots.length > 0 ? Math.max(...siblingSlots.map(s => s.position)) + 1 : 0;
    try {
      const newSlot = await createIdeaSlot(ideaBank.id, {
        title: undefined,
        parentSlotId,
        level: slotLevel,
        position,
      });
      setSlots(prev => [...prev, newSlot]);
      setCardsBySlot(prev => ({ ...prev, [newSlot.id]: [] }));
    } catch (err) {
      console.error('[IdeaBank] Failed to add slot:', err);
    }
  };

  const handleAddIdea = async (slotId: string) => {
    const existingCards = cardsBySlot[slotId] || [];
    const position = existingCards.length > 0 ? Math.max(...existingCards.map(c => c.position)) + 1 : 0;
    try {
      const newCard = await createIdeaCard(slotId, {
        title: `Idea ${existingCards.length + 1}`,
        position,
      });
      setCardsBySlot(prev => ({ ...prev, [slotId]: [...(prev[slotId] || []), newCard] }));
    } catch (err) {
      console.error('[IdeaBank] Failed to add idea:', err);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const prev = slots;
    setSlots(s => s.filter(sl => sl.id !== slotId));
    try {
      await deleteIdeaSlot(slotId);
    } catch {
      setSlots(prev);
    }
  };

  const handleUpdateSlot = async (slotId: string, updates: Partial<IdeaSlot>) => {
    const prev = slots;
    setSlots(s => s.map(sl => sl.id === slotId ? { ...sl, ...updates } : sl));
    try {
      await updateIdeaSlot(slotId, updates);
    } catch {
      setSlots(prev);
    }
  };

  const handleUpdateCard = async (cardId: string, slotId: string, updates: Partial<IdeaCard>) => {
    const prev = cardsBySlot;
    setCardsBySlot(p => ({
      ...p,
      [slotId]: (p[slotId] || []).map(c => c.id === cardId ? { ...c, ...updates } : c),
    }));
    try {
      await updateIdeaCard(cardId, updates);
    } catch {
      setCardsBySlot(prev);
    }
  };

  const handleDeleteCard = async (cardId: string, slotId: string) => {
    const prev = cardsBySlot;
    setCardsBySlot(p => ({
      ...p,
      [slotId]: (p[slotId] || []).filter(c => c.id !== cardId),
    }));
    try {
      await deleteIdeaCard(cardId);
    } catch {
      setCardsBySlot(prev);
    }
  };

  const handleFinalizeCard = async (cardId: string, slotId: string) => {
    const prev = cardsBySlot;
    setCardsBySlot(p => ({
      ...p,
      [slotId]: (p[slotId] || []).map(c =>
        c.id === cardId ? { ...c, status: 'finalized' as const } : { ...c, status: 'dimmed' as const }
      ),
    }));
    try {
      await finalizeIdeaCard(cardId);
    } catch {
      setCardsBySlot(prev);
    }
  };

  const handleUnfinalizeCard = async (cardId: string, slotId: string) => {
    const prev = cardsBySlot;
    setCardsBySlot(p => ({
      ...p,
      [slotId]: (p[slotId] || []).map(c =>
        c.id === cardId ? { ...c, status: 'active' as const } : c.status === 'dimmed' ? { ...c, status: 'active' as const } : c
      ),
    }));
    try {
      await unfinalizeIdeaCard(cardId);
    } catch {
      setCardsBySlot(prev);
    }
  };

  const handleCreatePoll = async (slotId: string) => {
    try {
      const poll = await createPoll(slotId);
      setPollsBySlot(prev => ({ ...prev, [slotId]: poll }));
    } catch (err) {
      console.error('[IdeaBank] Failed to create poll:', err);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    const prev = pollsBySlot;
    try {
      const updated = await closePoll(pollId);
      setPollsBySlot(p => ({ ...p, [updated.slotId]: updated }));
    } catch {
      setPollsBySlot(prev);
    }
  };

  const handleReopenPoll = async (pollId: string) => {
    const prev = pollsBySlot;
    try {
      const updated = await reopenPoll(pollId);
      setPollsBySlot(p => ({ ...p, [updated.slotId]: updated }));
    } catch {
      setPollsBySlot(prev);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    const poll = Object.values(pollsBySlot).find(p => p.id === pollId);
    if (!poll) return;
    const prevPolls = pollsBySlot;
    const prevCounts = voteCountsByCard;
    const prevVotes = userVotesByCard;
    const slotId = poll.slotId;
    setPollsBySlot(p => { const n = { ...p }; delete n[slotId]; return n; });
    const cards = cardsBySlot[slotId] || [];
    const clearedCounts: Record<string, { count: number; total: number }> = {};
    const clearedVotes: Record<string, boolean> = {};
    for (const card of cards) {
      clearedCounts[card.id] = { count: 0, total: 0 };
      clearedVotes[card.id] = false;
    }
    setVoteCountsByCard(p => ({ ...p, ...clearedCounts }));
    setUserVotesByCard(p => ({ ...p, ...clearedVotes }));
    try {
      await deletePollApi(pollId);
    } catch {
      setPollsBySlot(prevPolls);
      setVoteCountsByCard(prevCounts);
      setUserVotesByCard(prevVotes);
    }
  };

  const handleVote = async (pollId: string, ideaCardId: string) => {
    const prevCounts = voteCountsByCard;
    const prevVotes = userVotesByCard;
    const slotId = Object.entries(pollsBySlot).find(([, p]) => p.id === pollId)?.[0];
    if (slotId) {
      const cards = cardsBySlot[slotId] || [];
      const oldVoteId = cards.find(c => userVotesByCard[c.id])?.id;
      setVoteCountsByCard(p => {
        const next = { ...p };
        if (oldVoteId && next[oldVoteId]) {
          next[oldVoteId] = { ...next[oldVoteId], count: next[oldVoteId].count - 1 };
        }
        if (next[ideaCardId]) {
          next[ideaCardId] = { ...next[ideaCardId], count: next[ideaCardId].count + 1 };
        }
        return next;
      });
      setUserVotesByCard(p => {
        const next = { ...p };
        if (oldVoteId) next[oldVoteId] = false;
        next[ideaCardId] = true;
        return next;
      });
    }
    try {
      await voteOnIdea(pollId, ideaCardId);
    } catch {
      setVoteCountsByCard(prevCounts);
      setUserVotesByCard(prevVotes);
    }
  };

  const handleReorderCards = async (slotId: string, cardIds: string[]) => {
    const prev = cardsBySlot;
    const slotCards = prev[slotId] || [];
    const idToCard = new Map(slotCards.map(c => [c.id, c]));
    const reordered = cardIds.map((id, i) => ({ ...(idToCard.get(id) || slotCards[i]), position: i }));
    setCardsBySlot(p => ({ ...p, [slotId]: reordered }));
    try {
      await reorderIdeaCards(slotId, cardIds.map((id, index) => ({ id, position: index })));
    } catch {
      setCardsBySlot(prev);
    }
  };

  const handleReorderSlots = async (parentSlotId: string | null, slotIds: string[]) => {
    const prev = slots;
    const idToSlot = new Map(slots.map(s => [s.id, s]));
    const reordered = slotIds.map((id, i) => ({ ...(idToSlot.get(id) || slots[i]), position: i }));
    setSlots(reordered);
    try {
      await reorderIdeaSlots(ideaBank!.id, slotIds.map((id, index) => ({ id, position: index, parentSlotId })));
    } catch {
      setSlots(prev);
    }
  };

  const handleSlotDragStart = (slotId: string) => {
    setDraggedSlotId(slotId);
  };

  const handleSlotDrop = (targetSlotId: string) => {
    if (!draggedSlotId || draggedSlotId === targetSlotId) {
      setDraggedSlotId(null);
      return;
    }
    const currentTopLevel = topLevelSlots.map(s => s.id);
    const fromIndex = currentTopLevel.indexOf(draggedSlotId);
    const toIndex = currentTopLevel.indexOf(targetSlotId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedSlotId(null);
      return;
    }
    const reordered = [...currentTopLevel];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, draggedSlotId);
    handleReorderSlots(null, reordered);
    setDraggedSlotId(null);
  };

  const topLevelSlots = slots.filter(s => !s.parentSlotId);
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.4));

  const hasUnresolved = topLevelSlots.some(slot => {
    const slotCards = cardsBySlot[slot.id] || [];
    const nonArchived = slotCards.filter(c => c.status !== 'archived');
    return nonArchived.length > 0 && !nonArchived.some(c => c.status === 'finalized');
  });

  if (loading || configLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-tertiary)' }}>
        {isRTL ? 'جاري التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'بنك الأفكار' : 'Idea Bank'}
          </h2>
          {hasUnresolved && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <AlertTriangle className="w-3 h-3" />
              {isRTL ? 'أفكار غير معتمدة' : 'Unresolved'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }} title={isRTL ? 'تصغير' : 'Zoom out'}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-tertiary)', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }} title={isRTL ? 'تكبير' : 'Zoom in'}>
            <ZoomIn className="w-4 h-4" />
          </button>
          {canManageCollaborators && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            >
              <Share2 className="w-4 h-4" />
              {isRTL ? 'مشاركة' : 'Share'}
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            <Download className="w-4 h-4" />
            {isRTL ? 'استيراد إلى المخطط' : 'Import to Plot'}
          </button>
          {canCreateIdeas && (
            <button
              onClick={() => handleAddSlot(undefined, 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <Plus className="w-4 h-4" />
              {isRTL ? `إضافة ${level1?.singularAr || ''}` : `Add ${level1?.singular || 'Section'}`}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {topLevelSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-tertiary)' }}>
            <Lightbulb className="w-12 h-12 opacity-30" />
            <p className="text-lg">{isRTL ? 'ابدأ بإضافة أفكارك' : 'Start adding your ideas'}</p>
            <button
              onClick={() => handleAddSlot(undefined, 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <Plus className="w-4 h-4" />
              {isRTL ? `إضافة ${level1?.singularAr || ''} أول` : `Add First ${level1?.singular || 'Section'}`}
            </button>
          </div>
        ) : (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: isRTL ? 'top right' : 'top left', transition: 'transform 0.2s ease' }}>
            <div className="space-y-4">
              {topLevelSlots.map(slot => {
                const childSlots = slots.filter(s => s.parentSlotId === slot.id);
                const slotCards = cardsBySlot[slot.id] || [];
                return (
                  <div
                    key={slot.id}
                    draggable={canEdit}
                    onDragStart={canEdit ? () => handleSlotDragStart(slot.id) : undefined}
                    onDragOver={canEdit ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
                    onDrop={canEdit ? () => handleSlotDrop(slot.id) : undefined}
                    onDragEnd={() => setDraggedSlotId(null)}
                    style={{ opacity: draggedSlotId === slot.id ? 0.5 : 1, transition: 'opacity 0.2s' }}
                  >
                    <IdeaSlotComponent
                    key={slot.id}
                    slot={slot}
                    cards={slotCards}
                    childSlots={childSlots}
                    childCardsBySlot={cardsBySlot}
                    pollsBySlot={pollsBySlot}
                    voteCountsByCard={voteCountsByCard}
                    userVotesByCard={userVotesByCard}
                    levels={levels}
                    maxLevel={maxLevel}
                    isRTL={isRTL}
                    isOwner={canManageCollaborators}
                    canEdit={canEdit}
                    canVote={canVote}
                    canFinalize={canFinalize}
                    canManagePolls={canManagePolls}
                    bankId={ideaBank!.id}
                    onAddChildSlot={(parentId) => {
                    const parent = slots.find(s => s.id === parentId);
                    handleAddSlot(parentId, parent ? parent.level + 1 : 2);
                  }}
                    onAddIdea={handleAddIdea}
                    onDeleteSlot={handleDeleteSlot}
                    onUpdateSlot={handleUpdateSlot}
                    onUpdateCard={handleUpdateCard}
                    onDeleteCard={handleDeleteCard}
                    onFinalizeCard={handleFinalizeCard}
                    onUnfinalizeCard={handleUnfinalizeCard}
                    onCreatePoll={handleCreatePoll}
                    onClosePoll={handleClosePoll}
                    onReopenPoll={handleReopenPoll}
                    onDeletePoll={handleDeletePoll}
                    onVote={handleVote}
                    onReorderCards={handleReorderCards}
                  />
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {ideaBank && (
        <IdeaBankShareModal
          bankId={ideaBank.id}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onRefresh={() => {}}
        />
      )}

      {ideaBank && showImportModal && (
        <IdeaBankImportModal
          bankId={ideaBank.id}
          projectId={projectId}
          onClose={() => setShowImportModal(false)}
          onImported={() => { setShowImportModal(false); }}
        />
      )}
    </div>
  );
}