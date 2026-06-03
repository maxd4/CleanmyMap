import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import { getSupabaseAdminClient, getSupabaseServerClient } from"@/lib/supabase/server";
import {
 actionEditsSchema,
 buildAdminActionUpdates,
 buildAdminCleanPlaceUpdates,
 cleanPlaceEditsSchema,
} from"@/lib/admin/action-moderation-edits";
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

export const runtime ="nodejs";
const MODERATION_CONFIRM_PHRASE ="CONFIRMER MODERATION";

const actionPayloadSchema = z.object({
 entityType: z.literal("action"),
 id: z.string().trim().min(1),
 status: z.enum(["pending","approved","rejected"]),
 confirmPhrase: z.string().trim().max(120).optional(),
 edits: actionEditsSchema,
});

const cleanPlacePayloadSchema = z.object({
 entityType: z.literal("clean_place"),
 id: z.string().trim().min(1),
 status: z.enum(["new","validated","cleaned"]),
 confirmPhrase: z.string().trim().max(120).optional(),
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

 const supabase = getSupabaseAdminClient();

 try {
 if (parsed.data.entityType ==="action") {
 const statusUpdate = await updateActionStatus(
 supabase,
 parsed.data.id,
 parsed.data.status,
 parsed.data.edits,
 );
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

let copied = false;
  if (parsed.data.status ==="approved") {
    const syncResult = await copyValidatedActionToLocalStore(
      supabase,
      parsed.data.id,
      access.userId,
    );
    copied = syncResult.copied;

    const { data: actionDetails } = await supabase
      .from("actions")
      .select("created_by_clerk_id")
      .eq("id", parsed.data.id)
      .single();

    emitActionValidated({
      actionId: parsed.data.id,
      userId: actionDetails?.created_by_clerk_id || "",
      moderatorId: access.userId,
    });
  } else if (parsed.data.status ==="rejected") {
    const { data: actionDetails } = await supabase
      .from("actions")
      .select("created_by_clerk_id")
      .eq("id", parsed.data.id)
      .single();

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
