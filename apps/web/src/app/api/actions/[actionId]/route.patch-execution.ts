import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import {
  ActionUpdateValidationError,
  persistActionUpdate,
} from "@/lib/actions/action-update-persistence";
import { buildActionAuditSnapshots } from "@/lib/actions/action-update-audit";
import {
  runActionUpdatePostProcessing,
  type AdminOverrideErrorStage,
} from "@/lib/actions/action-update-post-processing";
import { syncUpdatedOrganizers } from "@/lib/actions/participation/action-update-participation-sync";
import {
  emitPublishedActionUpdateIfNeeded,
} from "@/lib/actions/action-change-notifications";
import {
  emitAdministrativeRequirementNotificationsIfNeeded,
} from "@/lib/actions/administrative-requirement-notifications";
import {
  captureActionUpdateParticipantImpactSnapshot,
} from "@/lib/actions/action-participant-impact-notifications";
import {
  ensureGpxGeometryContributionEligible,
  hasGpxGeometryContribution,
  recordGpxGeometryContributionIfPresent,
  reconcileGeometryContributionProgressionIfNeeded,
  stripObservedGeometryProjectionFields,
} from "@/lib/actions/geometry/action-geometry-contribution-workflow";
import { shouldSyncOrganizersBeforeFinalization, type PreparedPatchMutation } from "./route.patch-preparation";
import type { EditableAction } from "./route.types";

const PATCH_ATOMICITY = "PARTIAL_ALLOWED" as const;

export type PatchExecutionState = {
  auditSnapshots: ReturnType<typeof buildActionAuditSnapshots> | null;
  actionWriteSucceeded: boolean;
  persistedActionRevision: string | null;
  contributionPersisted: boolean;
  adminErrorStage: AdminOverrideErrorStage;
};

type PreparedActionUpdate = PreparedPatchMutation["preparedUpdate"];
type AppendAdminAuditOnce = (
  params: Parameters<typeof appendActionModerationAudit>[0],
) => Promise<void>;

function recordActionWriteState(
  state: PatchExecutionState,
  actionWrite: Awaited<ReturnType<typeof persistActionUpdate>>,
) {
  state.actionWriteSucceeded = actionWrite.succeeded;
  state.persistedActionRevision = actionWrite.revision;
}

async function persistScalarActionUpdate({
  supabase,
  actionId,
  userId,
  current,
  updateData,
  state,
}: {
  supabase: Parameters<typeof persistActionUpdate>[0]["supabase"];
  actionId: string;
  userId: string;
  current: EditableAction;
  updateData: Record<string, unknown>;
  state: PatchExecutionState;
}) {
  const actionWrite = await persistActionUpdate({ supabase, actionId, updateData });
  recordActionWriteState(state, actionWrite);
  await emitPublishedActionUpdateIfNeeded({
    supabase,
    actionId,
    actorUserId: userId,
    current,
    updateData,
    actionWriteSucceeded: state.actionWriteSucceeded,
    persistedActionRevision: state.persistedActionRevision,
  });
  await emitAdministrativeRequirementNotificationsIfNeeded({
    supabase,
    actionId,
    current,
    updateData,
    actionWriteSucceeded: state.actionWriteSucceeded,
  });
}

async function persistGeometryContribution({
  supabase,
  actionId,
  userId,
  updateData,
  state,
}: {
  supabase: Parameters<typeof recordGpxGeometryContributionIfPresent>[0]["supabase"];
  actionId: string;
  userId: string;
  updateData: Parameters<typeof recordGpxGeometryContributionIfPresent>[0]["updateData"];
  state: PatchExecutionState;
}): Promise<Response | boolean> {
  const contribution = await recordGpxGeometryContributionIfPresent({
    supabase,
    actionId,
    userId,
    updateData,
  });
  if (contribution instanceof Response) return contribution;
  if (contribution) state.contributionPersisted ||= contribution.persisted;
  return contribution?.accepted ?? false;
}

async function runPreparedActionPostProcessing({
  state,
  ...params
}: Omit<Parameters<typeof runActionUpdatePostProcessing>[0], "setErrorStage" | "auditSnapshots"> & {
  state: PatchExecutionState;
}) {
  await runActionUpdatePostProcessing({
    ...params,
    auditSnapshots: state.auditSnapshots,
    setErrorStage: (stage) => {
      state.adminErrorStage = stage;
    },
  });
}

