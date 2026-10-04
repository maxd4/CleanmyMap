import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import { appendAdminOperationAudit } from"@/lib/admin/audit/operation-audit";
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

type ReviewErrorStage = "partner_update" | "source_request_sync";

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
 stage?: ReviewErrorStage;
 partialMutation?: boolean;
 }) {
 return {
 operation: AUDIT_OPERATION,
 reason: params.reason,
 ...(params.sourceRequestId ? { sourceRequestId: params.sourceRequestId } : {}),
 previousValue: params.previousValue,
 newValue: params.newValue,
 ...(params.stage ? { stage: params.stage } : {}),
 ...(params.partialMutation === undefined
 ? {}
 : { partialMutation: params.partialMutation }),
 };
}

type PartnerPublicationAuditContext = {
 operationId: string;
 actorUserId: string;
 targetId: string;
 reason: string;
};

async function appendPartnerPublicationAudit(
 context: PartnerPublicationAuditContext,
 params: {
  outcome: "success" | "error";
  sourceRequestId?: string;
  previousValue: PublicationSnapshot;
  newValue: PublicationSnapshot;
  stage?: ReviewErrorStage;
  partialMutation?: boolean;
 },
): Promise<void> {
 await appendAdminOperationAudit({
  operationId: context.operationId,
  at: new Date().toISOString(),
  actorUserId: context.actorUserId,
  operationType:"admin_operation",
  outcome: params.outcome,
  targetId: context.targetId,
  details: auditDetails({
   reason: context.reason,
   sourceRequestId: params.sourceRequestId,
   previousValue: params.previousValue,
   newValue: params.newValue,
   stage: params.stage,
   partialMutation: params.partialMutation,
  }),
 });
}

async function auditAndRespondPartnerReviewInputError(params: {
 operationId: string;
 actorUserId: string;
 reason: "invalid_json" | "invalid_payload" | "confirmation_required";
  response: Omit<Parameters<typeof adminErrorResponse>[0], "operationId">;
}) {
 await appendAdminOperationAudit({
  operationId: params.operationId,
  at: new Date().toISOString(),
  actorUserId: params.actorUserId,
  operationType:"admin_operation",
  outcome:"error",
  details: { operation: AUDIT_OPERATION, reason: params.reason },
 });
 return adminErrorResponse({ ...params.response, operationId: params.operationId });
}

type PublishedPartnerEntry = NonNullable<Awaited<ReturnType<typeof getPublishedPartnerAnnuaireEntryById>>>;
type PublishedPartnerUpdate = Awaited<ReturnType<typeof updatePublishedPartnerAnnuaireEntryPublicationStatus>>;
type PartnerPublicationMutationResult =
 | { kind: "lookup_failed"; expectedAfter: PublicationSnapshot }
 | { kind: "not_found"; expectedAfter: PublicationSnapshot }
 | {
  kind: "update_failed";
  expectedAfter: PublicationSnapshot;
  previousValue: PublicationSnapshot;
  sourceRequestId?: string;
 }
 | {
  kind: "updated";
  previousValue: PublicationSnapshot;
  updated: NonNullable<PublishedPartnerUpdate>;
 };

async function loadAndUpdatePartnerPublication(params: {
 context: PartnerPublicationAuditContext;
 publicationStatus: "accepted" | "rejected";
 expectedAfter: PublicationSnapshot;
}): Promise<PartnerPublicationMutationResult> {
 const { context, publicationStatus, expectedAfter } = params;
 let current: PublishedPartnerEntry | null;
 try {
  current = await getPublishedPartnerAnnuaireEntryById(context.targetId);
 } catch {
  return { kind: "lookup_failed", expectedAfter };
 }
 if (!current) return { kind: "not_found", expectedAfter };

 const previousValue: PublicationSnapshot = {
  publicationStatus: current.publicationStatus,
  verificationStatus: current.verificationStatus,
 };
 let updated: PublishedPartnerUpdate;
 try {
  updated = await updatePublishedPartnerAnnuaireEntryPublicationStatus({
   entryId: context.targetId,
   publicationStatus,
   reviewedByUserId: context.actorUserId,
  });
  if (!updated) throw new Error("publication_not_found");
 } catch {
  return {
   kind: "update_failed",
   expectedAfter,
   previousValue,
   sourceRequestId: current.sourceRequestId,
  };
 }
 return { kind: "updated", previousValue, updated };
}

type PartnerPublicationReviewResult =
 | { kind: "lookup_failed" }
 | { kind: "not_found" }
 | { kind: "partner_update_failed" }
 | { kind: "source_request_sync_failed"; updated: NonNullable<PublishedPartnerUpdate> }
 | { kind: "audit_unavailable"; updated: NonNullable<PublishedPartnerUpdate> }
 | { kind: "applied"; updated: NonNullable<PublishedPartnerUpdate> };

