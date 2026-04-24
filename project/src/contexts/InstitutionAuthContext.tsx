import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface InstitutionalAccount {
  id: string;
  publisher_id: string | null;
  email: string;
  name: string;
  institution_type: string;
  country: string;
  city: string;
  phone: string;
  website: string;
  description: string;
  accepted_genres: string[];
  accepted_work_types: string[];
  submission_guidelines: string;
  tokens_balance: number;
  is_active: boolean;
  created_at: string;
}

interface InstitutionAuthContextType {
  institution: InstitutionalAccount | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshInstitution: () => Promise<void>;
}

const InstitutionAuthContext = createContext<InstitutionAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'doooda_institution_session';

export function InstitutionAuthProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState<InstitutionalAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setInstitution(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.functions.invoke('institution-auth', {
      body: { action: 'login', email, password },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.account) throw new Error('Login failed');

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.account));
    setInstitution(data.account);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setInstitution(null);
    window.location.href = '/partners/login';
  }

  async function refreshInstitution() {
    if (!institution?.id) return;
    const { data } = await supabase
      .from('institutional_accounts')
      .select('*')
      .eq('id', institution.id)
      .maybeSingle();
    if (data) {
      setInstitution(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  return (
    <InstitutionAuthContext.Provider value={{ institution, loading, login, logout, refreshInstitution }}>
      {children}
    </InstitutionAuthContext.Provider>
  );
}

export function useInstitutionAuth() {
  const ctx = useContext(InstitutionAuthContext);
  if (!ctx) throw new Error('useInstitutionAuth must be used within InstitutionAuthProvider');
  return ctx;
}
