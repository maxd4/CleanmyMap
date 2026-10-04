import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
} from "@/lib/auth/role-resolution";
import { getCurrentUserActiveRole, getCurrentUserIdentity } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import { adminAccessErrorJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import type { AppProfile } from "@/lib/profiles";
import {
  getPromotionRequestById,
  listPromotionRequests,
  updatePromotionRequestStatus,
} from "@/lib/admin/promotion-requests-store";

export const runtime = "nodejs";

const reviewSchema = z.object({
  requestId: z.string().trim().min(1),
  action: z.enum(["accept", "reject"]),
  reason: z.string().trim().min(5).max(500),
});

type PromotionRequestAuditDetails = {
  operation: "accept_promotion_request" | "reject_promotion_request";
  reason: string;
  targetUserId: string;
  requestedRole: AppProfile;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage?: "clerk_lookup" | "clerk_update" | "supabase_sync" | "request_status_update";
};

function buildPromotionRequestAuditDetails(
  details: PromotionRequestAuditDetails,
): PromotionRequestAuditDetails {
  return details;
}

async function appendPromotionRequestDecisionAudit(params: {
  operationId: string;
  actorUserId: string;
  operationType: "admin_operation" | "role_management";
  outcome: "success" | "error";
  targetId: string;
  details: PromotionRequestAuditDetails;
}): Promise<void> {
  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: params.operationType,
    outcome: params.outcome,
    targetId: params.targetId,
    details: params.details,
  });
}

async function sendPromotionDecisionNotification(params: {
  actorUserId: string;
  requestRecord: PromotionRequestRecord;
  status: "accepted" | "rejected";
}): Promise<void> {
  const accepted = params.status === "accepted";
  await sendCreatorInboxEmail({
    actorUserId: params.actorUserId,
    subject: `[CleanMyMap] Promotion ${accepted ? "acceptée" : "refusée"} - ${params.requestRecord.submittedByDisplayName}`,
    title: accepted ? "Demande de promotion acceptée" : "Demande de promotion refusée",
    intro: accepted
      ? "La demande de promotion a été acceptée et le rôle a été synchronisé."
      : "La demande de promotion a été refusée depuis l'inbox créateur.",
    lines: [
      { label: "Auteur", value: params.requestRecord.submittedByDisplayName },
      { label: "Email", value: params.requestRecord.submittedByEmail ?? "non communiqué" },
      { label: "Source", value: "Formulaire de promotion" },
      { label: "Rôle demandé", value: params.requestRecord.requestedRole },
      { label: "Statut", value: params.status },
    ],
    footer: accepted
      ? "Le profil Clerk et Supabase a été mis à jour."
      : "La décision est synchronisée dans la file de promotion.",
  }).catch(() => {
    console.warn(`Promotion ${params.status} creator notification failed`);
  });
}

type PromotionRequestRecord = NonNullable<Awaited<ReturnType<typeof getPromotionRequestById>>>;
type PromotionIdentity = NonNullable<Awaited<ReturnType<typeof getCurrentUserIdentity>>>;
type PromotionRequestUpdate = Awaited<ReturnType<typeof updatePromotionRequestStatus>>;

function buildPromotionRejectionAuditDetails(params: {
  requestRecord: PromotionRequestRecord;
  reason: string;
  stage?: "request_status_update";
}): PromotionRequestAuditDetails {
  return buildPromotionRequestAuditDetails({
    operation: "reject_promotion_request",
    reason: params.reason,
    targetUserId: params.requestRecord.submittedByUserId,
    requestedRole: params.requestRecord.requestedRole,
    previousValue: { requestStatus: "pending_owner_review" },
    newValue: { requestStatus: "rejected" },
    ...(params.stage ? { stage: params.stage } : {}),
  });
}

type PromotionRejectionResult =
  | { kind: "applied"; item: NonNullable<PromotionRequestUpdate> }
  | { kind: "mutation_failed"; auditAvailable: boolean }
  | { kind: "audit_unavailable" };

