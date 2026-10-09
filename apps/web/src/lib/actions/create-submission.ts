import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPostActionRetentionLoop,
  trackActionCreated,
} from "@/lib/gamification/progression";
import { trackNewPlaceVisited } from "@/lib/gamification/progression-tracking";
import type { CreateActionPayload } from "@/lib/actions/types";
import {
  resolveActionOrganizers,
  resolveActionParticipants,
  resolveDefaultActionOrganizerIds,
} from "@/lib/actions/participation/organizers";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";
import { createAction } from "@/lib/actions/store";
import { ActionRouteReconstructionError } from "@/lib/actions/geometry/route-reconstruction-error";
import {
  createSignalement,
  SignalementCreationValidationError,
  type CreatedSignalement,
} from "@/lib/actions/signalement/create-signalement";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
import { logFailure } from "@/lib/logging/failure-log";
import {
  PlannerSnapshotTrustError,
  promoteVerifiedPlannerContext,
} from "@/lib/route/route-planner-trust";

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
  username: string | null;
  email: string | null;
};

export type CreateActionSubmissionParams = {
  supabase: SupabaseClient;
  userId: string;
  payload: CreateActionPayload;
  creator: CreatorIdentity;
  isCreatorGlobalAdmin: boolean;
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

async function createSignalementSubmission(
  params: CreateActionSubmissionParams,
): Promise<Extract<CreateActionSubmissionResult, { kind: "signalement" }>> {
  const payload = params.payload;
  if (payload.locationLabel.trim().length < 2) {
    throw validationError(
      "locationLabel",
      "Le lieu propre doit être renseigné.",
    );
  }

  let signalement: CreatedSignalement;
  try {
    signalement = await createSignalement(params.supabase, {
      userId: params.userId,
      type: payload.recordType === "spot" ? "spot" : "clean_place",
      label: payload.locationLabel,
      latitude: payload.latitude,
      longitude: payload.longitude,
      notes: payload.notes,
      wasteCategories:
        payload.recordType === "spot"
          ? payload.preparationData?.expectedWasteCategories
          : undefined,
      actorName: payload.actorName ?? params.creator.displayName,
      consentGranted: params.consentGranted,
    });
  } catch (error) {
    if (error instanceof SignalementCreationValidationError) {
      throw new ActionCreationValidationError(error.fieldErrors);
    }
    throw error;
  }

  return {
    kind: "signalement",
    id: signalement.id,
    source: "trash_spotter_spots",
    signalement,
  };
}

async function runActionCreationProgressionSideEffects(params: {
  supabase: SupabaseClient;
  userId: string;
  actionId: string;
  locationLabel: string;
}): Promise<void> {
  try {
    await trackActionCreated(params.supabase, {
      userId: params.userId,
      actionId: params.actionId,
    });
  } catch (error) {
    logFailure(
      "Actions/Create",
      "Action creation progression tracking failed",
      error,
      { actionId: params.actionId, userId: params.userId },
    );
  }

  try {
    await trackNewPlaceVisited(params.supabase, {
      userId: params.userId,
      locationLabel: params.locationLabel,
    });
  } catch (error) {
    logFailure(
      "Actions/Create",
      "New place progression tracking failed",
      error,
      { actionId: params.actionId, userId: params.userId },
    );
  }
}

type OrganizerResolution = Awaited<ReturnType<typeof resolveActionOrganizers>>;
type ParticipantResolution = Awaited<ReturnType<typeof resolveActionParticipants>>;

type ResolveActionPartiesParams = {
  supabase: SupabaseClient;
  userId: string;
  payload: CreateActionPayload;
  creator: CreatorIdentity;
  isCreatorGlobalAdmin: boolean;
};

function validateSpontaneousOrganizerSelection(payload: CreateActionPayload) {
  if (payload.organizerType !== "spontaneous" || (payload.organizerAccounts ?? []).length > 0) {
    return;
  }
  const organizerName = payload.organizerName?.trim() ?? "";
  if (organizerName !== SPONTANEOUS_PENDING_ORGANIZER_LABEL) {
    throw validationError(
      "organizerAccounts",
      "Sélectionnez un compte utilisateur comme organisateur ou choisissez « Autre ».",
    );
  }
  if (
    payload.submissionMode !== "quick" &&
    payload.actionPhase !== "pre_action" &&
    payload.actionPhase !== "post_action_draft"
  ) {
    throw validationError(
      "organizerAccounts",
      "Une déclaration finale exige un compte utilisateur organisateur réel.",
    );
  }
}

function resolveOrganizerAccountTokens(
  params: ResolveActionPartiesParams,
  isSpontaneousAction: boolean,
): string[] {
  const providedOrganizerAccounts = params.payload.organizerAccounts ?? [];
  if (providedOrganizerAccounts.length > 0 || isSpontaneousAction) {
    return providedOrganizerAccounts;
  }
  return resolveDefaultActionOrganizerIds({
    creatorUserId: params.userId,
    creatorIsGlobalAdmin: params.isCreatorGlobalAdmin,
  });
}

function buildResolvedActionPayload(
  payload: CreateActionPayload,
  isSpontaneousAction: boolean,
  organizerResolution: OrganizerResolution,
): CreateActionPayload {
  if (!isSpontaneousAction) return payload;
  return {
    ...payload,
    organizerId: null,
    organizerName:
      organizerResolution.organizers[0]?.displayName ??
      (payload.organizerName?.trim() === SPONTANEOUS_PENDING_ORGANIZER_LABEL
        ? SPONTANEOUS_PENDING_ORGANIZER_LABEL
        : ""),
    associationName: "Action spontanée",
  };
}

async function resolveActionParties(params: ResolveActionPartiesParams): Promise<{
  payload: CreateActionPayload;
  organizerResolution: OrganizerResolution;
  participantResolution: ParticipantResolution;
}> {
  const isSpontaneousAction = params.payload.organizerType === "spontaneous";
  validateSpontaneousOrganizerSelection(params.payload);
  const organizerAccounts = resolveOrganizerAccountTokens(params, isSpontaneousAction);
  const organizerResolution = await resolveActionOrganizers({
    supabase: params.supabase,
    creator: params.creator,
    organizerAccounts,
    includeCreatorAsPrimary: false,
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
    participantAccounts: params.payload.participantAccounts,
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

  return {
    payload: buildResolvedActionPayload(params.payload, isSpontaneousAction, organizerResolution),
    organizerResolution,
    participantResolution,
  };
}

async function resolveStandardActionContext(params: {
  supabase: SupabaseClient;
  userId: string;
  payload: CreateActionPayload;
  creator: CreatorIdentity;
  isCreatorGlobalAdmin: boolean;
}): Promise<{
  payload: CreateActionPayload;
  organizerResolution: OrganizerResolution;
  participantResolution: ParticipantResolution;
}> {
  let payload = params.payload;
  if (!payload.organizerType) {
    throw validationError(
      "organizerType",
      "Sélectionnez un type de structure.",
    );
  }

  try {
    payload = promoteVerifiedPlannerContext(payload);
  } catch (error) {
    if (error instanceof PlannerSnapshotTrustError) {
      const message = error.reason === "missing"
        ? "Le snapshot planner doit être accompagné de sa preuve serveur."
        : "Le snapshot planner ne peut pas être vérifié.";
      throw validationError("plannerSnapshotProof", message);
    }
    throw error;
  }

  const { payload: resolvedPayload, organizerResolution, participantResolution } =
    await resolveActionParties({
      supabase: params.supabase,
      userId: params.userId,
      payload,
      creator: params.creator,
      isCreatorGlobalAdmin: params.isCreatorGlobalAdmin,
    });
  return { payload: resolvedPayload, organizerResolution, participantResolution };
}

function resolveOrganizerRequirement(
  payload: CreateActionPayload,
  organizerResolution: OrganizerResolution,
) {
  return payload.organizerType === "spontaneous" && organizerResolution.organizers.length === 0
    ? "optional" as const
    : undefined;
}

async function persistStandardActionSubmission(params: {
  supabase: SupabaseClient;
  userId: string;
  payload: CreateActionPayload;
  organizerResolution: OrganizerResolution;
  participantResolution: ParticipantResolution;
}): Promise<Extract<CreateActionSubmissionResult, { kind: "action" }>> {
  let created: Awaited<ReturnType<typeof createAction>>;
  try {
    created = await createAction(params.supabase, {
      userId: params.userId,
      payload: params.payload,
      organizers: params.organizerResolution.organizers,
      organizerRequirement: resolveOrganizerRequirement(params.payload, params.organizerResolution),
      manualParticipants: params.participantResolution.participants,
      status: "pending",
    });
  } catch (error) {
    if (error instanceof ActionRouteReconstructionError) {
      throw new ActionCreationValidationError(error.fieldErrors);
    }
    throw error;
  }

  try {
    await invalidatePublicSurfaceSnapshotsByRoute(["api/actions", "api/actions/map"]);
  } catch (error) {
    logFailure(
      "Actions/Create",
      "Public action map snapshot invalidation failed",
      error,
      { actionId: created.id },
    );
  }

  await runActionCreationProgressionSideEffects({
    supabase: params.supabase,
    userId: params.userId,
    actionId: created.id,
    locationLabel: params.payload.locationLabel,
  });
  const retentionLoop = await buildPostActionRetentionLoop(
    params.supabase,
    { userId: params.userId, actionId: created.id },
  ).catch((error) => {
    logFailure(
      "Actions/Create",
      "Post-action retention loop failed",
      error,
      { actionId: created.id, userId: params.userId },
    );
    return null;
  });

  return {
    kind: "action",
    id: created.id,
    source: "actions",
    retentionLoop,
  };
}

export async function createActionSubmission(
  params: CreateActionSubmissionParams,
): Promise<CreateActionSubmissionResult> {
  const payload = params.payload;

  if (payload.recordType === "clean_place" || payload.recordType === "spot") {
    return createSignalementSubmission(params);
  }

  const context = await resolveStandardActionContext({
    supabase: params.supabase,
    userId: params.userId,
    payload,
    creator: params.creator,
    isCreatorGlobalAdmin: params.isCreatorGlobalAdmin,
  });
  return persistStandardActionSubmission({
    supabase: params.supabase,
    userId: params.userId,
    payload: context.payload,
    organizerResolution: context.organizerResolution,
    participantResolution: context.participantResolution,
  });
}
