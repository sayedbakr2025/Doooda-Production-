import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { PlanData, PlanFeatures } from '../types';

const CACHE_KEY = 'doooda_plan_cache';
const CACHE_TTL = 5 * 60 * 1000;

const DEFAULT_FEATURES: PlanFeatures = {
  academy: true,
  competitions: true,
  max_projects: 3,
  export_pdf: false,
  export_word: false,
  marketing: false,
  doooda_daily_limit: 5,
  doooda_monthly_limit: 50,
  doooda_max_tokens: 1000,
  doooda_context_budget: 800,
};

const FREE_PLAN: PlanData = {
  id: '',
  code: 'free',
  name: 'free',
  name_ar: 'كاتب هاوي',
  name_en: 'Hobbyist Writer',
  tokens_initial: 10000,
  tokens_recurring: 0,
  allow_token_purchase: false,
  max_token_cap: 200000,
  monthly_tokens: 10000,
  multiplier: 1.5,
  price: 0,
  price_monthly: 0,
  features: DEFAULT_FEATURES,
};

export function useUserPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL && data?.code) {
          setPlan(data);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.rpc('get_user_plan', {
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data && typeof data === 'object') {
        const planData = data as PlanData;
        setPlan(planData);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: planData, ts: Date.now() }));
      } else {
        setPlan(FREE_PLAN);
      }
    } catch (err) {
      console.error('[useUserPlan] Failed to load plan:', err);
      setPlan(FREE_PLAN);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const planCode = plan?.code || 'free';
  const isPaid = planCode !== 'free';
  const isFree = planCode === 'free';
  const features = plan?.features || DEFAULT_FEATURES;

  const displayName = (language: 'ar' | 'en') => {
    if (!plan) return language === 'ar' ? 'كاتب هاوي' : 'Hobbyist Writer';
    return language === 'ar' ? (plan.name_ar || plan.name) : (plan.name_en || plan.name);
  };

  const canPurchaseTokens = plan?.allow_token_purchase ?? false;
  const maxProjects = features.max_projects ?? 3;
  const canExportPdf = features.export_pdf ?? false;
  const canExportWord = features.export_word ?? false;
  const canMarketing = features.marketing ?? false;
  const dooodaMaxTokens = features.doooda_max_tokens ?? 1000;
  const dooodaContextBudget = features.doooda_context_budget ?? 800;
  const tokenMultiplier = plan?.multiplier ?? 1.5;

  return {
    plan,
    planCode,
    isPaid,
    isFree,
    loading,
    features,
    displayName,
    canPurchaseTokens,
    maxProjects,
    canExportPdf,
    canExportWord,
    canMarketing,
    dooodaMaxTokens,
    dooodaContextBudget,
    tokenMultiplier,
    tokensInitial: plan?.tokens_initial ?? 10000,
    tokensRecurring: plan?.tokens_recurring ?? 0,
    maxTokenCap: plan?.max_token_cap ?? null,
    priceMonthly: plan?.price_monthly ?? 0,
    refresh: loadPlan,
  };
}