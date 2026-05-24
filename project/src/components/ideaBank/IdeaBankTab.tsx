import { useState, useEffect, useCallback } from 'react';
import { Plus, Lightbulb, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ProjectType, IdeaBank, IdeaSlot, IdeaCard, IdeaPoll } from '../../types';
import { getHierarchyLevels, getMaxLevel } from '../../utils/hierarchyConfig';
import { useLiteraryTypeConfig } from '../../hooks/useLiteraryTypeConfig';
import {
  getOrCreateIdeaBank,
  getIdeaSlots,
  createIdeaSlot,
  deleteIdeaSlot,
  getIdeaCards,
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
} from '../../services/api';
import IdeaSlotComponent from './IdeaSlot';

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

  useEffect(() => {
    loadIdeaBank();
  }, [projectId]);

  const loadIdeaBank = useCallback(async () => {
    setLoading(true);
    try {
      const bank = await getOrCreateIdeaBank(projectId);
      setIdeaBank(bank);
      const slotsData = await getIdeaSlots(bank.id);
      setSlots(slotsData);
      const cardsMap: Record<string, IdeaCard[]> = {};
      const pollsMap: Record<string, IdeaPoll> = {};
      const voteCountsMap: Record<string, { count: number; total: number }> = {};
      const userVotesMap: Record<string, boolean> = {};

      await Promise.all(
        slotsData.map(async (slot) => {
          const cards = await getIdeaCards(slot.id);
          cardsMap[slot.id] = cards;

          const poll = await getPollForSlot(slot.id);
          if (poll) {
            pollsMap[slot.id] = poll;
            const results = await getPollResults(poll.id);
            const totalVotes = Object.values(results).reduce((sum, c) => sum + c, 0);
            for (const card of cards) {
              voteCountsMap[card.id] = { count: results[card.id] || 0, total: totalVotes };
            }
            const userVoteId = await getUserVote(poll.id);
            for (const card of cards) {
              userVotesMap[card.id] = card.id === userVoteId;
            }
          }
        })
      );

      setCardsBySlot(cardsMap);
      setPollsBySlot(pollsMap);
      setVoteCountsByCard(voteCountsMap);
      setUserVotesByCard(userVotesMap);
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

  const handleAddSlot = async (parentSlotId?: string, level?: number) => {
    if (!ideaBank) return;
    const slotLevel = level ?? 1;
    const siblingSlots = slots.filter(s =>
      slotLevel === 1 ? !s.parentSlotId : s.parentSlotId === parentSlotId
    );
    const position = siblingSlots.length > 0 ? Math.max(...siblingSlots.map(s => s.position)) + 1 : 0;
    const newSlot = await createIdeaSlot(ideaBank.id, {
      title: undefined,
      parentSlotId,
      level: slotLevel,
      position,
    });
    setSlots(prev => [...prev, newSlot]);
    setCardsBySlot(prev => ({ ...prev, [newSlot.id]: [] }));
  };

  const handleAddIdea = async (slotId: string) => {
    const existingCards = cardsBySlot[slotId] || [];
    const position = existingCards.length > 0 ? Math.max(...existingCards.map(c => c.position)) + 1 : 0;
    const newCard = await createIdeaCard(slotId, {
      title: isRTL ? 'فكرة جديدة' : 'New Idea',
      position,
    });
    setCardsBySlot(prev => ({ ...prev, [slotId]: [...(prev[slotId] || []), newCard] }));
  };

  const handleDeleteSlot = async (slotId: string) => {
    await deleteIdeaSlot(slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    setCardsBySlot(prev => { const next = { ...prev }; delete next[slotId]; return next; });
  };

  const handleUpdateSlot = async (slotId: string, updates: Partial<IdeaSlot>) => {
    const updated = await updateIdeaSlot(slotId, updates);
    setSlots(prev => prev.map(s => s.id === slotId ? updated : s));
  };

  const handleUpdateCard = async (cardId: string, slotId: string, updates: Partial<IdeaCard>) => {
    const updated = await updateIdeaCard(cardId, updates);
    setCardsBySlot(prev => ({
      ...prev,
      [slotId]: (prev[slotId] || []).map(c => c.id === cardId ? updated : c),
    }));
  };

  const handleDeleteCard = async (cardId: string, slotId: string) => {
    await deleteIdeaCard(cardId);
    setCardsBySlot(prev => ({
      ...prev,
      [slotId]: (prev[slotId] || []).filter(c => c.id !== cardId),
    }));
  };

  const handleFinalizeCard = async (cardId: string, slotId: string) => {
    await finalizeIdeaCard(cardId);
    const freshCards = await getIdeaCards(slotId);
    setCardsBySlot(prev => ({ ...prev, [slotId]: freshCards }));
  };

  const handleUnfinalizeCard = async (cardId: string, slotId: string) => {
    await unfinalizeIdeaCard(cardId);
    const freshCards = await getIdeaCards(slotId);
    setCardsBySlot(prev => ({ ...prev, [slotId]: freshCards }));
  };

  const handleCreatePoll = async (slotId: string) => {
    const poll = await createPoll(slotId);
    setPollsBySlot(prev => ({ ...prev, [slotId]: poll }));
  };

  const handleClosePoll = async (pollId: string) => {
    const updated = await closePoll(pollId);
    const slotId = updated.slotId;
    setPollsBySlot(prev => ({ ...prev, [slotId]: updated }));
  };

  const handleReopenPoll = async (pollId: string) => {
    const updated = await reopenPoll(pollId);
    const slotId = updated.slotId;
    setPollsBySlot(prev => ({ ...prev, [slotId]: updated }));
  };

  const handleDeletePoll = async (pollId: string) => {
    const poll = Object.values(pollsBySlot).find(p => p.id === pollId);
    if (!poll) return;
    await deletePollApi(pollId);
    const slotId = poll.slotId;
    setPollsBySlot(prev => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    const cards = cardsBySlot[slotId] || [];
    const clearedCounts: Record<string, { count: number; total: number }> = {};
    const clearedVotes: Record<string, boolean> = {};
    for (const card of cards) {
      clearedCounts[card.id] = { count: 0, total: 0 };
      clearedVotes[card.id] = false;
    }
    setVoteCountsByCard(prev => ({ ...prev, ...clearedCounts }));
    setUserVotesByCard(prev => ({ ...prev, ...clearedVotes }));
  };

  const handleVote = async (pollId: string, ideaCardId: string) => {
    await voteOnIdea(pollId, ideaCardId);
    const slotId = Object.entries(pollsBySlot).find(([, p]) => p.id === pollId)?.[0];
    if (slotId) {
      await refreshVoteData(slotId);
    }
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
          <button
            onClick={() => handleAddSlot(undefined, 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            {isRTL ? `إضافة ${level1?.singularAr || ''}` : `Add ${level1?.singular || 'Section'}`}
          </button>
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
                    isOwner={true}
                    onAddChildSlot={(parentId) => handleAddSlot(parentId, 2)}
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
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}