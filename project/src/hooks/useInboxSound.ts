/**
 * useInboxSound
 *
 * Plays a soft notification chime when new unread inbox messages arrive.
 * Plays ONCE per new-message batch. If AudioContext is already unlocked
 * (user made a prior gesture) it plays immediately. Otherwise it waits for
 * the next user gesture and plays exactly once.
 *
 * Deduplication:
 *   - notifiedIdsRef: tracks IDs already chimed so re-renders/polls don't
 *     re-trigger the sound.
 *   - cooldownRef: enforces a 3-second gap between consecutive plays so rapid
 *     Supabase events can't cause a burst.
 *   - Phase1 returns a resolved promise; Phase2 is armed ONLY when Phase1
 *     cannot confirm playback, preventing the double-play bug.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { Notification } from '../services/api';

// ─── Audio synthesis ───────────────────────────────────────────────────────

function buildAndPlay(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;

  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination);
  o1.type = 'sine';
  o1.frequency.setValueAtTime(880, now);
  o1.frequency.exponentialRampToValueAtTime(820, now + 0.15);
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(volume, now + 0.012);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  o1.start(now); o1.stop(now + 0.22);

  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination);
  o2.type = 'sine';
  o2.frequency.setValueAtTime(1320, now + 0.03);
  g2.gain.setValueAtTime(0, now + 0.03);
  g2.gain.linearRampToValueAtTime(volume * 0.35, now + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
  o2.start(now + 0.03); o2.stop(now + 0.20);

  setTimeout(() => { ctx.close().catch(() => {}); }, 500);
}

/** Returns a promise that resolves to true if sound was actually played. */
async function tryPlayNow(volume: number): Promise<boolean> {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'running') {
      buildAndPlay(ctx, volume);
      return true;
    }
    // Try resume — may succeed if a user gesture already happened this session
    await ctx.resume();
    // After resume, check state via casting to handle TS strict types
    const state = (ctx as any).state as string;
    if (state === 'running') {
      buildAndPlay(ctx, volume);
      return true;
    }
    ctx.close().catch(() => {});
    return false;
  } catch {
    return false;
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useInboxSound() {
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const pendingPlayRef = useRef(false);
  const armedRef       = useRef(false);
  const volumeRef      = useRef(0.07);
  const handlerRef     = useRef<(() => void) | null>(null);
  const cooldownRef    = useRef(false); // prevents burst plays within 3 s

  const disarm = useCallback(() => {
    if (!handlerRef.current) return;
    document.removeEventListener('click',      handlerRef.current, true);
    document.removeEventListener('keydown',    handlerRef.current, true);
    document.removeEventListener('touchstart', handlerRef.current, true);
    handlerRef.current = null;
    armedRef.current = false;
  }, []);

  const arm = useCallback(() => {
    if (armedRef.current) return;
    armedRef.current = true;

    const handler = () => {
      disarm();
      if (pendingPlayRef.current && !cooldownRef.current) {
        pendingPlayRef.current = false;
        cooldownRef.current = true;
        tryPlayNow(volumeRef.current).finally(() => {
          setTimeout(() => { cooldownRef.current = false; }, 3000);
        });
      }
    };

    handlerRef.current = handler;
    document.addEventListener('click',      handler, true);
    document.addEventListener('keydown',    handler, true);
    document.addEventListener('touchstart', handler, true);
  }, [disarm]);

  useEffect(() => () => { disarm(); }, [disarm]);

  /**
   * Call every time the notifications array updates.
   * Safe to call on every rerender / poll / WS event.
   */
  const checkAndPlay = useCallback(async (notifications: Notification[]) => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const newUnread = unread.filter(n => !notifiedIdsRef.current.has(n.id));
    if (newUnread.length === 0) return;

    // Mark all new IDs immediately to prevent re-entry from rapid events
    newUnread.forEach(n => notifiedIdsRef.current.add(n.id));

    // Cooldown guard – skip if a chime played in the last 3 s
    if (cooldownRef.current) return;

    // Slightly quieter on first call (initial page hydration)
    const isFirst = notifiedIdsRef.current.size === newUnread.length;
    volumeRef.current = isFirst ? 0.05 : 0.07;

    pendingPlayRef.current = true;

    // Phase 1: try to play immediately
    const played = await tryPlayNow(volumeRef.current);

    if (played) {
      // Successfully played — start cooldown, do NOT arm gesture listener
      pendingPlayRef.current = false;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 3000);
    } else {
      // Phase 2: arm gesture listener as fallback (only if Phase 1 failed)
      arm();
      // Auto-disarm after 30 s if no gesture happens
      setTimeout(() => {
        pendingPlayRef.current = false;
        disarm();
      }, 30_000);
    }
  }, [arm, disarm]);

  return { checkAndPlay };
}
