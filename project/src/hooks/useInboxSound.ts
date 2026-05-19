/**
 * useInboxSound
 *
 * Plays a soft notification chime when new unread inbox messages arrive.
 *
 * Browser Autoplay Policy compliance:
 *   AudioContext is blocked until the user makes a gesture (click/keydown/touch).
 *   Strategy:
 *     1. On notification detection → set pendingPlay = true
 *     2. Register one-time gesture listeners (click, keydown, touchstart)
 *     3. On first gesture → play chime → remove listeners
 *     4. If a gesture already happened this session → play immediately
 *
 * Deduplication:
 *   - sessionStorage `inbox_notified_ids` tracks notified message IDs
 *   - prevents replay on polling / WS refresh / rerender / Inbox open
 */

import { useRef, useCallback, useEffect } from 'react';
import type { Notification } from '../services/api';

const SESSION_KEY = 'inbox_notified_ids';
const GESTURE_FLAG = 'inbox_gesture_done'; // sessionStorage flag

// ─── sessionStorage helpers ────────────────────────────────────────────────

function getNotifiedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
  } catch {}
}

function hasGestureHappened(): boolean {
  return sessionStorage.getItem(GESTURE_FLAG) === '1';
}

function markGestureHappened(): void {
  try { sessionStorage.setItem(GESTURE_FLAG, '1'); } catch {}
}

// ─── Audio synthesis ───────────────────────────────────────────────────────

function playChime(volume = 0.07): void {
  try {
    const ctx = new AudioContext();

    const doPlay = () => {
      const now = ctx.currentTime;

      // Primary bell — 880 Hz → 820 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(820, now + 0.15);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(volume, now + 0.012);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Soft overtone — 1320 Hz, 30 ms offset
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.03);
      gain2.gain.setValueAtTime(0, now + 0.03);
      gain2.gain.linearRampToValueAtTime(volume * 0.35, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      osc2.start(now + 0.03);
      osc2.stop(now + 0.20);

      setTimeout(() => { ctx.close().catch(() => {}); }, 500);
    };

    if (ctx.state === 'running') {
      doPlay();
    } else {
      // Resume after gesture unlocks AudioContext
      ctx.resume().then(doPlay).catch(() => {});
    }
  } catch {
    // AudioContext not supported or blocked entirely — silent fail
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useInboxSound() {
  const pendingPlayRef = useRef(false);     // true = sound queued, waiting for gesture
  const isInitialRef   = useRef(true);      // true until first checkAndPlay resolves
  const cleanupRef     = useRef<(() => void) | null>(null);

  // Register one-time gesture listeners that fire the pending sound
  const armGestureListeners = useCallback(() => {
    if (cleanupRef.current) return; // already armed

    const fire = () => {
      markGestureHappened();
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        playChime(isInitialRef.current ? 0.05 : 0.07);
      }
      // Remove listeners after first gesture
      document.removeEventListener('click',      fire, true);
      document.removeEventListener('keydown',    fire, true);
      document.removeEventListener('touchstart', fire, true);
      cleanupRef.current = null;
    };

    document.addEventListener('click',      fire, { capture: true, once: true });
    document.addEventListener('keydown',    fire, { capture: true, once: true });
    document.addEventListener('touchstart', fire, { capture: true, once: true });

    cleanupRef.current = () => {
      document.removeEventListener('click',      fire, true);
      document.removeEventListener('keydown',    fire, true);
      document.removeEventListener('touchstart', fire, true);
    };
  }, []);

  // Disarm on unmount (component teardown)
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  /**
   * Call every time the notifications array updates.
   * Safe to call on every rerender / poll / WS refresh.
   */
  const checkAndPlay = useCallback((notifications: Notification[]) => {
    const unread = notifications.filter(n => !n.read);

    if (unread.length === 0) {
      isInitialRef.current = false;
      return;
    }

    const notifiedIds = getNotifiedIds();
    const newUnread   = unread.filter(n => !notifiedIds.has(n.id));

    if (newUnread.length === 0) {
      isInitialRef.current = false;
      return; // All already notified this session
    }

    // Mark before scheduling to prevent duplicate calls
    newUnread.forEach(n => notifiedIds.add(n.id));
    saveNotifiedIds(notifiedIds);

    const vol = isInitialRef.current ? 0.05 : 0.07;
    isInitialRef.current = false;

    if (hasGestureHappened()) {
      // User has already interacted this tab session — play immediately
      playChime(vol);
    } else {
      // Queue sound for first gesture
      pendingPlayRef.current = true;
      armGestureListeners();
    }
  }, [armGestureListeners]);

  return { checkAndPlay };
}
