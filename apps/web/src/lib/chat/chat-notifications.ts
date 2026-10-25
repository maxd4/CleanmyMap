import type { SupabaseClient } from "@supabase/supabase-js";
import { parseChatSupabaseResult } from "./postgrest";

export async function createChatNotificationsForMessage(
  supabase: SupabaseClient,
  messageId: string,
  actorUserId: string,
): Promise<number> {
  const rawResult: unknown = await supabase.rpc("create_chat_notifications_for_message", {
    p_message_id: messageId,
    p_actor_user_id: actorUserId,
  });

  const result = parseChatSupabaseResult(rawResult);
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (typeof result.data === "number" && Number.isFinite(result.data)) {
    return result.data;
  }

  if (typeof result.data === "string") {
    const parsed = Number.parseInt(result.data, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}