type PreparedActionExecution = {
  scalarUpdateData: Record<string, unknown>;
  hasGeometryContribution: boolean;
  previousImpactSnapshot: Awaited<ReturnType<typeof captureActionUpdateParticipantImpactSnapshot>>;
  organizersAlreadySynced: boolean;
};

async function prepareActionExecution({
  supabase,
  actionId,
  userId,
  current,
  body,
  updateData,
  identity,
}: {
  supabase: Parameters<typeof ensureGpxGeometryContributionEligible>[0]["supabase"];
  actionId: string;
  userId: string;
  current: EditableAction;
  body: PreparedActionUpdate["body"];
  updateData: Record<string, unknown>;
  identity: Parameters<typeof syncUpdatedOrganizers>[0]["identity"];
}): Promise<PreparedActionExecution | Response> {
  const hasGeometryContribution = hasGpxGeometryContribution(updateData);
  const eligibilityResponse = await ensureGpxGeometryContributionEligible({
    supabase,
    actionId,
    userId,
    updateData,
  });
  if (eligibilityResponse) return eligibilityResponse;

  const scalarUpdateData = hasGeometryContribution
    ? stripObservedGeometryProjectionFields(updateData)
    : updateData;
  const previousImpactSnapshot = await captureActionUpdateParticipantImpactSnapshot({
    supabase,
    actionId,
    current,
    body,
  });
  const organizersAlreadySynced = shouldSyncOrganizersBeforeFinalization({
    body,
    current,
    updateData: scalarUpdateData,
  });
  if (organizersAlreadySynced) {
    await syncUpdatedOrganizers({ supabase, actionId, body, userId, identity });
  }

  return {
    scalarUpdateData,
    hasGeometryContribution,
    previousImpactSnapshot,
    organizersAlreadySynced,
  };
}

async function persistPreparedActionExecution({
  supabase,
  actionId,
  userId,
  current,
  updateData,
  hasGeometryContribution,
  state,
}: {
  supabase: Parameters<typeof ensureGpxGeometryContributionEligible>[0]["supabase"];
  actionId: string;
  userId: string;
  current: EditableAction;
  updateData: Record<string, unknown>;
  hasGeometryContribution: boolean;
  state: PatchExecutionState;
}): Promise<Response | boolean> {
  state.adminErrorStage = "action_update";
  await persistScalarActionUpdate({
    supabase,
    actionId,
    userId,
    current,
    updateData,
    state,
  });

  state.adminErrorStage = hasGeometryContribution
    ? "geometry_contribution"
    : state.adminErrorStage;
  const geometryAccepted = hasGeometryContribution
    ? await persistGeometryContribution({
      supabase,
      actionId,
      userId,
      updateData,
      state,
    })
    : false;
  if (geometryAccepted instanceof Response) return geometryAccepted;
  return geometryAccepted;
}

async function finalizePreparedActionExecution({
  state,
  supabase,
  actionId,
  userId,
  updateData,
  body,
  identity,
  shouldAuditModeration,
  previousImpactSnapshot,
  adminAuditActorUserId,
  adminAuditTargetUserId,
  moderationOperation,
  moderationReason,
  organizersAlreadySynced,
  appendAdminAuditOnce,
  geometryAccepted,
}: {
  state: PatchExecutionState;
  supabase: Parameters<typeof ensureGpxGeometryContributionEligible>[0]["supabase"];
  actionId: string;
  userId: string;
  updateData: Record<string, unknown>;
  body: PreparedActionUpdate["body"];
  identity: Parameters<typeof syncUpdatedOrganizers>[0]["identity"];
  shouldAuditModeration: boolean;
  previousImpactSnapshot: Awaited<ReturnType<typeof captureActionUpdateParticipantImpactSnapshot>>;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  organizersAlreadySynced: boolean;
  appendAdminAuditOnce: AppendAdminAuditOnce;
  geometryAccepted: boolean;
}): Promise<void> {
  await reconcileGeometryContributionProgressionIfNeeded({
    accepted: geometryAccepted,
    supabase,
    actionId,
    userId,
  });
  await runPreparedActionPostProcessing({
    state,
    supabase,
    actionId,
    updateData,
    body,
    userId,
    identity,
    shouldAuditModeration,
    previousImpactSnapshot,
    persistedActionRevision: state.persistedActionRevision,
    adminAuditActorUserId,
    adminAuditTargetUserId,
    moderationOperation,
    moderationReason,
    organizersAlreadySynced,
    appendAdminAuditOnce,
  });
}

