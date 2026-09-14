import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionConversationRow = {
  id: string;
  action_id: string;
};

/**
 * Grants persistent discussion access after the canonical action-participation
 * mutation. The RPC is service-only; callers must have authenticated and
 * completed the action authorization flow before invoking it.
 */
export async function ensureActionConversationMember(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_action_conversation_member", {
    p_action_id: actionId,
    p_user_id: userId,
  });
  if (error) {
    throw error;
  }
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("La discussion canonique de l'action n'a pas pu être ouverte.");
  }
  return data;
}
