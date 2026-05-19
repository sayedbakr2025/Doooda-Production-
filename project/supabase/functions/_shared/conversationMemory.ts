import type { SupabaseClient } from "npm:@supabase/supabase-js@2.39.0";

export interface ChatMemoryMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Loads conversation history.
 * Prefers querying by session_id (new path) when provided.
 * Falls back to conversation_id (legacy path) for backwards compatibility.
 */
export async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  limit = 20,
  sessionId?: string,
): Promise<ChatMemoryMessage[]> {
  let query = supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  } else {
    query = query.eq("conversation_id", conversationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[conversation-memory] Failed to load history:", error.message);
    return [];
  }

  return (data ?? [])
    .slice()
    .reverse()
    .map((message) => ({
      role: message.role as ChatMemoryMessage["role"],
      content: message.content,
    }));
}

/**
 * Persists a batch of messages.
 * Writes both session_id (new) and conversation_id (legacy) so both query paths work.
 */
export async function persistConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  messages: ChatMemoryMessage[],
  sessionId?: string,
): Promise<void> {
  if (messages.length === 0) return;

  const { error } = await supabase
    .from("chat_messages")
    .insert(
      messages.map((message) => ({
        conversation_id: conversationId,
        session_id: sessionId ?? null,
        user_id: userId,
        role: message.role,
        content: message.content,
      })),
    );

  if (error) {
    console.error("[conversation-memory] Failed to persist messages:", error.message);
  }
}

/**
 * Updates last_active_at on a session after a successful exchange.
 * Non-fatal on error.
 */
export async function touchSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.warn("[conversation-memory] touchSession error (non-fatal):", error.message);
  }
}
