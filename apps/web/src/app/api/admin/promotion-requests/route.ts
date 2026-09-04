import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { parseAdminUserIds, resolveClerkRole } from "@/lib/auth/role-resolution";
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

function resolveCanonicalTargetRole(user: {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null; verification?: { status?: string | null } | null } | null;
  publicMetadata?: Record<string, unknown> | null;
  privateMetadata?: Record<string, unknown> | null;
}): AppProfile {
  return resolveClerkRole({
    user,
    adminUserIds: parseAdminUserIds(env.CLERK_ADMIN_USER_IDS),
    ownerUserId: env.CLERK_IMU_OWNER_USER_ID,
    ownerEmail: env.CLERK_IMU_OWNER_EMAIL,
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
    const operationId = randomUUID();
    const buildRejectAuditDetails = (stage?: "request_status_update") => ({
      operation: "reject_promotion_request",
      reason: parsed.data.reason,
      targetUserId: requestRecord.submittedByUserId,
      requestedRole: requestRecord.requestedRole,
      previousValue: { requestStatus: "pending_owner_review" },
      newValue: { requestStatus: "rejected" },
      ...(stage ? { stage } : {}),
    });

    let updated: Awaited<ReturnType<typeof updatePromotionRequestStatus>> = null;
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
        await appendAdminOperationAudit({
          operationId,
          at: new Date().toISOString(),
          actorUserId: identity.userId,
          operationType: "admin_operation",
          outcome: "error",
          targetId: requestRecord.id,
          details: buildRejectAuditDetails("request_status_update"),
        });
      } catch {
        return NextResponse.json(
          { error: "Impossible d'enregistrer la décision et son journal." },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "Impossible d'enregistrer la décision." },
        { status: 500 },
      );
    }

    try {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: identity.userId,
        operationType: "admin_operation",
        outcome: "success",
        targetId: requestRecord.id,
        details: buildRejectAuditDetails(),
      });
    } catch {
      return NextResponse.json(
        { error: "La décision a été enregistrée, mais son journal est indisponible." },
        { status: 500 },
      );
    }
    await sendCreatorInboxEmail({
      actorUserId: identity.userId,
      subject: `[CleanMyMap] Promotion refusée - ${requestRecord.submittedByDisplayName}`,
      title: "Demande de promotion refusée",
      intro: "La demande de promotion a été refusée depuis l'inbox créateur.",
      lines: [
        { label: "Auteur", value: requestRecord.submittedByDisplayName },
        { label: "Email", value: requestRecord.submittedByEmail ?? "non communiqué" },
        { label: "Source", value: "Formulaire de promotion" },
        { label: "Rôle demandé", value: requestRecord.requestedRole },
        { label: "Statut", value: "rejected" },
      ],
      footer: "La décision est synchronisée dans la file de promotion.",
  }).catch(() => {
    console.warn("Promotion rejection creator notification failed");
    });
    return NextResponse.json({
      status: "rejected",
      item: updated,
    });
  }

  const operationId = randomUUID();
  const expectedRole = requestRecord.requestedRole;
  let previousRole: AppProfile | "unknown" = "unknown";
  let stage: "clerk_lookup" | "clerk_update" | "supabase_sync" | "request_status_update" =
    "clerk_lookup";
  const buildAcceptAuditDetails = (includeStage = false) => ({
    operation: "accept_promotion_request",
    reason: parsed.data.reason,
    targetUserId: requestRecord.submittedByUserId,
    requestedRole: requestRecord.requestedRole,
    previousValue: {
      role: previousRole,
      requestStatus: "pending_owner_review",
    },
    newValue: {
      role: expectedRole,
      requestStatus: "accepted",
    },
    ...(includeStage ? { stage } : {}),
  });

  let updated: Awaited<ReturnType<typeof updatePromotionRequestStatus>> = null;
  try {
    stage = "clerk_lookup";
    const client = await clerkClient();
    const targetUser = await client.users.getUser(requestRecord.submittedByUserId);
    previousRole = resolveCanonicalTargetRole(targetUser);

    stage = "clerk_update";
    const updatedUser = await client.users.updateUser(requestRecord.submittedByUserId, {
      publicMetadata: {
        ...(targetUser.publicMetadata as Record<string, unknown>),
        role: expectedRole,
        profile: expectedRole,
      },
      privateMetadata: {
        ...(targetUser.privateMetadata as Record<string, unknown>),
        role: expectedRole,
        profile: expectedRole,
      },
    });

    stage = "supabase_sync";
    const syncedProfile = await syncClerkUserToSupabase(updatedUser);
    if (!syncedProfile) {
      throw new Error("Supabase role synchronization did not persist a profile.");
    }

    stage = "request_status_update";
    updated = await updatePromotionRequestStatus({
      requestId: requestRecord.id,
      status: "accepted",
      reviewedByUserId: identity.userId,
      reviewedByRole: identity.activeRole,
    });
    if (!updated) {
      throw new Error("Promotion request status was not persisted.");
    }
  } catch {
    try {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: identity.userId,
        operationType: "role_management",
        outcome: "error",
        targetId: requestRecord.id,
        details: buildAcceptAuditDetails(true),
      });
    } catch {
      return NextResponse.json(
        { error: "Impossible d'appliquer la décision et son journal." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Impossible d'appliquer la décision de promotion." },
      { status: 500 },
    );
  }

  try {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: identity.userId,
      operationType: "role_management",
      outcome: "success",
      targetId: requestRecord.id,
      details: buildAcceptAuditDetails(),
    });
  } catch {
    return NextResponse.json(
      { error: "La décision a été appliquée, mais son journal est indisponible." },
      { status: 500 },
    );
  }

  await sendCreatorInboxEmail({
    actorUserId: identity.userId,
    subject: `[CleanMyMap] Promotion acceptée - ${requestRecord.submittedByDisplayName}`,
    title: "Demande de promotion acceptée",
    intro: "La demande de promotion a été acceptée et le rôle a été synchronisé.",
    lines: [
      { label: "Auteur", value: requestRecord.submittedByDisplayName },
      { label: "Email", value: requestRecord.submittedByEmail ?? "non communiqué" },
      { label: "Source", value: "Formulaire de promotion" },
      { label: "Rôle demandé", value: requestRecord.requestedRole },
      { label: "Statut", value: "accepted" },
    ],
    footer: "Le profil Clerk et Supabase a été mis à jour.",
  }).catch(() => {
    console.warn("Promotion acceptance creator notification failed");
  });

  return NextResponse.json({
    status: "accepted",
    item: updated,
  });
}
