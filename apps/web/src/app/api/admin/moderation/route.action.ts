import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { runSingleActionQuery } from "@/lib/actions/query";
import { recordRepollutionPredictionEvaluationForAction } from "@/lib/actions/store";
import {
  buildAdminActionUpdates,
} from "@/lib/admin/moderation/action-moderation-edits";
import { copyValidatedActionToLocalStore } from "@/lib/data/local-sync";
import { emitActionRejected, emitActionValidated } from "@/lib/events/emit";
import {
  refreshProgressionProfile,
  syncUserActionProgression,
} from "@/lib/gamification/progression-tracking";
import {
  adminErrorResponse,
  adminSuccessResponse,
} from "@/lib/admin/response";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
import {
  type ActionEdits,
  type ActionModerationOperation,
  type ActionModerationPayload,
  type AppendModerationAuditOnce,
  type ModerationErrorStage,
  type ModerationSupabaseClient,
  canonicalTargetUserId,
  hasSensitiveImpactEdit,
} from "./route.shared";

type ActionImpactValues = {
  createdByClerkId: string | null;
  wasteKg: number | null;
  cigaretteButts: number | null;
  volunteersCount: number | null;
  durationMinutes: number | null;
  wasteBreakdown: unknown;
};

type ActionAuditState = ActionImpactValues & {
  status: "pending" | "approved" | "rejected" | "unknown";
  moderationVisibility: "visible" | "hidden" | "unknown";
};

type ActionAuditSnapshot = {
  status: ActionAuditState["status"];
  moderationVisibility: ActionAuditState["moderationVisibility"];
  wasteKg: number | null;
  cigaretteButts: number | null;
  volunteersCount: number | null;
  durationMinutes: number | null;
  wasteBreakdownPresent: boolean;
};

type ActionHandlerParams = {
  supabase: ModerationSupabaseClient;
  payload: ActionModerationPayload;
  operationId: string;
  actorUserId: string;
  requiredReasonOperation: ActionModerationOperation | null;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
  setErrorStage: (stage: ModerationErrorStage) => void;
};

function isMissingActionsTableError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("could not find the table") && message.includes("actions")
  );
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeImpactValues(row: {
  created_by_clerk_id?: string | null;
  waste_kg?: unknown;
  cigarette_butts?: unknown;
  volunteers_count?: unknown;
  duration_minutes?: unknown;
  notes?: string | null;
}): ActionImpactValues {
  const metadata = extractActionMetadataFromNotes(row.notes ?? null);
  return {
    createdByClerkId: row.created_by_clerk_id ?? null,
    wasteKg: toNullableNumber(row.waste_kg),
    cigaretteButts: toNullableNumber(row.cigarette_butts),
    volunteersCount: toNullableNumber(row.volunteers_count),
    durationMinutes: toNullableNumber(row.duration_minutes),
    wasteBreakdown: metadata.wasteBreakdown,
  };
}

function normalizeActionAuditState(row: {
  status?: unknown;
  moderation_visibility?: unknown;
  created_by_clerk_id?: string | null;
  waste_kg?: unknown;
  cigarette_butts?: unknown;
  volunteers_count?: unknown;
  duration_minutes?: unknown;
  notes?: string | null;
}): ActionAuditState {
  const metadata = extractActionMetadataFromNotes(row.notes ?? null);
  const status =
    row.status === "pending" ||
    row.status === "approved" ||
    row.status === "rejected"
      ? row.status
      : "unknown";
  const moderationVisibility =
    row.moderation_visibility === "hidden" ||
    row.moderation_visibility === "visible"
      ? row.moderation_visibility
      : "unknown";

  return {
    status,
    moderationVisibility,
    createdByClerkId: row.created_by_clerk_id ?? null,
    wasteKg: toNullableNumber(row.waste_kg),
    cigaretteButts: toNullableNumber(row.cigarette_butts),
    volunteersCount: toNullableNumber(row.volunteers_count),
    durationMinutes: toNullableNumber(row.duration_minutes),
    wasteBreakdown: metadata.wasteBreakdown,
  };
}

async function tryLoadActionAuditState(
  supabase: ModerationSupabaseClient,
  id: string,
): Promise<ActionAuditState | null> {
  try {
    const row = await runSingleActionQuery<{
      status: string | null;
      moderation_visibility: string | null;
      created_by_clerk_id: string | null;
      waste_kg: unknown;
      cigarette_butts: unknown;
      volunteers_count: unknown;
      duration_minutes: unknown;
      notes: string | null;
    }>(supabase, (query) =>
      query
        .select(
          "status, moderation_visibility, created_by_clerk_id, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes",
        )
        .eq("id", id)
        .maybeSingle(),
    );

    return row ? normalizeActionAuditState(row) : null;
  } catch {
    return null;
  }
}

