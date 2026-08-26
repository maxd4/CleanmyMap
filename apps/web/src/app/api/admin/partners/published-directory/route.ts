import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import { appendAdminOperationAudit } from"@/lib/admin/operation-audit";
import {
 adminErrorResponse,
 adminSuccessResponse,
 newOperationId,
} from"@/lib/admin/response";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import {
 getPublishedPartnerAnnuaireEntryById,
updatePublishedPartnerAnnuaireEntryPublicationStatus,
} from"@/lib/partners/published-annuaire-entries-store";
import {
 updatePartnerOnboardingRequestStatus,
} from"@/lib/partners/onboarding-requests-store";
import { sendCreatorInboxEmail } from"@/lib/community/creator-inbox-email";

export const runtime ="nodejs";

const REVIEW_CONFIRM_PHRASE ="CONFIRMER PARTENAIRE";

const reviewPayloadSchema = z.object({
 id: z.string().trim().min(1),
 publicationStatus: z.enum(["accepted","rejected"]),
 reason: z.string().trim().min(5).max(500),
 confirmPhrase: z.string().trim().max(120).optional(),
});

const AUDIT_OPERATION = "review_partner_publication";

type PublicationSnapshot = {
 publicationStatus: string;
 verificationStatus: string;
};

function expectedAfterSnapshot(
 publicationStatus: "accepted" | "rejected",
): PublicationSnapshot {
 return {
 publicationStatus,
 verificationStatus: publicationStatus === "accepted" ? "verifie" : "a_revalider",
 };
}

function auditDetails(params: {
 reason: string;
 sourceRequestId?: string;
 previousValue: PublicationSnapshot;
 newValue: PublicationSnapshot;
 }) {
 return {
 operation: AUDIT_OPERATION,
 reason: params.reason,
 ...(params.sourceRequestId ? { sourceRequestId: params.sourceRequestId } : {}),
 previousValue: params.previousValue,
 newValue: params.newValue,
 };
}

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
 operationType:"admin_operation",
 outcome:"error",
 details: { operation: AUDIT_OPERATION, reason:"invalid_json" },
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
  operationType:"admin_operation",
  outcome:"error",
  details: { operation: AUDIT_OPERATION, reason:"invalid_payload" },
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
  operationType:"admin_operation",
  outcome:"error",
  details: { operation: AUDIT_OPERATION, reason:"confirmation_required" },
 });

 return adminErrorResponse({
 status: 409,
 code:"confirmation_required",
 message:"Explicit confirmation phrase required",
 hint: `Renseigne exactement la phrase: ${REVIEW_CONFIRM_PHRASE}`,
 operationId,
 });
 }

 const expectedAfter = expectedAfterSnapshot(parsed.data.publicationStatus);
 let current;
 try {
 current = await getPublishedPartnerAnnuaireEntryById(parsed.data.id);
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.id,
 details: auditDetails({
 reason: parsed.data.reason,
 previousValue: { publicationStatus:"unknown", verificationStatus:"unknown" },
 newValue: expectedAfter,
 }),
 });
 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message:"La revue partenaire a échoué.",
 hint:"Verifier le stockage local puis relancer l'operation.",
 operationId,
 });
 }

 if (!current) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.id,
 details: auditDetails({
 reason: parsed.data.reason,
 previousValue: { publicationStatus:"unknown", verificationStatus:"unknown" },
 newValue: expectedAfter,
 }),
 });
 return adminErrorResponse({
 status: 404,
 code:"not_found",
 message:"Partner publication not found",
 hint:"Verifier l'identifiant avant de relancer la revue.",
 operationId,
 });
 }

 const previousValue: PublicationSnapshot = {
 publicationStatus: current.publicationStatus,
 verificationStatus: current.verificationStatus,
 };
 const details = auditDetails({
 reason: parsed.data.reason,
 sourceRequestId: current.sourceRequestId,
 previousValue,
 newValue: expectedAfter,
 });

 let updated;
 try {
 updated = await updatePublishedPartnerAnnuaireEntryPublicationStatus({
 entryId: parsed.data.id,
 publicationStatus: parsed.data.publicationStatus,
 reviewedByUserId: access.userId,
 });
 if (!updated) {
 throw new Error("publication_not_found");
 }
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.id,
 details,
 });
 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message:"La revue partenaire a échoué.",
 hint:"Verifier le stockage local puis relancer l'operation.",
 operationId,
 });
 }

 const persistedDetails = auditDetails({
 reason: parsed.data.reason,
 sourceRequestId: updated.sourceRequestId,
 previousValue,
 newValue: {
 publicationStatus: updated.publicationStatus,
 verificationStatus: updated.verificationStatus,
 },
 });

 if (updated.sourceRequestId) {
 try {
 await updatePartnerOnboardingRequestStatus({
 requestId: updated.sourceRequestId,
 status: parsed.data.publicationStatus === "accepted" ? "accepted" : "rejected",
 });
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.id,
 details: persistedDetails,
 });
 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message:"La revue partenaire a échoué.",
 hint:"Verifier la synchronisation puis relancer l'operation.",
 operationId,
 });
 }
 }

 try {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: access.userId,
 operationType:"admin_operation",
 outcome:"success",
 targetId: parsed.data.id,
 details: persistedDetails,
 });
 } catch {
 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message:"La revue partenaire a échoué.",
 hint:"Le journal d'audit est indisponible; la décision doit être vérifiée.",
 operationId,
 });
 }

 await sendCreatorInboxEmail({
 actorUserId: access.userId,
 subject: `[CleanMyMap] Revue partenaire - ${updated.name}`,
 title: "Statut partenaire mis à jour",
 intro: "La revue partenaire a été traitée depuis le back-office.",
 lines: [
 { label: "Fiche", value: updated.name },
 { label: "Identité", value: updated.legalIdentity },
 { label: "Statut", value: updated.publicationStatus },
 { label: "Source request", value: updated.sourceRequestId },
 { label: "Contact interne", value: updated.internalAdminContact?.email ?? "non communiqué" },
 { label: "Updated at", value: updated.reviewedAt ?? "non communiqué" },
 ],
 footer: "La demande source a été synchronisée avec ce statut.",
 }).catch(() => {
 console.warn("Partner publication creator notification failed");
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
}
