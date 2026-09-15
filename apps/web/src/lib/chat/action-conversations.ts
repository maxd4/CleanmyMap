import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserIdentity } from "@/lib/authz";
import { loadActionById } from "@/lib/actions/store";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import type { ActionRow } from "@/types/database";

export type ActionConversationRow = {
  id: string;
  action_id: string;
};

/** Compatibility wrapper for the technical notification audience only. It is
 * intentionally not used to authorize reading or writing action discussions. */
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

export type ActionDiscussionAccess =
  | { state: "unavailable"; conversationId: null }
  | { state: "excluded"; conversationId: string }
  | { state: "allowed"; conversationId: string };

export type ActionDiscussionCandidate = {
  action_date: ActionRow["action_date"];
  event_start_time?: ActionRow["event_start_time"];
  action_phase: ActionRow["action_phase"] | null;
  status: ActionRow["status"];
  moderation_visibility?: ActionRow["moderation_visibility"];
  published_at?: ActionRow["published_at"];
};

/** Discussion lifecycle eligibility; this is not public-share eligibility. */
export function isActionDiscussionAvailable(
  action: ActionDiscussionCandidate | null,
  now = new Date(),
): boolean {
  const futurePreActionCandidate =
    action && action.action_phase !== null
      ? { ...action, action_phase: action.action_phase }
      : null;

  return Boolean(
    action &&
      action.published_at !== null &&
      action.published_at !== undefined &&
      action.moderation_visibility !== "hidden" &&
      ((futurePreActionCandidate !== null && isPublishedFuturePreAction(futurePreActionCandidate, now)) ||
        (action.status === "approved" &&
          (action.action_phase ?? "post_action_complete") !== "pre_action")),
  );
}

/** Resolves the independent discussion contract without changing participation state. */
export async function resolveActionDiscussionAccess(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
): Promise<ActionDiscussionAccess> {
  const action = await loadActionById(supabase, actionId);
  if (!isActionDiscussionAvailable(action)) {
    return { state: "unavailable", conversationId: null };
  }

  const conversationResult = await supabase
    .from("action_conversations")
    .select("id")
    .eq("action_id", actionId)
    .maybeSingle();
  if (conversationResult.error || typeof conversationResult.data?.id !== "string") {
    return { state: "unavailable", conversationId: null };
  }

  const exclusionResult = await supabase
    .from("action_conversation_exclusions")
    .select("active")
    .eq("conversation_id", conversationResult.data.id)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!exclusionResult.error && exclusionResult.data?.active === true) {
    return { state: "excluded", conversationId: conversationResult.data.id };
  }

  return { state: "allowed", conversationId: conversationResult.data.id };
}

/** Dedicated discussion capability. `elu` is deliberately not an override. */
export function canModerateActionConversationForIdentity(
  identity: Pick<UserIdentity, "userId" | "activeRole">,
  action: { created_by_clerk_id: string },
  organizerIds: string[],
): boolean {
  return (
    identity.activeRole === "admin" ||
    identity.activeRole === "max" ||
    identity.userId === action.created_by_clerk_id ||
    organizerIds.includes(identity.userId)
  );
}

export async function canModerateActionConversation(
  supabase: SupabaseClient,
  identity: Pick<UserIdentity, "userId" | "activeRole">,
  actionId: string,
): Promise<boolean> {
  const action = await loadActionById(supabase, actionId);
  if (!action || !isActionDiscussionAvailable(action)) return false;

  if (identity.activeRole === "admin" || identity.activeRole === "max") {
    return true;
  }

  const organizerIds = await loadActionOrganizerIdsForAction(
    supabase,
    actionId,
    action.created_by_clerk_id,
  );
  return canModerateActionConversationForIdentity(identity, action, organizerIds);
}
