import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  appendPromotionRequest,
  listPromotionRequestsForUser,
} from "@/lib/admin/promotion-requests-store";
import { canRequestPromotionRole } from "@/lib/account/promotion-request-contract";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import {
  parseJsonBodyWithSchema,
  rejectPublicFormAbuse,
} from "@/lib/security/validation";

export const runtime = "nodejs";

const payloadSchema = z.object({
  requestedRole: z.enum(["elu", "admin"]),
  motivation: z.string().trim().min(10).max(1200),
  honeypot: z.string().optional().default(""),
  submittedAt: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 3, window: 300 });
  if (rateLimitResponse) return rateLimitResponse;

  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return unauthorizedJsonResponse();
  }

  const currentRole = await getCurrentUserRoleLabel();
  if (currentRole === "admin" || currentRole === "max") {
    return NextResponse.json(
      {
        error: "Ce compte a déjà un niveau élevé. La promotion n'est pas nécessaire.",
      },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBodyWithSchema(request, payloadSchema);
  if (!parsed.ok) return parsed.response;

  const abuseResponse = rejectPublicFormAbuse(parsed.data);
  if (abuseResponse) return abuseResponse;

  if (!canRequestPromotionRole(identity.role, parsed.data.requestedRole)) {
    return NextResponse.json(
      {
        error: "Ce rôle ne peut pas être demandé depuis votre niveau actuel.",
      },
      { status: 403 },
    );
  }

  const ownRequests = await listPromotionRequestsForUser(userId, 50);
  const latestRequest = ownRequests[0];
  if (latestRequest?.status === "pending_owner_review") {
    return NextResponse.json(
      {
        error: "Demande en cours d'examen.",
        code: "pending_owner_review",
      },
      { status: 409 },
    );
  }
  if (latestRequest?.status === "accepted" && latestRequest.requestedRole !== identity.role) {
    return NextResponse.json(
      {
        error: "La synchronisation de votre niveau est encore en cours.",
        code: "accepted_sync_pending",
      },
      { status: 409 },
    );
  }

  const created = await appendPromotionRequest({
    submittedByUserId: userId,
    input: {
      submittedByDisplayName: identity.displayName,
      submittedByEmail: identity.email,
      submittedByRole: identity.role,
      requestedRole: parsed.data.requestedRole,
      motivation: parsed.data.motivation,
    },
  });

  try {
    await sendCreatorInboxEmail({
      actorUserId: userId,
      subject: `[CleanMyMap] Demande de promotion - ${created.submittedByDisplayName}`,
      title: "Nouvelle demande de promotion",
      intro: "Une demande de changement de rôle vient d'arriver dans la file créateur.",
      lines: [
        { label: "Auteur", value: created.submittedByDisplayName },
        { label: "Email", value: created.submittedByEmail ?? "non communiqué" },
        { label: "Source", value: "Formulaire de promotion" },
        { label: "Rôle actuel", value: created.submittedByRole },
        { label: "Rôle demandé", value: created.requestedRole },
        { label: "Motivation", value: created.motivation },
        { label: "Statut", value: created.status },
      ],
      footer: "La demande est aussi enregistrée dans l'espace créateur avec son horodatage.",
    });
  } catch (error) {
    console.warn("Creator inbox notification failed for promotion request", error);
  }

  return NextResponse.json(
    {
      status: "queued",
      requestId: created.id,
      item: created,
    },
    { status: 201 },
  );
}
