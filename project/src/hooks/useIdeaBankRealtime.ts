import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/api';
import type { IdeaCard, IdeaPoll } from '../types';

interface RealtimeCallbacks {
  onCardChange: (card: IdeaCard) => void;
  onCardDelete: (cardId: string) => void;
  onVoteChange: (pollId: string) => void;
  onPollChange: (poll: IdeaPoll) => void;
  onPollDelete: (slotId: string) => void;
}

export function useIdeaBankRealtime(bankId: string | undefined, callbacks: RealtimeCallbacks) {
  const channelRef = useRef<any>(null);
  const callbacksRef = useRef(callbacks);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectDelay = 10000;

  callbacksRef.current = callbacks;

  const subscribe = useCallback(() => {
    if (!bankId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), maxReconnectDelay);

    const timeout = setTimeout(() => {
      reconnectAttemptRef.current = 0;

      channelRef.current = supabase
        .channel(`idea-bank:${bankId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'idea_cards',
            filter: undefined,
          },
          (payload: any) => {
            if (payload.eventType === 'DELETE') {
              callbacksRef.current.onCardDelete(payload.old?.id);
            } else if (payload.new) {
              const card = mapCardRow(payload.new);
              if (card) callbacksRef.current.onCardChange(card);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'idea_votes',
          },
          (payload: any) => {
            if (payload.new?.poll_id) {
              callbacksRef.current.onVoteChange(payload.new.poll_id);
            } else if (payload.old?.poll_id) {
              callbacksRef.current.onVoteChange(payload.old.poll_id);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'idea_polls',
          },
          (payload: any) => {
            if (payload.eventType === 'DELETE') {
              callbacksRef.current.onPollDelete(payload.old?.slot_id);
            } else if (payload.new) {
              const poll = mapPollRow(payload.new);
              if (poll) callbacksRef.current.onPollChange(poll);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'idea_slots',
            filter: `idea_bank_id=eq.${bankId}`,
          },
          () => {
            // Slot changes require a full reload since structure changed
            // The parent component handles this via a refresh trigger
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttemptRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reconnectAttemptRef.current++;
          }
        });
    }, reconnectAttemptRef.current === 0 ? 0 : delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [bankId]);

  useEffect(() => {
    const cleanup = subscribe();
    return () => {
      cleanup?.();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);

  return { reconnect: subscribe };
}

function mapCardRow(row: any): IdeaCard | null {
  if (!row) return null;
  return {
    id: row.id,
    slotId: row.slot_id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    status: row.status,
    position: row.position,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapPollRow(row: any): IdeaPoll | null {
  if (!row) return null;
  return {
    id: row.id,
    slotId: row.slot_id,
    createdBy: row.created_by,
    isOpen: row.is_open,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}