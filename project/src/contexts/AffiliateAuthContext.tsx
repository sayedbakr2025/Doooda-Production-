import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface AffiliateAccount {
  id: string;
  name: string;
  email: string;
  website: string | null;
  social_links: Record<string, string>;
  promotion_method: string | null;
  country: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  referral_code: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  minimum_payout: number;
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
  total_revenue: number;
  total_commission_earned: number;
  total_commission_paid: number;
  is_flagged: boolean;
  payout_method: string | null;
  payout_details: Record<string, string>;
  created_at: string;
}

interface AffiliateAuthContextType {
  affiliate: AffiliateAccount | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAffiliate: () => Promise<void>;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType | undefined>(undefined);
const STORAGE_KEY = 'doooda_affiliate_session';

export function AffiliateAuthProvider({ children }: { children: ReactNode }) {
  const [affiliate, setAffiliate] = useState<AffiliateAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAffiliate(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.functions.invoke('affiliate-auth', {
      body: { action: 'login', email, password },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.account) throw new Error('Login failed');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.account));
    setAffiliate(data.account);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAffiliate(null);
    window.location.href = '/affiliate/login';
  }

  async function refreshAffiliate() {
    if (!affiliate?.id) return;
    const { data } = await supabase.functions.invoke('affiliate-auth', {
      body: { action: 'get_account', affiliate_id: affiliate.id },
    });
    if (data?.account) {
      setAffiliate(data.account);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.account));
    }
  }

  return (
    <AffiliateAuthContext.Provider value={{ affiliate, loading, login, logout, refreshAffiliate }}>
      {children}
    </AffiliateAuthContext.Provider>
  );
}

export function useAffiliateAuth() {
  const ctx = useContext(AffiliateAuthContext);
  if (!ctx) throw new Error('useAffiliateAuth must be used within AffiliateAuthProvider');
  return ctx;
}
