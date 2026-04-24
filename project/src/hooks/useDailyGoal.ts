import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface DailyGoalState {
  goalWords: number | null;
  todayWords: number;
  goalReached: boolean;
  goalMissedYesterday: boolean;
  loading: boolean;
}

export interface StreakState {
  currentStreak: number;
  loading: boolean;
}

function getLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CACHE_KEY_PREFIX = 'doooda_daily_words_';

async function updateStreakForDate(userId: string, today: string, goalAlreadyReached?: boolean): Promise<number | null> {
  const [{ data: streak }, { data: goalData }, { data: sessionData }] = await Promise.all([
    supabase.from('writing_streaks').select('id, current_streak, longest_streak, last_writing_date, streak_started_at').eq('user_id', userId).maybeSingle(),
    supabase.from('user_daily_goals').select('daily_word_goal').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    supabase.from('daily_writing_sessions').select('today_scene_words, goal_reached').eq('user_id', userId).eq('session_date', today).maybeSingle(),
  ]);

  const lastDate = streak?.last_writing_date;

  if (lastDate === today) return streak?.current_streak ?? null;

  const goalWords = goalData?.daily_word_goal ?? null;
  const todayWords = sessionData?.today_scene_words ?? 0;
  const goalReached = goalAlreadyReached !== undefined ? goalAlreadyReached : (sessionData?.goal_reached ?? false);

  if (goalWords !== null && !goalReached && todayWords < goalWords) {
    return streak?.current_streak ?? null;
  }

  const prevStreak = streak?.current_streak ?? 0;
  const newStreak = prevStreak + 1;

  const longest = Math.max(newStreak, streak?.longest_streak ?? 0);

  if (streak) {
    await supabase.from('writing_streaks').update({
      current_streak: newStreak,
      longest_streak: longest,
      last_writing_date: today,
      streak_started_at: streak.streak_started_at ?? today,
      updated_at: new Date().toISOString(),
    }).eq('id', streak.id);
  } else {
    await supabase.from('writing_streaks').insert({
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newStreak,
      last_writing_date: today,
      streak_started_at: today,
    });
  }

  return newStreak;
}

function getCachedTodayWords(userId: string): number {
  const today = getLocalDateString();
  const key = `${CACHE_KEY_PREFIX}${userId}_${today}`;
  const val = localStorage.getItem(key);
  return val ? parseInt(val, 10) : -1;
}

function setCachedTodayWords(userId: string, words: number) {
  const today = getLocalDateString();
  const key = `${CACHE_KEY_PREFIX}${userId}_${today}`;
  localStorage.setItem(key, String(words));
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_KEY_PREFIX) && !k.includes(today)) {
      localStorage.removeItem(k);
    }
  }
}

