/**
 * useInboxSound
 *
 * Plays a soft notification chime when new unread inbox messages arrive.
 *
 * Autoplay policy compliance:
 *   AudioContext is blocked until the user makes a gesture in the current page session.
 *   Solution: set pendingPlay = true, arm capture-phase gesture listeners,
 *   play on the first click/keydown/touchstart.
 *
 * Deduplication:
 *   All state is in-memory (useRef). Resets on page load/refresh — which is
 *   correct: every fresh page load should re-evaluate unread state.
 *   Between rerenders and polling updates within the same load, IDs are tracked
 *   in a Set so the sound never fires twice for the same batch.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { Notification } from '../services/api';

// ─── Audio synthesis ───────────────────────────────────────────────────────

function playChime(volume = 0.07): void {
  try {
    const ctx = new AudioContext();

    const doPlay = () => {
      const now = ctx.currentTime;

      // Primary bell — 880 Hz → 820 Hz
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

      // Soft overtone — 1320 Hz, 30 ms offset
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
    };

    // Try resume in case context is suspended
    if (ctx.state === 'running') {
      doPlay();
    } else {
      ctx.resume().then(() => {
        if (ctx.state === 'running') doPlay();
      }).catch(() => {});
    }
  } catch {
    // AudioContext not available — silent fail
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useInboxSound() {
  // All state is in-memory — resets on every page load (correct behavior)
  const notifiedIdsRef  = useRef<Set<string>>(new Set());
  const pendingPlayRef  = useRef(false);
  const armedRef        = useRef(false);   // gesture listeners armed?
  const volumeRef       = useRef(0.07);

  // ── Gesture handler (fires once, removes all three listener types) ──
  const gestureHandlerRef = useRef<(() => void) | null>(null);

  const disarmListeners = useCallback(() => {
    if (gestureHandlerRef.current) {
      document.removeEventListener('click',      gestureHandlerRef.current, true);
      document.removeEventListener('keydown',    gestureHandlerRef.current, true);
      document.removeEventListener('touchstart', gestureHandlerRef.current, true);
      gestureHandlerRef.current = null;
    }
    armedRef.current = false;
  }, []);

  const armListeners = useCallback(() => {
    if (armedRef.current) return; // already waiting
    armedRef.current = true;

    const handler = () => {
      disarmListeners();
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        playChime(volumeRef.current);
      }
    };

    gestureHandlerRef.current = handler;
    document.addEventListener('click',      handler, true);
    document.addEventListener('keydown',    handler, true);
    document.addEventListener('touchstart', handler, true);
  }, [disarmListeners]);

  // Cleanup on unmount
  useEffect(() => () => { disarmListeners(); }, [disarmListeners]);

  /**
   * Call every time the notifications array is refreshed.
   * Safe to call on every rerender / poll / WS event.
   */
  const checkAndPlay = useCallback((notifications: Notification[]) => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const newUnread = unread.filter(n => !notifiedIdsRef.current.has(n.id));
    if (newUnread.length === 0) return;

    // Mark new IDs before scheduling to prevent double-scheduling
    newUnread.forEach(n => notifiedIdsRef.current.add(n.id));

    // Slightly quieter on very first call (initial page hydration)
    volumeRef.current = notifiedIdsRef.current.size === newUnread.length ? 0.05 : 0.07;

    pendingPlayRef.current = true;
    armListeners();
  }, [armListeners]);

  return { checkAndPlay };
}
