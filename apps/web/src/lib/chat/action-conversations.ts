import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserIdentity } from "@/lib/authz";
import type { ActiveRole } from "@/lib/domain-language";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { usesRegistrationStore } from "@/lib/actions/participation/action-phase";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import type { ActionRow } from "@/types/database";

/** Compatibility wrapper for the technical notification audience only. It is
 * intentionally not used to authorize reading or writing action discussions. */

export type ActionDiscussionAccess =
  | { state: "unavailable"; conversationId: null }
  | { state: "excluded"; conversationId: string }
  | { state: "forbidden"; conversationId: string }
  | { state: "allowed"; conversationId: string };

export type ActionDiscussionCandidate = {
  action_date: ActionRow["action_date"];
  event_start_time?: ActionRow["event_start_time"];
  action_phase: ActionRow["action_phase"] | null;
  status: ActionRow["status"];
  moderation_visibility?: ActionRow["moderation_visibility"];
  published_at?: ActionRow["published_at"];
};

export type ActionDiscussionMembership = {
  activeRole?: ActiveRole | null;
  isOwner: boolean;
  isOrganizer: boolean;
  registrationStatus?: "pending" | "confirmed" | "cancelled" | null;
  participationStatus?: "pending" | "confirmed" | "cancelled" | null;
};

/** Runtime discussion access is based on the action's current participation store. */
export function canViewActionDiscussionForMembership(
  action: Pick<ActionDiscussionCandidate, "action_phase">,
  membership: ActionDiscussionMembership,
): boolean {
  if (
    membership.activeRole === "admin" ||
    membership.activeRole === "max" ||
    membership.isOwner ||
    membership.isOrganizer
  ) {
    return true;
  }

  if (usesRegistrationStore(action.action_phase)) {
    return membership.registrationStatus === "confirmed";
  }

  return membership.participationStatus === "confirmed";
}

/** Discussion lifecycle eligibility; this is not public-share eligibility. */
export function isActionDiscussionAvailable(
  action: ActionDiscussionCandidate | null,
  now = new Date(),
): boolean {
  if (
    action?.status === "cancelled" &&
    action.published_at !== null &&
    action.published_at !== undefined
  ) {
    return action.moderation_visibility !== "hidden";
  }

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

async function loadActionDiscussionMembership(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
  activeRole: ActiveRole | null | undefined,
  action: ActionDiscussionCandidate & { created_by_clerk_id: string },
): Promise<ActionDiscussionMembership | null> {
  const [organizerResult, registrationResult, participationResult] = await Promise.all([
    supabase
      .from("action_organizers")
      .select("organizer_clerk_id")
      .eq("action_id", actionId)
      .eq("organizer_clerk_id", userId)
      .maybeSingle(),
    supabase
      .from("action_registrations")
      .select("registration_status")
      .eq("action_id", actionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("action_participants")
      .select("participation_status")
      .eq("action_id", actionId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (
    organizerResult.error ||
    registrationResult.error ||
    participationResult.error
  ) {
    return null;
  }

  return {
    activeRole,
    isOwner: action.created_by_clerk_id === userId,
    isOrganizer: organizerResult.data?.organizer_clerk_id === userId,
    registrationStatus: normalizeParticipationStatus(registrationResult.data?.registration_status),
    participationStatus: normalizeParticipationStatus(participationResult.data?.participation_status),
  };
}

function normalizeParticipationStatus(
  value: unknown,
): ActionDiscussionMembership["registrationStatus"] {
  return value === "pending" || value === "confirmed" || value === "cancelled" ? value : null;
}

/** Resolves the independent discussion contract without changing participation state. */
export async function resolveActionDiscussionAccess(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
  activeRole?: ActiveRole | null,
): Promise<ActionDiscussionAccess> {
  const action = await loadActionById(supabase, actionId);
  if (!action || !isActionDiscussionAvailable(action)) {
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

  const membership = await loadActionDiscussionMembership(
    supabase,
    actionId,
    userId,
    activeRole,
    action,
  );
  if (!membership) {
    return { state: "unavailable", conversationId: null };
  }

  return canViewActionDiscussionForMembership(action, membership)
    ? { state: "allowed", conversationId: conversationResult.data.id }
    : { state: "forbidden", conversationId: conversationResult.data.id };
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

  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
    supabase,
    actionId,
  );
  return canModerateActionConversationForIdentity(identity, action, organizerIds);
}
