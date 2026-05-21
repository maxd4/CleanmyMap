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

 if (updated.sourceRequestId) {
    await updatePartnerOnboardingRequestStatus({
      requestId: updated.sourceRequestId,
      status: parsed.data.publicationStatus === "accepted" ? "accepted" : "rejected",
    }).catch((error) => {
      console.warn("Partner onboarding request status sync failed", error);
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
  }).catch(() => undefined);

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
  }).catch((error) => {
    console.warn("Partner publication creator notification failed", error);
  });

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
