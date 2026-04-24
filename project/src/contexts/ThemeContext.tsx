import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('doooda-theme');
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.theme) {
        const userTheme = session.user.user_metadata.theme;
        if (userTheme === 'dark' || userTheme === 'light') {
          setThemeState(userTheme);
        }
      }
    }).catch((error) => {
      console.error('Theme session error:', error);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.user_metadata?.theme) {
        const userTheme = session.user.user_metadata.theme;
        if (userTheme === 'dark' || userTheme === 'light') {
          setThemeState(userTheme);
        }
      }
    });

    return () => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Theme unsubscribe error:', error);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('doooda-theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.auth.updateUser({
        data: { theme: newTheme }
      });
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
