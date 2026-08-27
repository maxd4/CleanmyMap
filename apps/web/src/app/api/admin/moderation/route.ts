import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import { getSupabaseAdminClient, getSupabaseServerClient } from"@/lib/supabase/server";
import {
 actionEditsSchema,
 buildAdminActionUpdates,
 cleanPlaceEditsSchema,
} from"@/lib/admin/moderation/action-moderation-edits";
import { extractActionMetadataFromNotes } from"@/lib/actions/metadata";
import {
 copyValidatedActionToLocalStore,
 copyValidatedSpotToLocalStore,
} from"@/lib/data/local-sync";
import { appendAdminOperationAudit } from"@/lib/admin/audit/operation-audit";
import { emitActionRejected, emitActionValidated, emitSpotValidated } from"@/lib/events/emit";
import {
 adminErrorResponse,
 adminSuccessResponse,
 newOperationId,
} from"@/lib/admin/response";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { runSingleActionQuery } from"@/lib/actions/query";
import {
 normalizeModerationReason,
} from"@/lib/actions/moderation-audit";
import { loadActionOrganizerIdsForAction } from"@/lib/actions/participation/organizers";
import {
 refreshProgressionProfile,
 syncUserActionProgression,
} from"@/lib/gamification/progression-tracking";
import { invalidatePublicSurfaceSnapshotsByRoute } from"@/lib/public-surface-snapshots";
import { recordRepollutionPredictionEvaluationForAction } from"@/lib/actions/store";
import {
 moderateSignalement,
 readSignalementForModeration,
 type ModeratableSignalement,
} from"@/lib/admin/moderation/signalement-moderation";

export const runtime ="nodejs";
const MODERATION_CONFIRM_PHRASE ="CONFIRMER MODERATION";

const actionPayloadSchema = z.object({
 entityType: z.literal("action"),
 id: z.string().trim().min(1),
 status: z.enum(["pending","approved","rejected"]),
 moderationVisibility: z.enum(["visible","hidden"]).optional(),
 confirmPhrase: z.string().trim().max(120).optional(),
 reason: z.string().trim().max(500).optional(),
 edits: actionEditsSchema,
});

const cleanPlacePayloadSchema = z.object({
 entityType: z.literal("clean_place"),
 id: z.string().trim().min(1),
 status: z.enum(["new","validated","cleaned"]),
 sourceTable: z.literal("trash_spotter_spots").optional(),
 confirmPhrase: z.string().trim().max(120).optional(),
 reason: z.string().trim().max(500).optional(),
 edits: cleanPlaceEditsSchema,
});

const moderationPayloadSchema = z.union([
 actionPayloadSchema,
 cleanPlacePayloadSchema,
]);

function isMissingActionsTableError(errorMessage: string): boolean {
 const message = errorMessage.toLowerCase();
 return (
 message.includes("could not find the table") && message.includes("actions")
 );
}

function isValidModerationConfirmationPhrase(
 value: string | null | undefined,
): boolean {
 return (value ??"").trim().toUpperCase() === MODERATION_CONFIRM_PHRASE;
}

function hasSensitiveImpactEdit(
 edits: z.infer<typeof actionEditsSchema>,
): boolean {
 if (!edits) {
  return false;
 }

 return [
  "wasteKg",
  "cigaretteButts",
  "volunteersCount",
  "durationMinutes",
  "wasteBreakdown",
 ].some((field) => edits[field as keyof typeof edits] !== undefined);
}

function resolveActionModerationOperation(
 payload: z.infer<typeof actionPayloadSchema>,
): "reject_action" |"hide_action" |"restore_after_sanction" |"correct_impact" | null {
 if (payload.moderationVisibility ==="hidden") {
  return"hide_action";
 }
 if (payload.moderationVisibility ==="visible") {
  return"restore_after_sanction";
 }
 if (payload.status ==="rejected") {
  return"reject_action";
 }
 if (hasSensitiveImpactEdit(payload.edits)) {
  return"correct_impact";
 }
 return null;
}

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

