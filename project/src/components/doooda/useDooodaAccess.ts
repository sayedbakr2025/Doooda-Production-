import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/api';

export type DooodaAccessReason =
  | 'unauthenticated'
  | 'no_plan'
  | 'plan_no_access'
  | 'daily_limit'
  | 'monthly_limit'
  | 'globally_disabled'
  | 'no_active_provider';

export interface DooodaAccessState {
  allowed: boolean;
  visible: boolean;
  reason?: DooodaAccessReason;
  plan?: string;
  unlimited?: boolean;
  dailyUsed?: number;
  dailyLimit?: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
  disabledMessageEn?: string;
  disabledMessageAr?: string;
  loading: boolean;
  error: boolean;
}

const HIDDEN_REASONS: DooodaAccessReason[] = [
  'globally_disabled',
  'no_active_provider',
  'unauthenticated',
];

function computeVisible(allowed: boolean, reason?: DooodaAccessReason): boolean {
  if (allowed) return true;
  if (reason && HIDDEN_REASONS.includes(reason)) return false;
  return true;
}

const CACHE_TTL = 60_000;
let cachedResult: DooodaAccessState | null = null;
let cachedAt = 0;

export function useDooodaAccess() {
  const [state, setState] = useState<DooodaAccessState>(
    cachedResult ?? { allowed: false, visible: false, loading: true, error: false }
  );

  const check = useCallback(async (skipCache = false) => {
    if (!skipCache && cachedResult && Date.now() - cachedAt < CACHE_TTL) {
      setState(cachedResult);
      return cachedResult;
    }

    setState((prev) => ({ ...prev, loading: true, error: false }));

    try {
      const { data, error } = await supabase.rpc('check_doooda_access');

      if (error) {
        const failState: DooodaAccessState = { allowed: false, visible: false, loading: false, error: true };
        setState(failState);
        cachedResult = null;
        return failState;
      }

      const result: DooodaAccessState = {
        allowed: data.allowed,
        visible: computeVisible(data.allowed, data.reason),
        reason: data.reason,
        plan: data.plan,
        unlimited: data.unlimited,
        dailyUsed: data.daily_used,
        dailyLimit: data.daily_limit,
        monthlyUsed: data.monthly_used,
        monthlyLimit: data.monthly_limit,
        disabledMessageEn: data.disabled_message_en,
        disabledMessageAr: data.disabled_message_ar,
        loading: false,
        error: false,
      };

      cachedResult = result;
      cachedAt = Date.now();
      setState(result);
      return result;
    } catch {
      const failState: DooodaAccessState = { allowed: false, visible: false, loading: false, error: true };
      setState(failState);
      cachedResult = null;
      return failState;
    }
  }, []);

  const invalidateCache = useCallback(() => {
    cachedResult = null;
    cachedAt = 0;
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { ...state, refresh: check, invalidateCache };
}

export function getDooodaAccess(): DooodaAccessState {
  return cachedResult ?? { allowed: false, visible: false, loading: true, error: false };
}
