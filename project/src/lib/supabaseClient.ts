import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

export async function invokeWithAuth<T = any>(
  functionName: string,
  options?: {
    body?: Record<string, any>;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
  }
): Promise<{
  data: T | null;
  error: any;
  requiresAuth?: boolean;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn(`[invokeWithAuth] No valid session for ${functionName}`);
    return {
      data: null,
      error: { message: 'No active session' },
      requiresAuth: true
    };
  }

  console.log(`[invokeWithAuth] Calling ${functionName} with valid session`);

  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  try {
    const response = await fetch(url, {
      method: options?.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      console.warn(`[invokeWithAuth] 401 from ${functionName}, refreshing session...`);

      const { data: { session: refreshed } } = await supabase.auth.refreshSession();

      if (refreshed?.access_token) {
        console.log(`[invokeWithAuth] Session refreshed, retrying ${functionName}...`);
        const retryResponse = await fetch(url, {
          method: options?.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshed.access_token}`,
            'apikey': supabaseAnonKey,
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });

        const retryData = await retryResponse.json();
        return {
          data: retryData,
          error: retryResponse.ok ? null : retryData
        };
      }

      console.error(`[invokeWithAuth] Session refresh failed for ${functionName}`);
      return {
        data: null,
        error: { message: 'Session expired' },
        requiresAuth: true
      };
    }

    const data = await response.json();

    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data
    };
  } catch (err) {
    console.error(`[invokeWithAuth] Error calling ${functionName}:`, err);
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}