async function processPromotionRejection(params: {
  requestRecord: PromotionRequestRecord;
  identity: PromotionIdentity;
  reason: string;
}): Promise<PromotionRejectionResult> {
  const { requestRecord, identity, reason } = params;
  const operationId = randomUUID();

  let updated: PromotionRequestUpdate = null;
  try {
    updated = await updatePromotionRequestStatus({
      requestId: requestRecord.id,
      status: "rejected",
      reviewedByUserId: identity.userId,
      reviewedByRole: identity.activeRole,
    });
    if (!updated) {
      throw new Error("Promotion request status was not persisted.");
    }
  } catch {
    try {
      await appendPromotionRequestDecisionAudit({
        operationId,
        actorUserId: identity.userId,
        operationType: "admin_operation",
        outcome: "error",
        targetId: requestRecord.id,
        details: buildPromotionRejectionAuditDetails({
          requestRecord,
          reason,
          stage: "request_status_update",
        }),
      });
    } catch {
      return { kind: "mutation_failed", auditAvailable: false };
    }
    return { kind: "mutation_failed", auditAvailable: true };
  }

  try {
    await appendPromotionRequestDecisionAudit({
      operationId,
      actorUserId: identity.userId,
      operationType: "admin_operation",
      outcome: "success",
      targetId: requestRecord.id,
      details: buildPromotionRejectionAuditDetails({ requestRecord, reason }),
    });
  } catch {
    return { kind: "audit_unavailable" };
  }

  return { kind: "applied", item: updated };
}

type PromotionAcceptanceResult =
  | { kind: "applied"; item: NonNullable<PromotionRequestUpdate> }
  | { kind: "owner_protected" }
  | { kind: "mutation_failed"; auditAvailable: boolean }
  | { kind: "audit_unavailable" };

type PromotionAcceptanceStage =
  | "clerk_lookup"
  | "clerk_update"
  | "supabase_sync"
  | "request_status_update";

type PromotionAcceptanceMutationResult =
  | { kind: "owner_protected"; previousRole: AppProfile }
  | {
      kind: "applied";
      previousRole: AppProfile;
      item: NonNullable<PromotionRequestUpdate>;
    }
  | { kind: "failed"; previousRole: AppProfile | "unknown"; stage: PromotionAcceptanceStage };

function buildPromotionAcceptanceAuditDetails(params: {
  requestRecord: PromotionRequestRecord;
  reason: string;
  previousRole: AppProfile | "unknown";
  stage?: PromotionAcceptanceStage;
}): PromotionRequestAuditDetails {
  return buildPromotionRequestAuditDetails({
    operation: "accept_promotion_request",
    reason: params.reason,
    targetUserId: params.requestRecord.submittedByUserId,
    requestedRole: params.requestRecord.requestedRole,
    previousValue: {
      role: params.previousRole,
      requestStatus: "pending_owner_review",
    },
    newValue: {
      role: params.requestRecord.requestedRole,
      requestStatus: "accepted",
    },
    ...(params.stage ? { stage: params.stage } : {}),
  });
}

async function performPromotionAcceptanceMutation(params: {
  requestRecord: PromotionRequestRecord;
  identity: PromotionIdentity;
}): Promise<PromotionAcceptanceMutationResult> {
  const { requestRecord, identity } = params;
  let previousRole: AppProfile | "unknown" = "unknown";
  let stage: PromotionAcceptanceStage = "clerk_lookup";

  try {
    const client = await clerkClient();
    const targetUser = await client.users.getUser(requestRecord.submittedByUserId);
    previousRole = resolveCanonicalTargetRole(targetUser);
    if (previousRole === "max") {
      return { kind: "owner_protected", previousRole };
    }

    stage = "clerk_update";
    const updatedUser = await client.users.updateUser(requestRecord.submittedByUserId, {
      publicMetadata: {
        ...(targetUser.publicMetadata as Record<string, unknown>),
        role: requestRecord.requestedRole,
        profile: requestRecord.requestedRole,
      },
      privateMetadata: {
        ...(targetUser.privateMetadata as Record<string, unknown>),
        role: requestRecord.requestedRole,
        profile: requestRecord.requestedRole,
      },
    });

    stage = "supabase_sync";
    const syncedProfile = await syncClerkUserToSupabase(updatedUser);
    if (!syncedProfile) {
      throw new Error("Supabase role synchronization did not persist a profile.");
    }

    stage = "request_status_update";
    const item = await updatePromotionRequestStatus({
      requestId: requestRecord.id,
      status: "accepted",
      reviewedByUserId: identity.userId,
      reviewedByRole: identity.activeRole,
    });
    if (!item) {
      throw new Error("Promotion request status was not persisted.");
    }
    return { kind: "applied", previousRole, item };
  } catch {
    return { kind: "failed", previousRole, stage };
  }
}

