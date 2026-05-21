import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import { adminAccessErrorJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getPromotionRequestById,
  listPromotionRequests,
  updatePromotionRequestStatus,
} from "@/lib/admin/promotion-requests-store";

export const runtime = "nodejs";

const reviewSchema = z.object({
  requestId: z.string().trim().min(1),
  action: z.enum(["accept", "reject"]),
});

export async function GET() {
  const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
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
  const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
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
    const updated = await updatePromotionRequestStatus({
      requestId: requestRecord.id,
      status: "rejected",
      reviewedByUserId: identity.userId,
      reviewedByRole: identity.role,
    });
    await appendAdminOperationAudit({
      operationId: `promotion-${requestRecord.id}-${Date.now()}`,
      at: new Date().toISOString(),
      actorUserId: identity.userId,
      operationType: "moderation",
      outcome: "success",
      targetId: requestRecord.id,
      details: {
        entityType: "promotion_request",
        action: "reject",
        requestedRole: requestRecord.requestedRole,
      },
    }).catch(() => undefined);
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
    }).catch((error) => {
      console.warn("Promotion rejection creator notification failed", error);
    });
    return NextResponse.json({
      status: "rejected",
      item: updated,
    });
  }

  const client = await clerkClient();
  const targetUser = await client.users.getUser(requestRecord.submittedByUserId);
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

  await syncClerkUserToSupabase(updatedUser);

  const updated = await updatePromotionRequestStatus({
    requestId: requestRecord.id,
    status: "accepted",
    reviewedByUserId: identity.userId,
    reviewedByRole: identity.role,
  });
  await appendAdminOperationAudit({
    operationId: `promotion-${requestRecord.id}-${Date.now()}`,
    at: new Date().toISOString(),
    actorUserId: identity.userId,
    operationType: "moderation",
    outcome: "success",
    targetId: requestRecord.id,
    details: {
      entityType: "promotion_request",
      action: "accept",
      requestedRole: requestRecord.requestedRole,
    },
  }).catch(() => undefined);

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
  }).catch((error) => {
    console.warn("Promotion acceptance creator notification failed", error);
  });

  return NextResponse.json({
    status: "accepted",
    item: updated,
  });
}
