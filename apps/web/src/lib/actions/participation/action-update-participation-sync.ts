import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserIdentity } from "@/lib/authz";
import type { ActionUpdateInput } from "../action-update-audit";
import { ActionUpdateValidationError } from "../action-update-persistence";
import { ManualParticipantSyncValidationError } from "./manual-participant-sync";
import {
  loadCanonicalActionOrganizerIdsForAction,
  syncActionManualParticipants,
} from "./organizers";
import { syncActionOrganizers } from "./organizer-sync";

type PostProcessingCreator = {
  userId: string;
  displayName: string;
  handle: string | null;
  username: string | null;
  email: string | null;
};

export async function syncUpdatedOrganizers({
  supabase,
  actionId,
  body,
  userId,
  identity,
}: {
  supabase: SupabaseClient;
  actionId: string;
  body: ActionUpdateInput;
  userId: string;
  identity: UserIdentity | null;
}): Promise<void> {
  if (body.organizerAccounts === undefined) return;

  const organizerResolution = await syncActionOrganizers({
    supabase,
    actionId,
    creator: resolvePostProcessingCreator(userId, identity),
    organizerAccounts: body.organizerAccounts,
  });
  if (organizerResolution.unresolvedTokens.length > 0) {
    throw new ActionUpdateValidationError(
      "organizerAccounts",
      `Comptes organisateurs introuvables: ${organizerResolution.unresolvedTokens.join(", ")}`,
    );
  }
}

export async function syncUpdatedParticipants({
  supabase,
  actionId,
  body,
  userId,
  identity,
  setErrorStage,
}: {
  supabase: SupabaseClient;
  actionId: string;
  body: ActionUpdateInput;
  userId: string;
  identity: UserIdentity | null;
  setErrorStage: (stage: "participant_sync") => void;
}): Promise<void> {
  if (body.participantAccounts === undefined) return;
  setErrorStage("participant_sync");
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  try {
    const resolution = await syncActionManualParticipants({
      supabase,
      actionId,
      creator: resolvePostProcessingCreator(userId, identity),
      participantAccounts: body.participantAccounts,
      organizerIds,
    });
    if (resolution.unresolvedTokens.length > 0) {
      throw new ActionUpdateValidationError(
        "participantAccounts",
        `Comptes participants introuvables: ${resolution.unresolvedTokens.join(", ")}`,
      );
    }
  } catch (error) {
    if (error instanceof ManualParticipantSyncValidationError) {
      throw new ActionUpdateValidationError("participantAccounts", error.message);
    }
    throw error;
  }
}

function resolvePostProcessingCreator(
  userId: string,
  identity: UserIdentity | null,
): PostProcessingCreator {
  const resolvedIdentity = identity ?? {
    displayName: userId,
    handle: userId,
    username: userId,
    email: null,
  };
  return {
    userId,
    displayName: resolvedIdentity.displayName?.trim() || userId,
    handle: resolvedIdentity.handle?.trim() || null,
    username: resolvedIdentity.username?.trim() || null,
    email: resolvedIdentity.email?.trim() || null,
  };
}