export async function executePreparedActionUpdate({
  supabase,
  actionId,
  userId,
  current,
  identity,
  preparedUpdate,
  shouldAuditModeration,
  adminAuditActorUserId,
  adminAuditTargetUserId,
  moderationOperation,
  moderationReason,
  appendAdminAuditOnce,
  state,
}: {
  supabase: Parameters<typeof ensureGpxGeometryContributionEligible>[0]["supabase"];
  actionId: string;
  userId: string;
  current: EditableAction;
  identity: Parameters<typeof syncUpdatedOrganizers>[0]["identity"];
  preparedUpdate: PreparedActionUpdate;
  shouldAuditModeration: boolean;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  appendAdminAuditOnce: AppendAdminAuditOnce;
  state: PatchExecutionState;
}): Promise<Response | PreparedActionUpdate["body"]> {
  const { body, currentMetadata, updateData } = preparedUpdate;
  state.auditSnapshots = shouldAuditModeration
    ? buildActionAuditSnapshots(current, body, currentMetadata)
    : null;
  const execution = await prepareActionExecution({
    supabase,
    actionId,
    userId,
    current,
    body,
    updateData,
    identity,
  });
  if (execution instanceof Response) return execution;

  const geometryAccepted = await persistPreparedActionExecution({
    supabase,
    actionId,
    userId,
    current,
    updateData: execution.scalarUpdateData,
    hasGeometryContribution: execution.hasGeometryContribution,
    state,
  });
  if (geometryAccepted instanceof Response) return geometryAccepted;
  await finalizePreparedActionExecution({
    state,
    supabase,
    actionId,
    userId,
    updateData: execution.scalarUpdateData,
    body,
    identity,
    shouldAuditModeration,
    previousImpactSnapshot: execution.previousImpactSnapshot,
    adminAuditActorUserId,
    adminAuditTargetUserId,
    moderationOperation,
    moderationReason,
    organizersAlreadySynced: execution.organizersAlreadySynced,
    appendAdminAuditOnce,
    geometryAccepted,
  });
  return body;
}

function hasPartialMutation(
  state: Pick<PatchExecutionState, "actionWriteSucceeded" | "contributionPersisted">,
): boolean {
  return state.actionWriteSucceeded || state.contributionPersisted;
}

export async function handlePatchError({
  error,
  shouldAuditModeration,
  auditSnapshots,
  appendAdminAuditOnce,
  adminAuditActorUserId,
  adminAuditTargetUserId,
  moderationOperation,
  moderationReason,
  adminErrorStage,
  state,
  actionId,
}: {
  error: unknown;
  shouldAuditModeration: boolean;
  auditSnapshots: ReturnType<typeof buildActionAuditSnapshots> | null;
  appendAdminAuditOnce: AppendAdminAuditOnce;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  adminErrorStage: AdminOverrideErrorStage;
  state: Pick<PatchExecutionState, "actionWriteSucceeded" | "contributionPersisted">;
  actionId: string;
}): Promise<Response> {
  if (error instanceof ActionUpdateValidationError) {
    return validationErrorResponse({ [error.field]: [error.message] });
  }
  if (shouldAuditModeration && auditSnapshots) {
    await appendAdminAuditOnce({
      operationId: `action-edit-${actionId}-${Date.now()}`,
      actorUserId: adminAuditActorUserId,
      targetActionId: actionId,
      operation: moderationOperation,
      outcome: "error",
      reason: moderationReason,
      targetUserId: adminAuditTargetUserId,
      previousValue: auditSnapshots.previousValue,
      newValue: auditSnapshots.newValue,
      details: {
        stage: adminErrorStage,
        atomicity: PATCH_ATOMICITY,
        partialMutation: hasPartialMutation(state),
      },
    });
  }
  return handleApiError(error, "PATCH /api/actions/:actionId");
}