function toNullableNumber(value: unknown): number | null {
 if (typeof value ==="number" && Number.isFinite(value)) {
  return value;
 }
 if (typeof value ==="string" && value.trim().length > 0) {
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
  row.status === "pending" || row.status === "approved" || row.status === "rejected"
   ? row.status
   : "unknown";
 const moderationVisibility =
  row.moderation_visibility === "hidden" || row.moderation_visibility === "visible"
   ? row.moderation_visibility
   : "unknown";
 const wasteBreakdown = metadata.wasteBreakdown;

 return {
  status,
  moderationVisibility,
  createdByClerkId: row.created_by_clerk_id ?? null,
  wasteKg: toNullableNumber(row.waste_kg),
  cigaretteButts: toNullableNumber(row.cigarette_butts),
  volunteersCount: toNullableNumber(row.volunteers_count),
  durationMinutes: toNullableNumber(row.duration_minutes),
  wasteBreakdown,
 };
}

async function tryLoadActionAuditState(
 supabase: ReturnType<typeof getSupabaseServerClient>,
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

function toActionAuditSnapshot(state: ActionAuditState | null): ActionAuditSnapshot {
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
  edits?: z.infer<typeof actionEditsSchema>;
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
  wasteKg: edits?.wasteKg ?? state.wasteKg,
  cigaretteButts: edits?.cigaretteButts ?? state.cigaretteButts,
  volunteersCount: edits?.volunteersCount ?? state.volunteersCount,
  durationMinutes: edits?.durationMinutes ?? state.durationMinutes,
  wasteBreakdown:
   edits?.wasteBreakdown !== undefined
    ? edits.wasteBreakdown
    : state.wasteBreakdown,
 };
}

function canonicalTargetUserId(value: unknown): string | undefined {
 if (typeof value !== "string") {
  return undefined;
 }
 const normalized = value.trim();
 return normalized && normalized !== "unknown" ? normalized : undefined;
}

type ModerationErrorStage = "lookup" | "update" | "post_update" | "local_sync";

type CleanPlaceAuditSnapshot = {
 status: string;
 spotType: string | null;
 labelChanged: boolean;
 coordinatesChanged: boolean;
 notesChanged: boolean;
};

function toCleanPlaceAuditSnapshot(
 signalement: ModeratableSignalement | null,
 comparison: ModeratableSignalement | null,
): CleanPlaceAuditSnapshot {
 return {
  status: signalement?.status ?? "unknown",
  spotType: signalement?.spot_type ?? null,
  labelChanged: Boolean(
   signalement && comparison && signalement.label !== comparison.label,
  ),
  coordinatesChanged: Boolean(
   signalement &&
    comparison &&
    (signalement.latitude !== comparison.latitude ||
     signalement.longitude !== comparison.longitude),
  ),
  notesChanged: Boolean(
   signalement && comparison && signalement.notes !== comparison.notes,
  ),
 };
}

async function loadActionImpactValues(
 supabase: ReturnType<typeof getSupabaseServerClient>,
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
   .select("created_by_clerk_id, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes")
   .eq("id", id)
   .maybeSingle(),
 );

 return row ? normalizeImpactValues(row) : null;
}

async function refreshImpactDependents(
 supabase: ReturnType<typeof getSupabaseServerClient>,
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
 supabase: ReturnType<typeof getSupabaseServerClient>,
 params: {
  id: string;
  visibility: "visible" |"hidden";
  actorUserId: string;
  reason: string;
 },
 ): Promise<{
  found: boolean;
  previousValue: { moderationVisibility: "visible" |"hidden" } | null;
  newValue: { moderationVisibility: "visible" |"hidden" } | null;
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
  params.visibility ==="hidden"
   ? {
    moderation_visibility:"hidden",
    hidden_at: now,
    hidden_by_clerk_id: params.actorUserId,
    hidden_reason: params.reason,
   }
   : {
    moderation_visibility:"visible",
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
    moderationVisibility: current.data.moderation_visibility ??"visible",
   },
   newValue: updated.data
    ? {
     moderationVisibility: updated.data.moderation_visibility ??"visible",
    }
   : null,
 };
}

async function updateActionStatus(
 supabase: ReturnType<typeof getSupabaseServerClient>,
 id: string,
 status:"pending" |"approved" |"rejected",
 edits?: z.infer<typeof actionEditsSchema>,
): Promise<{ source:"actions" |"submissions"; found: boolean }> {
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
  return { source:"actions", found: true };
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
 return { source:"submissions", found: Boolean(legacy.data) };
}

