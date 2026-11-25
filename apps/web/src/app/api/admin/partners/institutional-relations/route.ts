import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  adminErrorResponse,
  adminSuccessResponse,
  newOperationId,
} from "@/lib/admin/response";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  addPrivateInstitutionalFact,
  InstitutionalValidationError,
  listPrivateInstitutionalContacts,
  reviewPrivateInstitutionalFact,
  upsertPrivateInstitutionalContact,
} from "@/lib/partners/institutional-relations/relationship-store";

export const runtime = "nodejs";

type InstitutionalAuditOperation =
  | "upsert_institutional_contact"
  | "add_institutional_fact"
  | "review_institutional_fact";

const contactSchema = z.object({
  type: z.literal("contact"),
  id: z.string().trim().min(1).max(120),
  institutionalNodeId: z.string().trim().max(120).nullable().optional(),
  displayName: z.string().trim().min(1).max(160),
  roleLabel: z.string().trim().max(200).nullable().optional(),
  isPubliclyPublishable: z.boolean().optional(),
  revalidationStatus: z.enum(["verifie", "a_revalider", "retire"]).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const factSchema = z.object({
  type: z.literal("fact"),
  contactId: z.string().trim().min(1).max(120),
  kind: z.enum([
    "direct_exchange",
    "outreach",
    "meeting",
    "commitment",
    "followup",
    "note",
    "explicit_support",
    "completed_contribution",
  ]),
  origin: z.enum(["direct", "third_party", "public_source"]),
  evidenceRef: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(1000),
  occurredAt: z.string().trim().max(64).nullable().optional(),
  supportTarget: z.enum(["cleanmymap", "third_party"]).nullable().optional(),
  contributionRole: z.enum(["participation", "organization", "logistics", "coordination"]).nullable().optional(),
  activityKind: z.enum(["cleanmymap_action", "external_event"]).nullable().optional(),
  activityRef: z.string().trim().max(200).nullable().optional(),
});

const postSchema = z.discriminatedUnion("type", [contactSchema, factSchema]);

const patchSchema = z.object({
  factId: z.string().uuid(),
  reviewStatus: z.enum(["verified", "withdrawn"]),
  reason: z.string().trim().min(3).max(500),
});

function buildAuditEntry(params: {
  operationId: string;
  operation: InstitutionalAuditOperation;
  outcome: "success" | "error";
  actorUserId: string;
  targetId?: string;
  details: Record<string, unknown>;
}) {
  return {
    at: new Date().toISOString(),
    operationId: params.operationId,
    operationType: "admin_operation" as const,
    outcome: params.outcome,
    actorUserId: params.actorUserId,
    ...(params.targetId ? { targetId: params.targetId } : {}),
    details: {
      operation: params.operation,
      ...params.details,
    },
  };
}

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }
  const operationId = newOperationId();
  try {
    const result = await listPrivateInstitutionalContacts();
    return adminSuccessResponse({
      operationId,
      payload: { contacts: result.contacts, truncated: result.truncated },
    });
  } catch {
    return adminErrorResponse({
      status: 500,
      operationId,
      code: "server_error",
      message: "Impossible de charger les relations institutionnelles.",
      hint: "Vérifier la configuration Supabase serveur.",
    });
  }
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }
  const operationId = newOperationId();
  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return adminErrorResponse({
      status: 400,
      operationId,
      code: "invalid_payload",
      message: "Invalid institutional relation payload",
      hint: "Vérifier les champs requis du contact ou du fait.",
    });
  }

  const operation: InstitutionalAuditOperation =
    parsed.data.type === "contact" ? "upsert_institutional_contact" : "add_institutional_fact";

  try {
    if (parsed.data.type === "contact") {
      const contact = await upsertPrivateInstitutionalContact(parsed.data);
      const auditRecorded = await appendAdminOperationAudit(
        buildAuditEntry({
          operationId,
          operation,
          outcome: "success",
          actorUserId: access.userId,
          targetId: contact.id,
          details: {
            targetType: "institutional_relationship_contact",
            revalidationStatus: contact.revalidationStatus,
          },
        }),
      ).then(() => true, () => false);
      return adminSuccessResponse({
        operationId,
        status: 201,
        payload: {
          contact,
          auditRecorded,
          ...(auditRecorded ? {} : { auditWarning: "Contact persisté mais échec de journalisation d'audit." }),
        },
      });
    }

    const { fact, deduplicated } = await addPrivateInstitutionalFact({
      ...parsed.data,
      createdBy: access.userId,
    });
    const auditRecorded = await appendAdminOperationAudit(
      buildAuditEntry({
        operationId,
        operation,
        outcome: "success",
        actorUserId: access.userId,
        targetId: fact.id,
        details: {
          targetType: "institutional_relationship_fact",
          contactId: fact.contactId,
          kind: fact.kind,
          origin: fact.origin,
          reviewStatus: fact.reviewStatus,
          deduplicated,
        },
      }),
    ).then(() => true, () => false);
    return adminSuccessResponse({
      operationId,
      status: deduplicated ? 200 : 201,
      payload: {
        fact,
        deduplicated,
        auditRecorded,
        ...(auditRecorded ? {} : { auditWarning: "Fait persisté mais échec de journalisation d'audit." }),
      },
    });
  } catch (error) {
    if (error instanceof InstitutionalValidationError) {
      await appendAdminOperationAudit(
        buildAuditEntry({
          operationId,
          operation,
          outcome: "error",
          actorUserId: access.userId,
          details: { stage: "validation" },
        }),
      ).then(() => true, () => false);
      return adminErrorResponse({
        status: 400,
        operationId,
        code: "invalid_payload",
        message: error.message,
        hint: "Vérifier la cohérence et les références de la preuve.",
      });
    }
    await appendAdminOperationAudit(
      buildAuditEntry({
        operationId,
        operation,
        outcome: "error",
        actorUserId: access.userId,
        details: { stage: "persistence" },
      }),
    ).then(() => true, () => false);
    return adminErrorResponse({
      status: 500,
      operationId,
      code: "server_error",
      message: "Impossible d'enregistrer la relation institutionnelle.",
      hint: "Vérifier la persistance Supabase serveur.",
    });
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }
  const operationId = newOperationId();
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return adminErrorResponse({
      status: 400,
      operationId,
      code: "invalid_payload",
      message: "Invalid institutional fact review payload",
      hint: "Vérifier factId, reviewStatus et reason.",
    });
  }

  try {
    const fact = await reviewPrivateInstitutionalFact({
      factId: parsed.data.factId,
      reviewStatus: parsed.data.reviewStatus,
    });
    const auditRecorded = await appendAdminOperationAudit(
      buildAuditEntry({
        operationId,
        operation: "review_institutional_fact",
        outcome: "success",
        actorUserId: access.userId,
        targetId: fact.id,
        details: {
          targetType: "institutional_relationship_fact",
          reviewStatus: fact.reviewStatus,
          reason: parsed.data.reason,
        },
      }),
    ).then(() => true, () => false);
    return adminSuccessResponse({
      operationId,
      payload: {
        fact,
        auditRecorded,
        ...(auditRecorded ? {} : { auditWarning: "Révision persistée mais échec de journalisation d'audit." }),
      },
    });
  } catch {
    await appendAdminOperationAudit(
      buildAuditEntry({
        operationId,
        operation: "review_institutional_fact",
        outcome: "error",
        actorUserId: access.userId,
        targetId: parsed.data.factId,
        details: { stage: "persistence" },
      }),
    ).then(() => true, () => false);
    return adminErrorResponse({
      status: 500,
      operationId,
      code: "server_error",
      message: "Impossible de réviser le fait institutionnel.",
      hint: "Vérifier la persistance Supabase serveur.",
    });
  }
}
