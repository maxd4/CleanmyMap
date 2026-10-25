import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import {
  isActionRecord,
  runSingleActionQuery,
} from "@/lib/actions/query";
import { buildAdminActionUpdates } from "@/lib/admin/moderation/action-moderation-edits";
import {
  actionNotFoundResponse,
  completeActionModeration,
  type ActionModerationEffectDependencies,
} from "./route.action-effects";
import {
  type ActionEdits,
  type ActionAuditSnapshot,
  type ActionAuditState,
  type ActionImpactValues,
  type ActionModerationOperation,
  type ActionModerationPayload,
  type AppendModerationAuditOnce,
  type ModerationErrorStage,
  type ModerationSupabaseClient,
  hasSensitiveImpactEdit,
} from "./route.shared";

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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type ActionImpactRow = {
  created_by_clerk_id?: string | null;
  waste_kg?: unknown;
  cigarette_butts?: unknown;
  volunteers_count?: unknown;
  duration_minutes?: unknown;
  notes?: string | null;
};

type ActionVisibilityRow = {
  moderation_visibility: "visible" | "hidden" | null;
};

function isActionVisibilityRow(value: unknown): value is ActionVisibilityRow {
  return (
    isActionRecord(value) &&
    (value.moderation_visibility === null ||
      value.moderation_visibility === "visible" ||
      value.moderation_visibility === "hidden")
  );
}

function toActionImpactValues(row: ActionImpactRow): ActionImpactValues {
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

function normalizeImpactValues(row: ActionImpactRow): ActionImpactValues {
  return toActionImpactValues(row);
}

function normalizeActionAuditState(row: ActionImpactRow & {
  status?: unknown;
  moderation_visibility?: unknown;
}): ActionAuditState {
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
    ...toActionImpactValues(row),
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
  if (!state) return null;
  const edits = params.edits;
  return {
    ...state,
    status: params.status,
    moderationVisibility:
      params.moderationVisibility ?? state.moderationVisibility,
    wasteKg: edits?.wasteKg !== undefined ? edits.wasteKg : state.wasteKg,
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
  if (current.error) throw new Error("Database visibility read failed");
  const currentData: unknown = current.data;
  if (currentData === null || currentData === undefined) {
    return { found: false, previousValue: null, newValue: null };
  }
  if (!isActionVisibilityRow(currentData)) {
    throw new Error("Database visibility read returned invalid data");
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
  if (updated.error) throw new Error("Database visibility update failed");
  const updatedData: unknown = updated.data;
  if (updatedData === null || updatedData === undefined) {
    return {
      found: false,
      previousValue: {
        moderationVisibility: currentData.moderation_visibility ?? "visible",
      },
      newValue: null,
    };
  }
  if (!isActionVisibilityRow(updatedData)) {
    throw new Error("Database visibility update returned invalid data");
  }
  return {
    found: true,
    previousValue: {
      moderationVisibility: currentData.moderation_visibility ?? "visible",
    },
    newValue: {
      moderationVisibility: updatedData.moderation_visibility ?? "visible",
    },
  };
}

async function updateActionStatus(
  supabase: ModerationSupabaseClient,
  id: string,
  status: "pending" | "approved" | "rejected",
  edits?: ActionEdits,
): Promise<{
  source: "actions" | "submissions";
  found: boolean;
  revision: string | null;
}> {
  const updates = edits
    ? await buildAdminActionUpdates(supabase, id, status, edits)
    : { status };
  const primary = await supabase
    .from("actions")
    .update(updates)
    .eq("id", id)
    .select("id, updated_at")
    .maybeSingle();
  if (!primary.error && primary.data) {
    return {
      source: "actions",
      found: true,
      revision: typeof primary.data.updated_at === "string" ? primary.data.updated_at : null,
    };
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
  return { source: "submissions", found: Boolean(legacy.data), revision: null };
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
  const isApprovalTransition =
    payload.status === "approved" &&
    previousActionAuditState?.status !== undefined &&
    previousActionAuditState.status !== "unknown" &&
    previousActionAuditState.status !== "approved";
  const isRejectionTransition =
    payload.status === "rejected" &&
    previousActionAuditState?.status !== undefined &&
    previousActionAuditState.status !== "unknown" &&
    previousActionAuditState.status !== "rejected";

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
    return actionNotFoundResponse({
      operationId,
      actorUserId,
      targetId: payload.id,
      entityType: payload.entityType,
      stage: "lookup",
      requiredReasonOperation,
      reason,
      appendAuditOnce,
    });
  }

  const dependencies: ActionModerationEffectDependencies = {
    tryLoadActionAuditState,
    applyExpectedActionAuditChanges,
    toActionAuditSnapshot,
    loadActionImpactValues,
  };
  return completeActionModeration({
    supabase,
    payload,
    operationId,
    actorUserId,
    requiredReasonOperation,
    reason,
    appendAuditOnce,
    setErrorStage,
    previousActionAuditState,
    previousImpactValue,
    shouldRefreshImpact,
    isApprovalTransition,
    isRejectionTransition,
    statusUpdate,
    visibilityUpdate,
    dependencies,
  });
}
