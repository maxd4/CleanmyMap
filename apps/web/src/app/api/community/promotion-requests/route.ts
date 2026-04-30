import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendPromotionRequest } from "@/lib/admin/promotion-requests-store";

export const runtime = "nodejs";

const payloadSchema = z.object({
  requestedRole: z.enum(["elu", "admin"]),
  motivation: z.string().trim().min(10).max(1200),
});

export async function POST(request: Request) {
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (
    currentRole === "elu" &&
    parsed.data.requestedRole === "elu"
  ) {
    return NextResponse.json(
      {
        error: "Vous êtes déjà au rôle demandé.",
      },
      { status: 400 },
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
