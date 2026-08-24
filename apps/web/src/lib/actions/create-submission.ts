import type { SupabaseClient } from "@supabase/supabase-js";
import { emitActionCreated } from "@/lib/events/emit";
import { buildPostActionRetentionLoop } from "@/lib/gamification/progression";
import { trackNewPlaceVisited } from "@/lib/gamification/progression-tracking";
import type { CreateActionPayload } from "@/lib/actions/types";
import {
  resolveActionOrganizers,
  resolveActionParticipants,
  resolveDefaultActionOrganizerIds,
} from "@/lib/actions/organizers";
import { createAction, resolveActionCreationStatus } from "@/lib/actions/store";
import {
  createSignalement,
  type CreatedSignalement,
} from "@/lib/actions/create-signalement";
import type { ActionStatus } from "@/lib/actions/types";

export class ActionCreationValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super("Action creation payload could not be resolved.");
    this.name = "ActionCreationValidationError";
  }
}

type CreatorIdentity = {
  userId: string;
  displayName: string;
  handle: string;
  username: string;
  email: string | null;
};

export type CreateActionSubmissionParams = {
  supabase: SupabaseClient;
  userId: string;
  payload: CreateActionPayload;
  creator: CreatorIdentity;
  isCreatorAdminLike: boolean;
  canAutoApproveOwnSubmission: boolean;
  consentGranted: boolean;
};

export type CreateActionSubmissionResult =
  | {
      kind: "signalement";
      id: string;
      source: "trash_spotter_spots";
      signalement: CreatedSignalement;
    }
  | {
      kind: "action";
      id: string;
      source: "actions";
      retentionLoop: Awaited<ReturnType<typeof buildPostActionRetentionLoop>>;
    };

function validationError(field: string, message: string): ActionCreationValidationError {
  return new ActionCreationValidationError({ [field]: [message] });
}

export async function createActionSubmission(
  params: CreateActionSubmissionParams,
): Promise<CreateActionSubmissionResult> {
  const { payload } = params;

  if (payload.recordType === "clean_place" || payload.recordType === "spot") {
    if (payload.locationLabel.trim().length < 2) {
      throw validationError(
        "locationLabel",
        "Le lieu propre doit être renseigné.",
      );
    }

    const signalement = await createSignalement(params.supabase, {
      userId: params.userId,
      type: payload.recordType,
      label: payload.locationLabel,
      latitude: payload.latitude,
      longitude: payload.longitude,
      notes: payload.notes,
      actorName: payload.actorName ?? params.creator.displayName,
      consentGranted: params.consentGranted,
    });

    return {
      kind: "signalement",
      id: signalement.id,
      source: "trash_spotter_spots",
      signalement,
    };
  }

  const isSpontaneousAction = payload.associationName === "Action spontanée";
  const providedOrganizerAccounts = payload.organizerAccounts ?? [];
  const organizerAccounts =
    providedOrganizerAccounts.length > 0
      ? providedOrganizerAccounts
      : !isSpontaneousAction
        ? resolveDefaultActionOrganizerIds({
            creatorUserId: params.userId,
            creatorIsAdminLike: params.isCreatorAdminLike,
          })
        : [];

  const organizerResolution = await resolveActionOrganizers({
    supabase: params.supabase,
    creator: params.creator,
    organizerAccounts,
    includeCreatorAsPrimary: isSpontaneousAction,
  });

  if (organizerResolution.unresolvedTokens.length > 0) {
    throw new ActionCreationValidationError({
      organizerAccounts: [
        `Comptes organisateurs introuvables: ${organizerResolution.unresolvedTokens.join(", ")}`,
      ],
    });
  }

  const participantResolution = await resolveActionParticipants({
    supabase: params.supabase,
    creator: params.creator,
    participantAccounts: payload.participantAccounts,
    organizerIds: organizerResolution.organizers.map(
      (organizer) => organizer.userId,
    ),
  });

  if (participantResolution.unresolvedTokens.length > 0) {
    throw new ActionCreationValidationError({
      participantAccounts: [
        `Comptes participants introuvables: ${participantResolution.unresolvedTokens.join(", ")}`,
      ],
    });
  }

  const status: ActionStatus =
    payload.actionPhase === "post_action_draft"
      ? "pending"
      : params.canAutoApproveOwnSubmission
        ? "approved"
        : resolveActionCreationStatus(params.canAutoApproveOwnSubmission);

  const created = await createAction(params.supabase, {
    userId: params.userId,
    payload,
    organizers: organizerResolution.organizers,
    manualParticipants: participantResolution.participants,
    status,
  });

  emitActionCreated({
    actionId: created.id,
    userId: params.userId,
    locationLabel: payload.locationLabel,
    wasteKg: Number(payload.wasteKg) || 0,
  });

  void trackNewPlaceVisited(params.supabase, {
    userId: params.userId,
    locationLabel: payload.locationLabel,
  }).catch((error) => console.error("trackNewPlaceVisited error", error));

  const retentionLoop = await buildPostActionRetentionLoop(params.supabase, {
    userId: params.userId,
    actionId: created.id,
  }).catch(() => null);

  return {
    kind: "action",
    id: created.id,
    source: "actions",
    retentionLoop,
  };
}
