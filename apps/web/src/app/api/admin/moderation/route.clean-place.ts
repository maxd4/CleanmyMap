import { copyValidatedSpotToLocalStore } from "@/lib/data/local-sync";
import {
  adminErrorResponse,
  adminSuccessResponse,
} from "@/lib/admin/response";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
import { trackSpotValidationBonus } from "@/lib/gamification/progression";
import { logFailure } from "@/lib/logging/failure-log";
import { notifySignalementValidation } from "@/lib/admin/moderation/moderation-notifications";
import {
  moderateSignalement,
  readSignalementForModeration,
} from "@/lib/admin/moderation/signalement-moderation";
import {
  canonicalTargetUserId,
  type AppendModerationAuditOnce,
  type CleanPlaceModerationPayload,
  type ModerationErrorStage,
  type ModerationSupabaseClient,
  toCleanPlaceAuditSnapshot,
} from "./route.shared";

type CleanPlaceHandlerParams = {
  supabase: ModerationSupabaseClient;
  payload: CleanPlaceModerationPayload;
  operationId: string;
  actorUserId: string;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
  setErrorStage: (stage: ModerationErrorStage) => void;
};

type CleanPlaceUpdateResult = Awaited<ReturnType<typeof moderateSignalement>>;

function buildCleanPlaceNotFoundAuditDetails(params: {
  entityType: CleanPlaceModerationPayload["entityType"];
  stage: "lookup" | "update";
  reason: string | null;
  previousValue: ReturnType<typeof toCleanPlaceAuditSnapshot>;
  newValue: ReturnType<typeof toCleanPlaceAuditSnapshot>;
}): Record<string, unknown> {
  return {
    code: "not_found",
    entityType: params.entityType,
    stage: params.stage,
    ...(params.reason ? { reason: params.reason } : {}),
    previousValue: params.previousValue,
    newValue: params.newValue,
  };
}

async function runSignalementValidationSideEffects(
  supabase: ModerationSupabaseClient,
  params: { spotId: string; userId: string | null; actorUserId: string },
): Promise<void> {
  try {
    await trackSpotValidationBonus(supabase, { spotId: params.spotId });
  } catch (error) {
    logFailure(
      "Moderation/Signalement",
      "Signalement validation progression failed",
      error,
      { spotId: params.spotId, actorUserId: params.actorUserId },
    );
  }

  try {
    await notifySignalementValidation(supabase, {
      spotId: params.spotId,
      userId: params.userId,
    });
  } catch (error) {
    logFailure(
      "Moderation/Signalement",
      "Signalement validation notification failed",
      error,
      { spotId: params.spotId },
    );
  }
}

async function updateAndSyncCleanPlace(params: {
  supabase: ModerationSupabaseClient;
  payload: CleanPlaceModerationPayload;
  previousSignalement: NonNullable<Awaited<ReturnType<typeof readSignalementForModeration>>>;
  operationId: string;
  actorUserId: string;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
  setErrorStage: (stage: ModerationErrorStage) => void;
}): Promise<
  | { errorResponse: Response }
  | { signalementUpdate: CleanPlaceUpdateResult; copied: boolean }
> {
  const {
    supabase,
    payload,
    previousSignalement,
    operationId,
    actorUserId,
    reason,
    appendAuditOnce,
    setErrorStage,
  } = params;
  setErrorStage("update");
  const signalementUpdate = await moderateSignalement(supabase, {
    id: payload.id,
    status: payload.status,
    edits: payload.edits,
  });
  if (!signalementUpdate.found || !signalementUpdate.signalement) {
    const previousValue = toCleanPlaceAuditSnapshot(
      previousSignalement,
      previousSignalement,
    );
    const newValue = toCleanPlaceAuditSnapshot(null, previousSignalement);
    await appendAuditOnce({
      operationId,
      at: new Date().toISOString(),
      actorUserId,
      operationType: "moderation",
      outcome: "error",
      targetId: payload.id,
      details: buildCleanPlaceNotFoundAuditDetails({
        entityType: payload.entityType,
        stage: "update",
        reason,
        previousValue,
        newValue,
      }),
    });

    return {
      errorResponse: adminErrorResponse({
        status: 404,
        code: "not_found",
        message: "Clean place not found",
        hint: "Verifier l'identifiant spot avant de relancer la moderation.",
        operationId,
      }),
    };
  }

  let copied = false;
  const isValidationTransition =
    (payload.status === "validated" || payload.status === "cleaned") &&
    previousSignalement.status !== payload.status;
  if (isValidationTransition) {
    setErrorStage("local_sync");
    copied = await copyValidatedSpotToLocalStore(
      supabase,
      payload.id,
      actorUserId,
    );

    setErrorStage("post_update");
    await runSignalementValidationSideEffects(supabase, {
      spotId: payload.id,
      userId: signalementUpdate.signalement.created_by_clerk_id,
      actorUserId,
    });
  }

  return { signalementUpdate, copied };
}

export async function moderateCleanPlace({
  supabase,
  payload,
  operationId,
  actorUserId,
  reason,
  appendAuditOnce,
  setErrorStage,
}: CleanPlaceHandlerParams): Promise<Response> {
  setErrorStage("lookup");
  const previousSignalement = await readSignalementForModeration(
    supabase,
    payload.id,
  );
  if (!previousSignalement) {
    const emptySnapshot = toCleanPlaceAuditSnapshot(null, null);
    await appendAuditOnce({
      operationId,
      at: new Date().toISOString(),
      actorUserId,
      operationType: "moderation",
      outcome: "error",
      targetId: payload.id,
      details: buildCleanPlaceNotFoundAuditDetails({
        entityType: payload.entityType,
        stage: "lookup",
        reason,
        previousValue: emptySnapshot,
        newValue: emptySnapshot,
      }),
    });

    return adminErrorResponse({
      status: 404,
      code: "not_found",
      message: "Clean place not found",
      hint: "Verifier l'identifiant spot avant de relancer la moderation.",
      operationId,
    });
  }

  const updateResult = await updateAndSyncCleanPlace({
    supabase,
    payload,
    previousSignalement,
    operationId,
    actorUserId,
    reason,
    appendAuditOnce,
    setErrorStage,
  });
  if ("errorResponse" in updateResult) return updateResult.errorResponse;

  const { signalementUpdate, copied } = updateResult;

  setErrorStage("post_update");
  await invalidatePublicSurfaceSnapshotsByRoute([
    "api/actions",
    "api/actions/map",
  ]);

  const updatedSignalement = signalementUpdate.signalement!;
  const targetUserId = canonicalTargetUserId(
    previousSignalement.created_by_clerk_id ??
      updatedSignalement.created_by_clerk_id,
  );
  await appendAuditOnce({
    operationId,
    at: new Date().toISOString(),
    actorUserId,
    operationType: "moderation",
    outcome: "success",
    targetId: payload.id,
    details: {
      entityType: payload.entityType,
      ...(targetUserId ? { targetUserId } : {}),
      ...(reason ? { reason } : {}),
      sourceTable: signalementUpdate.sourceTable,
      copiedToLocalValidatedStore: copied,
      previousValue: toCleanPlaceAuditSnapshot(
        previousSignalement,
        updatedSignalement,
      ),
      newValue: toCleanPlaceAuditSnapshot(
        updatedSignalement,
        previousSignalement,
      ),
    },
  });

  return adminSuccessResponse({
    operationId,
    payload: {
      status: "ok",
      entityType: "clean_place",
      id: payload.id,
      sourceTable: signalementUpdate.sourceTable,
      copiedToLocalValidatedStore: copied,
    },
  });
}