export function useDailyGoal(userId: string | undefined) {
  const [goalState, setGoalState] = useState<DailyGoalState>({
    goalWords: null,
    todayWords: 0,
    goalReached: false,
    goalMissedYesterday: false,
    loading: true,
  });

  const [streakState, setStreakState] = useState<StreakState>({
    currentStreak: 0,
    loading: true,
  });

  const [showConfetti, setShowConfetti] = useState(false);

  const localTodayWordsRef = useRef<number | null>(null);
  const goalWordsRef = useRef<number | null>(null);
  const pendingFlushRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const hasReachedGoalRef = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;

    const today = getLocalDateString();
    const yesterday = getYesterdayDateString();

    const [goalRes, sessionRes, streakRes] = await Promise.all([
      supabase.from('user_daily_goals').select('daily_word_goal').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      supabase.from('daily_writing_sessions').select('today_scene_words, goal_reached').eq('user_id', userId).eq('session_date', today).maybeSingle(),
      supabase.from('writing_streaks').select('current_streak, last_writing_date').eq('user_id', userId).maybeSingle(),
    ]);

    const goalWords = goalRes.data?.daily_word_goal ?? null;
    const dbWords = sessionRes.data?.today_scene_words ?? 0;
    const goalReached = sessionRes.data?.goal_reached ?? false;

    goalWordsRef.current = goalWords;
    hasReachedGoalRef.current = goalReached;

    const cached = getCachedTodayWords(userId);
    const todayWords = cached > dbWords ? cached : dbWords;

    if (localTodayWordsRef.current === null) {
      localTodayWordsRef.current = todayWords;
    } else if (todayWords > localTodayWordsRef.current) {
      localTodayWordsRef.current = todayWords;
    }

    let goalMissedYesterday = false;
    if (goalWords && !goalReached) {
      const yesterdaySession = await supabase
        .from('daily_writing_sessions')
        .select('today_scene_words, goal_reached')
        .eq('user_id', userId)
        .eq('session_date', yesterday)
        .maybeSingle();
      const yWords = yesterdaySession.data?.today_scene_words ?? 0;
      if (goalWords && yWords < goalWords) {
        goalMissedYesterday = true;
      }
    }

    let currentStreak = streakRes.data?.current_streak ?? 0;
    const lastWritingDate = streakRes.data?.last_writing_date;

    const todayGoalReached = goalReached || (goalWords !== null && (localTodayWordsRef.current ?? dbWords) >= goalWords);
    const canUpdateStreak = sessionRes.data && lastWritingDate !== today && (goalWords === null || todayGoalReached);

    if (canUpdateStreak) {
      await updateStreakForDate(userId, today);
      const { data: updatedStreak } = await supabase
        .from('writing_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .maybeSingle();
      currentStreak = updatedStreak?.current_streak ?? currentStreak;
    }

    setGoalState({
      goalWords,
      todayWords: localTodayWordsRef.current!,
      goalReached: goalWords ? localTodayWordsRef.current! >= goalWords : goalReached,
      goalMissedYesterday,
      loading: false,
    });

    setStreakState({
      currentStreak,
      loading: false,
    });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveGoal(goal: number) {
    if (!userId) return;
    const { error } = await supabase.from('user_daily_goals').upsert(
      { user_id: userId, daily_word_goal: goal, is_active: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (!error) {
      goalWordsRef.current = goal;
      setGoalState((prev) => ({ ...prev, goalWords: goal }));
    }
  }

  const flushToDatabase = useCallback(async () => {
    if (!userId || isSavingRef.current) return;
    if (localTodayWordsRef.current === null) return;

    isSavingRef.current = true;
    const wordsToWrite = localTodayWordsRef.current;
    const today = getLocalDateString();

    try {
      const { data: existing } = await supabase
        .from('daily_writing_sessions')
        .select('id, today_scene_words, goal_reached')
        .eq('user_id', userId)
        .eq('session_date', today)
        .maybeSingle();

      const alreadyReached = existing?.goal_reached ?? false;
      const goalWords = goalWordsRef.current;
      const nowReached = goalWords ? wordsToWrite >= goalWords : false;
      const isNewSession = !existing;

      if (existing) {
        if (wordsToWrite > (existing.today_scene_words ?? 0)) {
          await supabase.from('daily_writing_sessions').update({
            today_scene_words: wordsToWrite,
            goal_reached: nowReached,
            goal_reached_at: nowReached && !alreadyReached ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      } else {
        await supabase.from('daily_writing_sessions').insert({
          user_id: userId,
          session_date: today,
          today_scene_words: wordsToWrite,
          words_written: wordsToWrite,
          goal_reached: nowReached,
          goal_reached_at: nowReached ? new Date().toISOString() : null,
        });
      }

      setCachedTodayWords(userId, wordsToWrite);

      if (isNewSession && (goalWords === null || nowReached)) {
        await updateStreak(today, nowReached);
      } else if (!isNewSession && nowReached && !alreadyReached) {
        await updateStreak(today, nowReached);
      }

      if (nowReached && !alreadyReached && !hasReachedGoalRef.current) {
        hasReachedGoalRef.current = true;
        setShowConfetti(true);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [userId]);

  async function recordWritingWords(wordsAdded: number) {
    if (!userId || wordsAdded <= 0) return;

    if (localTodayWordsRef.current === null) {
      const cached = getCachedTodayWords(userId);
      localTodayWordsRef.current = cached > 0 ? cached : 0;
    }

    localTodayWordsRef.current += wordsAdded;
    const newTotal = localTodayWordsRef.current;

    setCachedTodayWords(userId, newTotal);

    setGoalState((prev) => ({
      ...prev,
      todayWords: newTotal,
      goalReached: prev.goalWords ? newTotal >= prev.goalWords : false,
    }));

    if (pendingFlushRef.current) {
      clearTimeout(pendingFlushRef.current);
    }
    pendingFlushRef.current = setTimeout(() => {
      flushToDatabase();
    }, 3000);
  }

  async function updateStreak(today: string, goalReached?: boolean) {
    if (!userId) return;
    const newStreak = await updateStreakForDate(userId, today, goalReached);
    if (newStreak !== null) {
      setStreakState({ currentStreak: newStreak, loading: false });
    }
  }

  return {
    goalState,
    streakState,
    showConfetti,
    setShowConfetti,
    saveGoal,
    recordWritingWords,
    reload: load,
  };
}