function toActionAuditSnapshot(
  state: ActionAuditState | null,
): ActionAuditSnapshot {
  return {
    status: state?.status ?? "unknown",
    moderationVisibility: state?.moderationVisibility ?? "unknown",
    wasteKg: state?.wasteKg ?? null,
    cigaretteButts: state?.cigaretteButts ?? null,
    volunteersCount: state?.volunteersCount ?? null,
    durationMinutes: state?.durationMinutes ?? null,
    wasteBreakdownPresent: Boolean(
      state?.wasteBreakdown &&
        typeof state.wasteBreakdown === "object" &&
        Object.values(state.wasteBreakdown as Record<string, unknown>).some(
          (value) => value !== undefined && value !== null,
        ),
    ),
  };
}

function applyExpectedActionAuditChanges(
  state: ActionAuditState | null,
  params: {
    status: "pending" | "approved" | "rejected";
    moderationVisibility?: "visible" | "hidden";
    edits?: ActionEdits;
  },
): ActionAuditState | null {
  if (!state) {
    return null;
  }

  const edits = params.edits;
  return {
    ...state,
    status: params.status,
    moderationVisibility:
      params.moderationVisibility ?? state.moderationVisibility,
    wasteKg:
      edits?.wasteKg !== undefined ? edits.wasteKg : state.wasteKg,
    cigaretteButts:
      edits?.cigaretteButts !== undefined
        ? edits.cigaretteButts
        : state.cigaretteButts,
    volunteersCount: edits?.volunteersCount ?? state.volunteersCount,
    durationMinutes: edits?.durationMinutes ?? state.durationMinutes,
    wasteBreakdown:
      edits?.wasteBreakdown !== undefined
        ? edits.wasteBreakdown
        : state.wasteBreakdown,
  };
}

async function loadActionImpactValues(
  supabase: ModerationSupabaseClient,
  id: string,
): Promise<ActionImpactValues | null> {
  const row = await runSingleActionQuery<{
    created_by_clerk_id: string | null;
    waste_kg: unknown;
    cigarette_butts: unknown;
    volunteers_count: unknown;
    duration_minutes: unknown;
    notes: string | null;
  }>(supabase, (query) =>
    query
      .select(
        "created_by_clerk_id, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes",
      )
      .eq("id", id)
      .maybeSingle(),
  );

  return row ? normalizeImpactValues(row) : null;
}

async function refreshImpactDependents(
  supabase: ModerationSupabaseClient,
  params: {
    actionId: string;
    creatorUserId: string | null;
  },
): Promise<string[]> {
  const organizerIds = await loadActionOrganizerIdsForAction(
    supabase,
    params.actionId,
    params.creatorUserId,
  );
  const affectedUserIds = Array.from(
    new Set(organizerIds.map((value) => value.trim()).filter(Boolean)),
  );

  await Promise.all(
    affectedUserIds.map(async (userId) => {
      await syncUserActionProgression(supabase, userId);
      await refreshProgressionProfile(supabase, userId);
    }),
  );
  await invalidatePublicSurfaceSnapshotsByRoute([
    "api/actions",
    "api/actions/map",
  ]);

  return affectedUserIds;
}

async function updateActionModerationVisibility(
  supabase: ModerationSupabaseClient,
  params: {
    id: string;
    visibility: "visible" | "hidden";
    actorUserId: string;
    reason: string;
  },
): Promise<{
  found: boolean;
  previousValue: { moderationVisibility: "visible" | "hidden" } | null;
  newValue: { moderationVisibility: "visible" | "hidden" } | null;
}> {
  const current = await supabase
    .from("actions")
    .select("moderation_visibility, hidden_at, hidden_by_clerk_id, hidden_reason")
    .eq("id", params.id)
    .maybeSingle();

  if (current.error) {
    throw new Error("Database visibility read failed");
  }
  if (!current.data) {
    return { found: false, previousValue: null, newValue: null };
  }

  const now = new Date().toISOString();
  const updates =
    params.visibility === "hidden"
      ? {
          moderation_visibility: "hidden",
          hidden_at: now,
          hidden_by_clerk_id: params.actorUserId,
          hidden_reason: params.reason,
        }
      : {
          moderation_visibility: "visible",
          hidden_at: null,
          hidden_by_clerk_id: null,
          hidden_reason: null,
        };

  const updated = await supabase
    .from("actions")
    .update(updates)
    .eq("id", params.id)
    .select("moderation_visibility, hidden_at, hidden_by_clerk_id, hidden_reason")
    .maybeSingle();
  if (updated.error) {
    throw new Error("Database visibility update failed");
  }

  return {
    found: Boolean(updated.data),
    previousValue: {
      moderationVisibility: current.data.moderation_visibility ?? "visible",
    },
    newValue: updated.data
      ? {
          moderationVisibility: updated.data.moderation_visibility ?? "visible",
        }
      : null,
  };
}

async function updateActionStatus(
  supabase: ModerationSupabaseClient,
  id: string,
  status: "pending" | "approved" | "rejected",
  edits?: ActionEdits,
): Promise<{ source: "actions" | "submissions"; found: boolean }> {
  const updates = edits
    ? await buildAdminActionUpdates(supabase, id, status, edits)
    : { status };
  const primary = await supabase
    .from("actions")
    .update(updates)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (!primary.error && primary.data) {
    return { source: "actions", found: true };
  }
  if (primary.error && !isMissingActionsTableError(primary.error.message)) {
    console.error("[Admin Moderation] Action update failed", {
      id,
      status,
      message: primary.error.message,
    });
    throw new Error("Database update failed");
  }

  const legacy = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (legacy.error) {
    console.error("[Admin Moderation] Legacy action update failed", {
      id,
      status,
      message: legacy.error.message,
    });
    throw new Error("Database update failed");
  }
  return { source: "submissions", found: Boolean(legacy.data) };
}

