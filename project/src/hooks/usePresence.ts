import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  sceneId?: string;
  isEditing?: boolean;
  joinedAt: number;
}

export interface EditLock {
  sceneId: string;
  userId: string;
  displayName: string;
  color: string;
  lockedAt: number;
}

const USER_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#c2410c', '#15803d', '#1d4ed8', '#b45309',
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

const EDIT_LOCK_TIMEOUT_MS = 8000;
const PRESENCE_HEARTBEAT_MS = 4000;

export function usePresence(
  projectId: string | undefined,
  userId: string | undefined,
  displayName: string,
  currentSceneId?: string
) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [editLocks, setEditLocks] = useState<EditLock[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const myColor = userId ? getColorForUser(userId) : USER_COLORS[0];

  const broadcast = useCallback((sceneId?: string, isEditing = false) => {
    if (!channelRef.current || !userId) return;
    channelRef.current.track({
      userId,
      displayName,
      color: myColor,
      sceneId,
      isEditing,
      joinedAt: Date.now(),
    });
  }, [userId, displayName, myColor]);

  useEffect(() => {
    if (!projectId || !userId) return;

    const channelName = `presence:project:${projectId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        const locks: EditLock[] = [];

        Object.values(state).forEach((presences) => {
          const presence = (presences as PresenceUser[])[0];
          if (!presence || presence.userId === userId) return;
          users.push(presence);
          if (presence.isEditing && presence.sceneId) {
            locks.push({
              sceneId: presence.sceneId,
              userId: presence.userId,
              displayName: presence.displayName,
              color: presence.color,
              lockedAt: presence.joinedAt,
            });
          }
        });

        setActiveUsers(users);
        setEditLocks(locks);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const p = (newPresences as unknown as PresenceUser[])[0];
        if (!p || p.userId === userId) return;
        setActiveUsers(prev => {
          const filtered = prev.filter(u => u.userId !== p.userId);
          return [...filtered, p];
        });
        if (p.isEditing && p.sceneId) {
          setEditLocks(prev => {
            const filtered = prev.filter(l => l.userId !== p.userId);
            return [...filtered, { sceneId: p.sceneId!, userId: p.userId, displayName: p.displayName, color: p.color, lockedAt: p.joinedAt }];
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const p = (leftPresences as unknown as PresenceUser[])[0];
        if (!p || p.userId === userId) return;
        setActiveUsers(prev => prev.filter(u => u.userId !== p.userId));
        setEditLocks(prev => prev.filter(l => l.userId !== p.userId));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            displayName,
            color: myColor,
            sceneId: currentSceneId,
            isEditing: false,
            joinedAt: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    heartbeatRef.current = setInterval(() => {
      broadcast(currentSceneId, false);
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      clearInterval(heartbeatRef.current);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [projectId, userId]);

  const setEditing = useCallback((sceneId: string, isEditing: boolean) => {
    broadcast(sceneId, isEditing);
  }, [broadcast]);

  const isSceneLocked = useCallback((sceneId: string): EditLock | null => {
    const now = Date.now();
    const lock = editLocks.find(l => l.sceneId === sceneId && now - l.lockedAt < EDIT_LOCK_TIMEOUT_MS);
    return lock || null;
  }, [editLocks]);

  return { activeUsers, editLocks, setEditing, isSceneLocked, myColor };
}
