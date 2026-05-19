import { invokeWithAuth } from '@/lib/supabaseClient';

/**
 * Creates a new chat session on the server.
 * Returns the new session id (UUID string).
 * Falls back to a local UUID if the network call fails, so the chat is never blocked.
 */
export async function createChatSession(projectId?: string | null): Promise<string> {
  try {
    const { data, error, requiresAuth } = await invokeWithAuth<{ session_id: string }>(
      'create-session',
      {
        method: 'POST',
        body: { project_id: projectId ?? null },
      }
    );

    if (requiresAuth || error || !data?.session_id) {
      console.warn('[chatSession] createChatSession fallback to local UUID:', error ?? 'no data');
      return crypto.randomUUID();
    }

    return data.session_id;
  } catch (err) {
    console.warn('[chatSession] createChatSession error, using local UUID:', err);
    return crypto.randomUUID();
  }
}

/**
 * Archives a session so it becomes read-only.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function archiveChatSession(sessionId: string): Promise<void> {
  try {
    await invokeWithAuth('create-session', {
      method: 'PATCH',
      body: { session_id: sessionId, status: 'archived' },
    });
  } catch (err) {
    console.warn('[chatSession] archiveChatSession error (non-fatal):', err);
  }
}
