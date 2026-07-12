import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import { getSupabaseAdminClient, getSupabaseServerClient } from"@/lib/supabase/server";
import {
 actionEditsSchema,
 buildAdminActionUpdates,
 buildAdminCleanPlaceUpdates,
 cleanPlaceEditsSchema,
} from"@/lib/admin/action-moderation-edits";
import { extractActionMetadataFromNotes } from"@/lib/actions/metadata";
import {
 copyValidatedActionToLocalStore,
 copyValidatedSpotToLocalStore,
} from"@/lib/data/local-sync";
import { appendAdminOperationAudit } from"@/lib/admin/operation-audit";
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
import { loadActionOrganizerIdsForAction } from"@/lib/actions/organizers";
import {
 refreshProgressionProfile,
 syncUserActionProgression,
} from"@/lib/gamification/progression-tracking";
import { invalidatePublicSurfaceSnapshotsByRoute } from"@/lib/public-surface-snapshots";

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
 previousValue: { moderationVisibility: "visible" |"hidden"; hiddenAt: string | null; hiddenByClerkId: string | null; hiddenReason: string | null } | null;
 newValue: { moderationVisibility: "visible" |"hidden"; hiddenAt: string | null; hiddenByClerkId: string | null; hiddenReason: string | null } | null;
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
   hiddenAt: current.data.hidden_at ?? null,
   hiddenByClerkId: current.data.hidden_by_clerk_id ?? null,
   hiddenReason: current.data.hidden_reason ?? null,
  },
  newValue: updated.data
   ? {
    moderationVisibility: updated.data.moderation_visibility ??"visible",
    hiddenAt: updated.data.hidden_at ?? null,
    hiddenByClerkId: updated.data.hidden_by_clerk_id ?? null,
    hiddenReason: updated.data.hidden_reason ?? null,
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

async function updateSpotStatus(
 supabase: ReturnType<typeof getSupabaseServerClient>,
 id: string,
 status:"new" |"validated" |"cleaned",
 edits?: z.infer<typeof cleanPlaceEditsSchema>,
): Promise<boolean> {
 const updated = await supabase
 .from("spots")
 .update(buildAdminCleanPlaceUpdates(status, edits))
 .eq("id", id)
 .select("id")
 .maybeSingle();
 if (updated.error) {
  console.error("[Admin Moderation] Spot update failed", {
   id,
   status,
   message: updated.error.message,
  });
  throw new Error("Database update failed");
 }
 return Boolean(updated.data);
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

 try {
 if (parsed.data.entityType ==="action") {
 const shouldRefreshImpact = hasSensitiveImpactEdit(parsed.data.edits);
 const previousImpactValue = shouldRefreshImpact
 ? await loadActionImpactValues(supabase, parsed.data.id)
 : null;
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
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
 details: { code:"not_found", entityType: parsed.data.entityType },
 });

 return adminErrorResponse({
 status: 404,
 code:"not_found",
 message:"Action not found",
 hint:"Verifier l'identifiant avant de relancer la moderation.",
 operationId,
 });
 }
 if (visibilityUpdate && !visibilityUpdate.found) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
 details: {
  code:"not_found",
  entityType: parsed.data.entityType,
  operation: requiredReasonOperation,
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
    const syncResult = await copyValidatedActionToLocalStore(
      supabase,
      parsed.data.id,
      access.userId,
    );
    copied = syncResult.copied;

    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) => query.select("created_by_clerk_id").eq("id", parsed.data.id).maybeSingle());

    emitActionValidated({
      actionId: parsed.data.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: access.userId,
    });
  } else if (parsed.data.status ==="rejected") {
    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) => query.select("created_by_clerk_id").eq("id", parsed.data.id).maybeSingle());

    emitActionRejected({
      actionId: parsed.data.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: access.userId,
    });
  }

 await appendAdminOperationAudit({
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
 ...(parsed.data.moderationVisibility
  ? { moderationVisibility: parsed.data.moderationVisibility }
  : {}),
 ...(visibilityUpdate?.previousValue
  ? { previousValue: visibilityUpdate.previousValue }
  : {}),
 ...(previousImpactValue ? { previousValue: previousImpactValue } : {}),
 ...(visibilityUpdate?.newValue ? { newValue: visibilityUpdate.newValue } : {}),
 ...(newImpactValue ? { newValue: newImpactValue } : {}),
 ...(refreshedProgressionUserIds.length > 0
  ? { refreshedProgressionUserIds }
  : {}),
 ...(shouldRefreshImpact ? { publicSurfaceSnapshotsInvalidated: true } : {}),
 sourceTable: statusUpdate.source,
 copiedToLocalValidatedStore: copied,
 editedFields: parsed.data.edits ? Object.keys(parsed.data.edits) : [],
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

 const updated = await updateSpotStatus(
 supabase,
 parsed.data.id,
 parsed.data.status,
 parsed.data.edits,
 );
 if (!updated) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
 details: { code:"not_found", entityType: parsed.data.entityType },
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
    copied = await copyValidatedSpotToLocalStore(
      supabase,
      parsed.data.id,
      access.userId,
    );

    const { data: spotDetails } = await supabase
      .from("spots")
      .select("created_by_clerk_id")
      .eq("id", parsed.data.id)
      .single();

    emitSpotValidated({
      spotId: parsed.data.id,
      userId: spotDetails?.created_by_clerk_id || "",
      moderatorId: access.userId,
});
  }

  await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"success",
 targetId: parsed.data.id,
 details: {
 entityType: parsed.data.entityType,
 targetStatus: parsed.data.status,
 ...(reason ? { reason } : {}),
 sourceTable:"spots",
 copiedToLocalValidatedStore: copied,
 editedFields: parsed.data.edits ? Object.keys(parsed.data.edits) : [],
 },
 });

 return adminSuccessResponse({
 operationId,
 payload: {
 status:"ok",
 entityType:"clean_place",
 id: parsed.data.id,
 sourceTable:"spots",
 copiedToLocalValidatedStore: copied,
 },
 });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";
 console.error("[Admin Moderation] Operation failed", {
  operationId,
  message,
 });

 await appendAdminOperationAudit({
  operationId,
  at: new Date().toISOString(),
  actorUserId: access.userId,
  operationType:"moderation",
  outcome:"error",
  details: { code:"server_error" },
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
