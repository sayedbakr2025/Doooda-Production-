/**
 * useInboxSound
 *
 * Plays a single soft notification chime when new unread inbox messages arrive.
 *
 * Deduplication strategy:
 *   - sessionStorage key `inbox_notified_ids` persists notified message IDs
 *     for the lifetime of the browser tab session
 *   - On initial load  → play once (quietly) if unread already exist
 *   - On polling / WS  → play only when genuinely new IDs appear
 *   - Debounced 800 ms → one sound per batch, never per individual rerender
 *
 * Sound:
 *   - Pure Web Audio API  (no external file)
 *   - Soft two-tone sine chime, 220 ms
 *   - Graceful silent fail if browser blocks AudioContext
 */

import { useRef, useCallback } from 'react';
import type { Notification } from '../services/api';

const SESSION_KEY = 'inbox_notified_ids';
const DEBOUNCE_MS = 800;
const INITIAL_DELAY_MS = 600;

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
  } catch {
    // sessionStorage quota exceeded — ignore silently
  }
}

// ─── Audio synthesis ───────────────────────────────────────────────────────

function playChime(volume = 0.08): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Primary bell — 880 Hz decaying to 820 Hz
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

    // Soft overtone — 1320 Hz, starts 30 ms later, quieter
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
  } catch {
    // Browser blocked AudioContext (e.g. no user gesture yet) — silent fail
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useInboxSound() {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true); // true until first checkAndPlay call resolves

  /**
   * Call every time the notifications array updates (from load(), realtime, polling).
   * Safe to call on every rerender — deduplication prevents duplicate sounds.
   */
  const checkAndPlay = useCallback((notifications: Notification[]) => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) {
      // First load with zero unread — mark initial done without sound
      isInitialLoadRef.current = false;
      return;
    }

    const notifiedIds = getNotifiedIds();
    const newUnread = unread.filter(n => !notifiedIds.has(n.id));

    if (newUnread.length === 0) {
      isInitialLoadRef.current = false;
      return; // All already notified this session
    }

    // Mark the new batch as notified before scheduling sound
    // (prevents duplicate if component re-calls before debounce fires)
    newUnread.forEach(n => notifiedIds.add(n.id));
    saveNotifiedIds(notifiedIds);

    const isInitial = isInitialLoadRef.current;
    isInitialLoadRef.current = false;

    // Cancel any pending debounce from the same batch
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const delay = isInitial ? INITIAL_DELAY_MS : DEBOUNCE_MS;
    const vol   = isInitial ? 0.05 : 0.08; // quieter on initial page load

    debounceTimerRef.current = setTimeout(() => {
      playChime(vol);
    }, delay);
  }, []);

  return { checkAndPlay };
}