export async function moderateAction({
  supabase,
  payload,
  operationId,
  actorUserId,
  requiredReasonOperation,
  reason,
  appendAuditOnce,
  setErrorStage,
}: ActionHandlerParams): Promise<Response> {
  setErrorStage("lookup");
  const shouldRefreshImpact = hasSensitiveImpactEdit(payload.edits);
  const previousActionAuditState = await tryLoadActionAuditState(
    supabase,
    payload.id,
  );
  const previousImpactValue = shouldRefreshImpact
    ? await loadActionImpactValues(supabase, payload.id)
    : null;

  setErrorStage("update");
  const statusUpdate = await updateActionStatus(
    supabase,
    payload.id,
    payload.status,
    payload.edits,
  );
  const visibilityUpdate = payload.moderationVisibility
    ? await updateActionModerationVisibility(supabase, {
        id: payload.id,
        visibility: payload.moderationVisibility,
        actorUserId,
        reason: reason ?? "",
      })
    : null;

  if (!statusUpdate.found) {
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
        ...(requiredReasonOperation
          ? { operation: requiredReasonOperation }
          : {}),
        ...(reason ? { reason } : {}),
      },
    });

    return adminErrorResponse({
      status: 404,
      code: "not_found",
      message: "Action not found",
      hint: "Verifier l'identifiant avant de relancer la moderation.",
      operationId,
    });
  }

  setErrorStage("post_update");
  if (payload.status === "approved" && statusUpdate.source === "actions") {
    await recordRepollutionPredictionEvaluationForAction(supabase, payload.id);
  }
  if (visibilityUpdate && !visibilityUpdate.found) {
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
        stage: "post_update",
        operation: requiredReasonOperation,
        ...(reason ? { reason } : {}),
      },
    });

    return adminErrorResponse({
      status: 404,
      code: "not_found",
      message: "Action not found",
      hint: "Verifier l'identifiant avant de relancer la moderation.",
      operationId,
    });
  }

  let copied = false;
  let newImpactValue: ActionImpactValues | null = null;
  let refreshedProgressionUserIds: string[] = [];
  if (shouldRefreshImpact) {
    newImpactValue = await loadActionImpactValues(supabase, payload.id);
    refreshedProgressionUserIds = await refreshImpactDependents(supabase, {
      actionId: payload.id,
      creatorUserId:
        newImpactValue?.createdByClerkId ??
        previousImpactValue?.createdByClerkId ??
        null,
    });
  }
  if (
    payload.status === "approved" &&
    requiredReasonOperation !== "restore_after_sanction"
  ) {
    setErrorStage("local_sync");
    const syncResult = await copyValidatedActionToLocalStore(
      supabase,
      payload.id,
      actorUserId,
    );
    copied = syncResult.copied;

    setErrorStage("post_update");
    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) =>
      query.select("created_by_clerk_id").eq("id", payload.id).maybeSingle(),
    );

    emitActionValidated({
      actionId: payload.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: actorUserId,
    });
  } else if (payload.status === "rejected") {
    setErrorStage("post_update");
    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) =>
      query.select("created_by_clerk_id").eq("id", payload.id).maybeSingle(),
    );

    emitActionRejected({
      actionId: payload.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: actorUserId,
    });
  }

  const loadedNewActionAuditState = await tryLoadActionAuditState(
    supabase,
    payload.id,
  );
  const newActionAuditState =
    loadedNewActionAuditState ??
    applyExpectedActionAuditChanges(previousActionAuditState, {
      status: payload.status,
      moderationVisibility: payload.moderationVisibility,
      edits: payload.edits,
    });

  const targetUserId = canonicalTargetUserId(
    previousActionAuditState?.createdByClerkId ??
      previousImpactValue?.createdByClerkId ??
      newActionAuditState?.createdByClerkId,
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
      targetStatus: payload.status,
      ...(requiredReasonOperation
        ? { operation: requiredReasonOperation }
        : {}),
      ...(reason ? { reason } : {}),
      ...(targetUserId ? { targetUserId } : {}),
      previousValue: toActionAuditSnapshot(previousActionAuditState),
      newValue: toActionAuditSnapshot(newActionAuditState),
      ...(refreshedProgressionUserIds.length > 0
        ? { refreshedProgressionUserIds }
        : {}),
      ...(shouldRefreshImpact
        ? { publicSurfaceSnapshotsInvalidated: true }
        : {}),
      sourceTable: statusUpdate.source,
      copiedToLocalValidatedStore: copied,
    },
  });

  return adminSuccessResponse({
    operationId,
    payload: {
      status: "ok",
      entityType: "action",
      id: payload.id,
      sourceTable: statusUpdate.source,
      copiedToLocalValidatedStore: copied,
    },
  });
}
