import { copyValidatedSpotToLocalStore } from "@/lib/data/local-sync";
import { emitSpotValidated } from "@/lib/events/emit";
import {
  adminErrorResponse,
  adminSuccessResponse,
} from "@/lib/admin/response";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
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
      details: {
        code: "not_found",
        entityType: payload.entityType,
        stage: "lookup",
        ...(reason ? { reason } : {}),
        previousValue: emptySnapshot,
        newValue: emptySnapshot,
      },
    });

    return adminErrorResponse({
      status: 404,
      code: "not_found",
      message: "Clean place not found",
      hint: "Verifier l'identifiant spot avant de relancer la moderation.",
      operationId,
    });
  }

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
      details: {
        code: "not_found",
        entityType: payload.entityType,
        stage: "update",
        ...(reason ? { reason } : {}),
        previousValue,
        newValue,
      },
    });

    return adminErrorResponse({
      status: 404,
      code: "not_found",
      message: "Clean place not found",
      hint: "Verifier l'identifiant spot avant de relancer la moderation.",
      operationId,
    });
  }

  let copied = false;
  if (payload.status === "validated" || payload.status === "cleaned") {
    setErrorStage("local_sync");
    copied = await copyValidatedSpotToLocalStore(
      supabase,
      payload.id,
      actorUserId,
    );

    setErrorStage("post_update");
    emitSpotValidated({
      spotId: payload.id,
      userId: signalementUpdate.signalement.created_by_clerk_id || "",
      moderatorId: actorUserId,
    });
  }

  setErrorStage("post_update");
  await invalidatePublicSurfaceSnapshotsByRoute([
    "api/actions",
    "api/actions/map",
  ]);

  const updatedSignalement = signalementUpdate.signalement;
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
