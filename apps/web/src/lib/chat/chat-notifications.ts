import type { SupabaseClient } from "@supabase/supabase-js";

export async function createChatNotificationsForMessage(
  supabase: SupabaseClient,
  messageId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("create_chat_notifications_for_message", {
    p_message_id: messageId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data === "number" && Number.isFinite(data)) {
    return data;
  }

  if (typeof data === "string") {
    const parsed = Number.parseInt(data, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}
