import type { SupabaseClient } from "npm:@supabase/supabase-js@2.39.0";

export interface ChatMemoryMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  limit = 20,
): Promise<ChatMemoryMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

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

export async function persistConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  messages: ChatMemoryMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const { error } = await supabase
    .from("chat_messages")
    .insert(
      messages.map((message) => ({
        conversation_id: conversationId,
        user_id: userId,
        role: message.role,
        content: message.content,
      })),
    );

  if (error) {
    console.error("[conversation-memory] Failed to persist messages:", error.message);
  }
}
