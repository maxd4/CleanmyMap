import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import {
 adminErrorResponse,
 adminSuccessResponse,
 newOperationId,
} from"@/lib/admin/response";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { appendAdminOperationAudit } from"@/lib/admin/operation-audit";
import {
 updatePublishedPartnerAnnuaireEntryPublicationStatus,
} from"@/lib/partners/published-annuaire-entries-store";

export const runtime ="nodejs";

const REVIEW_CONFIRM_PHRASE ="CONFIRMER PARTENAIRE";

const reviewPayloadSchema = z.object({
 id: z.string().trim().min(1),
 publicationStatus: z.enum(["accepted","rejected"]),
 confirmPhrase: z.string().trim().max(120).optional(),
});

function isValidReviewConfirmationPhrase(
 value: string | null | undefined,
): boolean {
 return (value ??"").trim().toUpperCase() === REVIEW_CONFIRM_PHRASE;
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
 details: { code:"invalid_json", entityType:"partner_publication" },
 });

 return adminErrorResponse({
 status: 400,
 code:"invalid_json",
 message:"Invalid JSON payload",
 hint:"Verifier le JSON puis relancer la revue.",
 operationId,
 });
 }

 const parsed = reviewPayloadSchema.safeParse(payload);
 if (!parsed.success) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 details: { code:"invalid_payload", entityType:"partner_publication" },
 });

 return adminErrorResponse({
 status: 400,
 code:"invalid_payload",
 message:"Invalid payload",
 hint:"Le payload doit contenir id et publicationStatus=accepted|rejected.",
 operationId,
 details: parsed.error.flatten().fieldErrors,
 });
 }

 if (!isValidReviewConfirmationPhrase(parsed.data.confirmPhrase)) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 details: { code:"confirmation_required", entityType:"partner_publication" },
 });

 return adminErrorResponse({
 status: 409,
 code:"confirmation_required",
 message:"Explicit confirmation phrase required",
 hint: `Renseigne exactement la phrase: ${REVIEW_CONFIRM_PHRASE}`,
 operationId,
 });
 }

 try {
 const updated = await updatePublishedPartnerAnnuaireEntryPublicationStatus({
 entryId: parsed.data.id,
 publicationStatus: parsed.data.publicationStatus,
 reviewedByUserId: access.userId,
 });

 if (!updated) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 targetId: parsed.data.id,
 details: {
 code:"not_found",
 entityType:"partner_publication",
 },
 });

 return adminErrorResponse({
 status: 404,
 code:"not_found",
 message:"Partner publication not found",
 hint:"Verifier l'identifiant avant de relancer la revue.",
 operationId,
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
 entityType:"partner_publication",
 targetStatus: parsed.data.publicationStatus,
 },
 });

 return adminSuccessResponse({
 operationId,
 payload: {
 status:"ok",
 entityType:"partner_publication",
 id: parsed.data.id,
 publicationStatus: parsed.data.publicationStatus,
 },
 });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";

 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"moderation",
 outcome:"error",
 details: { code:"server_error", message, entityType:"partner_publication" },
 });

 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message,
 hint:"Verifier le stockage local puis relancer l'operation.",
 operationId,
 });
 }
}