async function sendPartnerPublicationReviewNotification(params: {
 actorUserId: string;
 updated: NonNullable<PublishedPartnerUpdate>;
}): Promise<void> {
 const { updated } = params;
 await sendCreatorInboxEmail({
  actorUserId: params.actorUserId,
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
}

function partnerReviewFailureResponse(
 result: Exclude<PartnerPublicationReviewResult, { kind: "applied" }>,
 operationId: string,
) {
 if (result.kind === "lookup_failed" || result.kind === "partner_update_failed") {
  return adminErrorResponse({
   status: 500,
   code:"server_error",
   message:"La revue partenaire a échoué.",
   hint:"Verifier le stockage local puis relancer l'operation.",
   operationId,
  });
 }
 if (result.kind === "not_found") {
  return adminErrorResponse({
   status: 404,
   code:"not_found",
   message:"Partner publication not found",
   hint:"Verifier l'identifiant avant de relancer la revue.",
   operationId,
  });
 }
 if (result.kind === "source_request_sync_failed") {
  return adminErrorResponse({
   status: 500,
   code:"server_error",
   message:"La revue partenaire a échoué.",
   hint:"Verifier la synchronisation puis relancer l'operation.",
   operationId,
  });
 }
 return adminErrorResponse({
  status: 500,
  code:"server_error",
  message:"La revue partenaire a échoué.",
  hint:"Le journal d'audit est indisponible; la décision doit être vérifiée.",
  operationId,
 });
}

async function processPartnerPublicationReview(params: {
 context: PartnerPublicationAuditContext;
 publicationStatus: "accepted" | "rejected";
}): Promise<PartnerPublicationReviewResult> {
 const { context, publicationStatus } = params;
 const expectedAfter = expectedAfterSnapshot(publicationStatus);
 const mutation = await loadAndUpdatePartnerPublication({
  context,
  publicationStatus,
  expectedAfter,
 });
 if (mutation.kind === "lookup_failed") {
  await appendPartnerPublicationAudit(context, {
   outcome:"error",
   stage:"partner_update",
   partialMutation:false,
   previousValue: { publicationStatus:"unknown", verificationStatus:"unknown" },
   newValue: expectedAfter,
  });
  return { kind: "lookup_failed" };
 }
 if (mutation.kind === "not_found") {
  await appendPartnerPublicationAudit(context, {
   outcome:"error",
   stage:"partner_update",
   partialMutation:false,
   previousValue: { publicationStatus:"unknown", verificationStatus:"unknown" },
   newValue: expectedAfter,
  });
  return { kind: "not_found" };
 }
 if (mutation.kind === "update_failed") {
  await appendPartnerPublicationAudit(context, {
   outcome:"error",
   sourceRequestId: mutation.sourceRequestId,
   previousValue: mutation.previousValue,
   newValue: mutation.expectedAfter,
   stage:"partner_update",
   partialMutation:false,
  });
  return { kind: "partner_update_failed" };
 }

 const { previousValue, updated } = mutation;

 const updatedValue = {
  publicationStatus: updated.publicationStatus,
  verificationStatus: updated.verificationStatus,
 };
 if (updated.sourceRequestId) {
  try {
   await updatePartnerOnboardingRequestStatus({
    requestId: updated.sourceRequestId,
    status: publicationStatus === "accepted" ? "accepted" : "rejected",
   });
  } catch {
   await appendPartnerPublicationAudit(context, {
    outcome:"error",
    sourceRequestId: updated.sourceRequestId,
    previousValue,
    newValue: updatedValue,
    stage:"source_request_sync",
    partialMutation:true,
   });
   return { kind: "source_request_sync_failed", updated };
  }
 }

 try {
  await appendPartnerPublicationAudit(context, {
   outcome:"success",
   sourceRequestId: updated.sourceRequestId,
   previousValue,
   newValue: updatedValue,
  });
 } catch {
  return { kind: "audit_unavailable", updated };
 }

 return { kind: "applied", updated };
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
  return auditAndRespondPartnerReviewInputError({
   operationId,
   actorUserId: access.userId,
   reason:"invalid_payload",
   response: {
    status: 400,
    code:"invalid_payload",
    message:"Invalid payload",
    hint:"Le payload doit contenir id et publicationStatus=accepted|rejected.",
    details: parsed.error.flatten().fieldErrors,
   },
  });
 }

 if (!isValidReviewConfirmationPhrase(parsed.data.confirmPhrase)) {
  return auditAndRespondPartnerReviewInputError({
   operationId,
   actorUserId: access.userId,
   reason:"confirmation_required",
   response: {
    status: 409,
    code:"confirmation_required",
    message:"Explicit confirmation phrase required",
    hint: `Renseigne exactement la phrase: ${REVIEW_CONFIRM_PHRASE}`,
   },
  });
 }

 // API_AUTHORIZATION_CONTRACT: appendAdminOperationAudit is called by the
 // local publication-audit owner below; the handler keeps its admin guard visible.
 const auditContext: PartnerPublicationAuditContext = {
  operationId,
  actorUserId: access.userId,
  targetId: parsed.data.id,
  reason: parsed.data.reason,
 };
 const result = await processPartnerPublicationReview({
  context: auditContext,
  publicationStatus: parsed.data.publicationStatus,
 });
  if (result.kind !== "applied") return partnerReviewFailureResponse(result, operationId);
 const updated = result.updated;

  await sendPartnerPublicationReviewNotification({
   actorUserId: access.userId,
   updated,
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