async function processPromotionAcceptance(params: {
  requestRecord: PromotionRequestRecord;
  identity: PromotionIdentity;
  reason: string;
}): Promise<PromotionAcceptanceResult> {
  const { requestRecord, identity, reason } = params;
  const operationId = randomUUID();
  const mutation = await performPromotionAcceptanceMutation({ requestRecord, identity });
  if (mutation.kind === "failed") {
    try {
      await appendPromotionRequestDecisionAudit({
        operationId,
        actorUserId: identity.userId,
        operationType: "role_management",
        outcome: "error",
        targetId: requestRecord.id,
        details: buildPromotionAcceptanceAuditDetails({
          requestRecord,
          reason,
          previousRole: mutation.previousRole,
          stage: mutation.stage,
        }),
      });
    } catch {
      return { kind: "mutation_failed", auditAvailable: false };
    }
    return { kind: "mutation_failed", auditAvailable: true };
  }

  if (mutation.kind === "owner_protected") {
    try {
      await appendPromotionRequestDecisionAudit({
        operationId,
        actorUserId: identity.userId,
        operationType: "role_management",
        outcome: "error",
        targetId: requestRecord.id,
        details: buildPromotionAcceptanceAuditDetails({
          requestRecord,
          reason,
          previousRole: mutation.previousRole,
          stage: "clerk_lookup",
        }),
      });
    } catch {
      return { kind: "mutation_failed", auditAvailable: false };
    }
    return { kind: "owner_protected" };
  }

  try {
    await appendPromotionRequestDecisionAudit({
      operationId,
      actorUserId: identity.userId,
      operationType: "role_management",
      outcome: "success",
      targetId: requestRecord.id,
      details: buildPromotionAcceptanceAuditDetails({
        requestRecord,
        reason,
        previousRole: mutation.previousRole,
      }),
    });
  } catch {
    return { kind: "audit_unavailable" };
  }

  return { kind: "applied", item: mutation.item };
}

function resolveCanonicalTargetRole(user: {
  id: string;
  publicMetadata?: Record<string, unknown> | null;
  privateMetadata?: Record<string, unknown> | null;
}): AppProfile {
  return resolveClerkRole({
    user,
    adminUserIds: parseAdminUserIds(env.CLERK_ADMIN_USER_IDS),
    maxUserIds: parseMaxUserIds(env.CLERK_MAX_USER_IDS),
  });
}

export async function GET() {
  const role = await getCurrentUserActiveRole().catch(() => "anonymous");
  if (role !== "max") {
    return adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" });
  }

  const items = await listPromotionRequests(200);
  return NextResponse.json({
    status: "ok",
    count: items.length,
    items,
  });
}

export async function POST(request: Request) {
  // API_AUTHORIZATION_CONTRACT: appendAdminOperationAudit is called by the
  // local decision-audit owner below; the handler keeps its guard visible.
  const role = await getCurrentUserActiveRole().catch(() => "anonymous");
  if (role !== "max") {
    return adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const requestRecord = await getPromotionRequestById(parsed.data.requestId);
  if (!requestRecord) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (requestRecord.status !== "pending_owner_review") {
    return NextResponse.json(
      { error: "Cette demande a déjà été traitée." },
      { status: 409 },
    );
  }

  if (parsed.data.action === "reject") {
    const result = await processPromotionRejection({
      requestRecord,
      identity,
      reason: parsed.data.reason,
    });
    if (result.kind === "mutation_failed") {
      return NextResponse.json(
        {
          error: result.auditAvailable
            ? "Impossible d'enregistrer la décision."
            : "Impossible d'enregistrer la décision et son journal.",
        },
        { status: 500 },
      );
    }
    if (result.kind === "audit_unavailable") {
      return NextResponse.json({ error: "La décision a été enregistrée, mais son journal est indisponible." }, { status: 500 });
    }
    await sendPromotionDecisionNotification({
      actorUserId: identity.userId,
      requestRecord,
      status: "rejected",
    });
    return NextResponse.json({
      status: "rejected",
      item: result.item,
    });
  }

  const result = await processPromotionAcceptance({
    requestRecord,
    identity,
    reason: parsed.data.reason,
  });
  if (result.kind === "owner_protected") {
    return NextResponse.json({ error: "Le compte IMU owner ne peut pas être modifié ici." }, { status: 403 });
  }
  if (result.kind === "mutation_failed") {
    return NextResponse.json(
      {
        error: result.auditAvailable
          ? "Impossible d'appliquer la décision de promotion."
          : "Impossible d'appliquer la décision et son journal.",
      },
      { status: 500 },
    );
  }
  if (result.kind === "audit_unavailable") {
    return NextResponse.json(
      { error: "La décision a été appliquée, mais son journal est indisponible." },
      { status: 500 },
    );
  }

  await sendPromotionDecisionNotification({
    actorUserId: identity.userId,
    requestRecord,
    status: "accepted",
  });

  return NextResponse.json({
    status: "accepted",
    item: result.item,
  });
}