export async function POST(request: Request) {
 const operationId = newOperationId();
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access, operationId);
 }

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 details: { code:"invalid_json" },
 });

 return adminErrorResponse({
 status: 400,
 code:"invalid_json",
 message:"Invalid JSON payload",
 hint:"Verifier le JSON de moderation puis relancer.",
 operationId,
 });
 }

 const parsed = moderationPayloadSchema.safeParse(payload);
 if (!parsed.success) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 details: { code:"invalid_payload" },
 });

 return adminErrorResponse({
 status: 400,
 code:"invalid_payload",
 message:"Invalid payload",
 hint:"Le payload doit cibler une entite action|clean_place avec un statut valide.",
 operationId,
 details: parsed.error.flatten().fieldErrors,
 });
 }

 if (!isValidModerationConfirmationPhrase(parsed.data.confirmPhrase)) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 details: { code:"confirmation_required" },
 });

 return adminErrorResponse({
 status: 409,
 code:"confirmation_required",
 message:"Explicit confirmation phrase required",
 hint: `Renseigne exactement la phrase: ${MODERATION_CONFIRM_PHRASE}`,
 operationId,
 });
 }

 const requiredReasonOperation =
  parsed.data.entityType ==="action"
   ? resolveActionModerationOperation(parsed.data)
   : null;
 const reason = normalizeModerationReason(parsed.data.reason, {
  required: Boolean(requiredReasonOperation),
 });
 if (requiredReasonOperation && !reason) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
 details: {
 code:"reason_required",
 entityType: parsed.data.entityType,
 operation: requiredReasonOperation,
 },
 });

 return adminErrorResponse({
 status: 400,
 code:"reason_required",
 message:"Motif de modération obligatoire.",
 hint:"Renseigne un motif clair d'au moins 5 caractères pour cette opération sensible.",
 operationId,
 });
 }

 const supabase = getSupabaseAdminClient();
 let auditRecorded = false;
 let errorStage: ModerationErrorStage = "lookup";
 const appendAuditOnce = async (
  entry: Parameters<typeof appendAdminOperationAudit>[0],
 ): Promise<void> => {
  if (auditRecorded) {
   return;
  }
  auditRecorded = true;
  await appendAdminOperationAudit(entry);
 };

 try {
 if (parsed.data.entityType ==="action") {
  errorStage = "lookup";
  const shouldRefreshImpact = hasSensitiveImpactEdit(parsed.data.edits);
  const previousActionAuditState = await tryLoadActionAuditState(
   supabase,
   parsed.data.id,
  );
  const previousImpactValue = shouldRefreshImpact
   ? await loadActionImpactValues(supabase, parsed.data.id)
  : null;
  errorStage = "update";
 const statusUpdate = await updateActionStatus(
 supabase,
 parsed.data.id,
 parsed.data.status,
 parsed.data.edits,
 );
 const visibilityUpdate = parsed.data.moderationVisibility
 ? await updateActionModerationVisibility(supabase, {
  id: parsed.data.id,
  visibility: parsed.data.moderationVisibility,
  actorUserId: access.userId,
  reason: reason ?? "",
 })
 : null;
 if (!statusUpdate.found) {
  await appendAuditOnce({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
  details: {
   code:"not_found",
   entityType: parsed.data.entityType,
   stage:"lookup",
   ...(requiredReasonOperation ? { operation: requiredReasonOperation } : {}),
   ...(reason ? { reason } : {}),
  },
 });

 return adminErrorResponse({
 status: 404,
 code:"not_found",
 message:"Action not found",
 hint:"Verifier l'identifiant avant de relancer la moderation.",
 operationId,
 });
 }
  errorStage = "post_update";
  if (parsed.data.status ==="approved" && statusUpdate.source ==="actions") {
  await recordRepollutionPredictionEvaluationForAction(
   supabase,
   parsed.data.id,
  );
 }
 if (visibilityUpdate && !visibilityUpdate.found) {
  await appendAuditOnce({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
  details: {
   code:"not_found",
   entityType: parsed.data.entityType,
   stage:"post_update",
   operation: requiredReasonOperation,
   ...(reason ? { reason } : {}),
  },
 });

 return adminErrorResponse({
 status: 404,
 code:"not_found",
 message:"Action not found",
 hint:"Verifier l'identifiant avant de relancer la moderation.",
 operationId,
 });
 }

 let copied = false;
 let newImpactValue: ActionImpactValues | null = null;
 let refreshedProgressionUserIds: string[] = [];
 if (shouldRefreshImpact) {
  newImpactValue = await loadActionImpactValues(supabase, parsed.data.id);
  refreshedProgressionUserIds = await refreshImpactDependents(supabase, {
   actionId: parsed.data.id,
   creatorUserId:
    newImpactValue?.createdByClerkId ?? previousImpactValue?.createdByClerkId ?? null,
  });
 }
 if (
    parsed.data.status ==="approved" &&
    requiredReasonOperation !== "restore_after_sanction"
  ) {
    errorStage = "local_sync";
    const syncResult = await copyValidatedActionToLocalStore(
      supabase,
      parsed.data.id,
      access.userId,
    );
    copied = syncResult.copied;

    errorStage = "post_update";
    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) => query.select("created_by_clerk_id").eq("id", parsed.data.id).maybeSingle());

    emitActionValidated({
      actionId: parsed.data.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: access.userId,
    });
  } else if (parsed.data.status ==="rejected") {
    errorStage = "post_update";
    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) => query.select("created_by_clerk_id").eq("id", parsed.data.id).maybeSingle());

    emitActionRejected({
      actionId: parsed.data.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: access.userId,
   });
  }

  const loadedNewActionAuditState = await tryLoadActionAuditState(
   supabase,
   parsed.data.id,
  );
  const newActionAuditState =
   loadedNewActionAuditState ??
   applyExpectedActionAuditChanges(previousActionAuditState, {
    status: parsed.data.status,
    moderationVisibility: parsed.data.moderationVisibility,
    edits: parsed.data.edits,
   });
  const targetUserId = canonicalTargetUserId(
   previousActionAuditState?.createdByClerkId ??
    previousImpactValue?.createdByClerkId ??
    newActionAuditState?.createdByClerkId,
  );

 await appendAuditOnce({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"success",
 targetId: parsed.data.id,
 details: {
  entityType: parsed.data.entityType,
  targetStatus: parsed.data.status,
  ...(requiredReasonOperation ? { operation: requiredReasonOperation } : {}),
  ...(reason ? { reason } : {}),
  ...(targetUserId ? { targetUserId } : {}),
  previousValue: toActionAuditSnapshot(previousActionAuditState),
  newValue: toActionAuditSnapshot(newActionAuditState),
  ...(refreshedProgressionUserIds.length > 0
   ? { refreshedProgressionUserIds }
   : {}),
  ...(shouldRefreshImpact ? { publicSurfaceSnapshotsInvalidated: true } : {}),
  sourceTable: statusUpdate.source,
  copiedToLocalValidatedStore: copied,
  },
 });

 return adminSuccessResponse({
 operationId,
 payload: {
 status:"ok",
 entityType:"action",
 id: parsed.data.id,
 sourceTable: statusUpdate.source,
 copiedToLocalValidatedStore: copied,
 },
 });
 }

 errorStage = "lookup";
 const previousSignalement = await readSignalementForModeration(
  supabase,
  parsed.data.id,
 );
 if (!previousSignalement) {
  const emptySnapshot = toCleanPlaceAuditSnapshot(null, null);
  await appendAuditOnce({
   operationId,
   at: new Date().toISOString(),
   actorUserId: access.userId,
   operationType:"moderation",
   outcome:"error",
   targetId: parsed.data.id,
   details: {
    code:"not_found",
    entityType: parsed.data.entityType,
    stage:"lookup",
    ...(reason ? { reason } : {}),
    previousValue: emptySnapshot,
    newValue: emptySnapshot,
   },
  });

  return adminErrorResponse({
   status: 404,
   code:"not_found",
   message:"Clean place not found",
   hint:"Verifier l'identifiant spot avant de relancer la moderation.",
   operationId,
  });
 }

 errorStage = "update";
 const signalementUpdate = await moderateSignalement(supabase, {
   id: parsed.data.id,
   status: parsed.data.status,
   edits: parsed.data.edits,
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
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
 details: {
  code:"not_found",
  entityType: parsed.data.entityType,
  stage:"update",
  ...(reason ? { reason } : {}),
  previousValue,
  newValue,
 },
 });

 return adminErrorResponse({
 status: 404,
 code:"not_found",
 message:"Clean place not found",
 hint:"Verifier l'identifiant spot avant de relancer la moderation.",
 operationId,
 });
 }

