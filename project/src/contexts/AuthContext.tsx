import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, api } from '../services/api';
import type { User } from '../types';

type UserRole = 'writer' | 'admin';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  userPlan: string;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUserPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<{ role: UserRole; plan: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, plan')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[AuthContext] Error fetching user profile:', error);
      return { role: 'writer', plan: 'free' };
    }

    if (!data) {
      console.warn('[AuthContext] No user data found for:', userId);
      return { role: 'writer', plan: 'free' };
    }

    return {
      role: (data.role as UserRole) || 'writer',
      plan: (data.plan as string) || 'free',
    };
  } catch (error) {
    console.error('[AuthContext] Exception fetching user profile:', error);
    return { role: 'writer', plan: 'free' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  async function loadUserProfile(currentUser: User) {
    const appRole = (currentUser as any)?.app_metadata?.role;
    if (appRole === 'admin' || appRole === 'writer') {
      setUserRole(appRole as UserRole);
      const { plan } = await fetchUserProfile(currentUser.id);
      setUserPlan(plan);
    } else {
      const { role, plan } = await fetchUserProfile(currentUser.id);
      setUserRole(role);
      setUserPlan(plan);
    }
  }

  async function refreshUserPlan() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { plan } = await fetchUserProfile(authUser.id);
    setUserPlan(plan);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user as User || null;
      setUser(currentUser);

      if (currentUser?.user_metadata?.preferred_language) {
        localStorage.setItem('doooda_language', currentUser.user_metadata.preferred_language);
      }

      if (currentUser) {
        loadUserProfile(currentUser).catch((error) => {
          console.error('[AuthContext] Error loading user profile:', error);
          setUserRole('writer');
          setUserPlan('free');
        }).finally(() => setLoading(false));
      } else {
        setUserRole(null);
        setUserPlan('free');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('[AuthContext] Session error:', error);
      setUserRole(null);
      setUserPlan('free');
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth event:', event, 'Session exists:', !!session);

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const currentUser = session.user as User;
        setUser(currentUser);
        (async () => {
          try {
            await loadUserProfile(currentUser);
          } catch {
            setUserRole('writer');
          }
        })();
        return;
      }

      if (event === 'SIGNED_OUT' && !session) {
        setUser(null);
        setUserRole(null);
        setUserPlan('free');
        return;
      }

      if (session?.user) {
        const currentUser = session.user as User;
        setUser(currentUser);

        (async () => {
          try {
            await loadUserProfile(currentUser);
          } catch (error) {
            console.error('[AuthContext] Profile fetch error:', error);
            setUserRole('writer');
            setUserPlan('free');
          }
        })();

        if (currentUser?.user_metadata?.preferred_language) {
          const preferredLang = currentUser.user_metadata.preferred_language;
          localStorage.setItem('doooda_language', preferredLang);
          document.documentElement.lang = preferredLang;
          document.documentElement.dir = preferredLang === 'ar' ? 'rtl' : 'ltr';
        }

        if (event === 'SIGNED_IN') {
          const pendingRef = sessionStorage.getItem('doooda_ref');
          if (pendingRef && session.access_token) {
            sessionStorage.removeItem('doooda_ref');
            const refUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-referral`;
            fetch(refUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ referral_code: pendingRef }),
            }).catch(() => {});
          }
        }
      }
    });

    return () => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Unsubscribe error:', error);
      }
    };
  }, []);

  async function login(email: string, password: string): Promise<UserRole> {
    const { user: authUser } = await api.login(email, password);
    const castUser = authUser as User;
    setUser(castUser);

    const { role, plan } = await fetchUserProfile(castUser.id);
    setUserRole(role);
    setUserPlan(plan);
    return role;
  }

  async function signup(email: string, password: string) {
    const { user: authUser } = await api.signup(email, password);
    setUser(authUser as User);
    setUserRole('writer');
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setUserRole(null);
    window.location.href = '/login';
  }

  function updateUser(updates: Partial<User>) {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, userRole, userPlan, isAdmin, loading, login, signup, logout, updateUser, refreshUserPlan }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