let copied = false;
  if (
  parsed.data.status ==="validated" ||
  parsed.data.status ==="cleaned"
  ) {
    errorStage = "local_sync";
    copied = await copyValidatedSpotToLocalStore(
      supabase,
      parsed.data.id,
      access.userId,
    );

    errorStage = "post_update";
    emitSpotValidated({
      spotId: parsed.data.id,
      userId: signalementUpdate.signalement.created_by_clerk_id || "",
      moderatorId: access.userId,
});
  }

  errorStage = "post_update";
  await invalidatePublicSurfaceSnapshotsByRoute([
    "api/actions",
    "api/actions/map",
  ]);

  const updatedSignalement = signalementUpdate.signalement;
  const targetUserId = canonicalTargetUserId(
   previousSignalement.created_by_clerk_id ?? updatedSignalement.created_by_clerk_id,
  );
  await appendAuditOnce({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"success",
 targetId: parsed.data.id,
 details: {
 entityType: parsed.data.entityType,
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
 status:"ok",
 entityType:"clean_place",
 id: parsed.data.id,
 sourceTable: signalementUpdate.sourceTable,
 copiedToLocalValidatedStore: copied,
 },
 });
 } catch {
  console.error("[Admin Moderation] Operation failed", {
   operationId,
   stage: errorStage,
  });

 await appendAuditOnce({
  operationId,
  at: new Date().toISOString(),
  actorUserId: access.userId,
  operationType:"moderation",
  outcome:"error",
  targetId: parsed.data.id,
  details: {
   code:"server_error",
   entityType: parsed.data.entityType,
   stage: errorStage,
   ...(requiredReasonOperation ? { operation: requiredReasonOperation } : {}),
   ...(reason ? { reason } : {}),
  },
 });

 return adminErrorResponse({
  status: 500,
  code:"server_error",
  message:"La modération a échoué.",
  hint:"Verifier la connectivite base de donnees et relancer l'operation.",
  operationId,
 });
 }
}
