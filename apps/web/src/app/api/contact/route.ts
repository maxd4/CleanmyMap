import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import { appendContactRequest, updateContactRequestStatus } from "@/lib/contact/contact-requests-store";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getTrustedClientIp } from "@/lib/rate-limit/utils";
import {
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
} from "@/lib/security/validation";

export const runtime = "nodejs";

const requestSchema = z.object({
  requestType: z.enum(["access", "rectification", "erasure", "portability", "other"]),
  email: z.string().trim().email("Format d'email invalide"),
  message: z.string().trim().min(10).max(2000),
  honeypot: z.string().optional().default(""),
  submittedAt: z.number().int().positive().optional(),
});

const REQUEST_LABELS: Record<
  z.infer<typeof requestSchema>["requestType"],
  { fr: string; en: string }
> = {
  access: { fr: "Droit d'accès", en: "Access" },
  rectification: { fr: "Droit de rectification", en: "Rectification" },
  erasure: { fr: "Droit à l'effacement", en: "Erasure" },
  portability: { fr: "Droit à la portabilité", en: "Portability" },
  other: { fr: "Autre demande RGPD", en: "Other request" },
};

export async function POST(request: Request) {
  const { userId } = await auth();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (hasHoneypotSignal(parsed.data.honeypot)) {
    return createPublicRateLimitResponse("Impossible d'envoyer la demande pour le moment.");
  }

  if (hasRecentSubmission(parsed.data.submittedAt)) {
    return createPublicRateLimitResponse("Impossible d'envoyer la demande pour le moment.");
  }

  const ip = getTrustedClientIp({ headers: request.headers });
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const writeRateLimit = await verifyRateLimit({
    limit: 3,
    window: 300,
    key: `${ip}:${normalizedEmail}`,
  });
  const writeRateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
  );
  if (writeRateLimitResponse) {
    return writeRateLimitResponse;
  }

  const created = await appendContactRequest({
    submittedByUserId: userId ?? null,
    input: {
      submittedByEmail: normalizedEmail,
      requestType: parsed.data.requestType,
      subject: REQUEST_LABELS[parsed.data.requestType].fr,
      message: parsed.data.message.trim(),
      pagePath: "/contact",
    },
  });

  try {
    await sendCreatorInboxEmail({
      actorUserId: userId ?? null,
      subject: `[CleanMyMap] Contact - ${REQUEST_LABELS[parsed.data.requestType].fr}`,
      title: "Nouveau message de contact",
      intro: "Un message du formulaire de contact vient d'arriver.",
      lines: [
        { label: "Type", value: REQUEST_LABELS[parsed.data.requestType].fr },
        { label: "Email", value: normalizedEmail },
        { label: "Compte", value: userId ?? "non connecté" },
        { label: "Page", value: "/contact" },
        { label: "Message", value: parsed.data.message.trim() },
      ],
      footer: "Le message est enregistré dans la file de suivi CleanMyMap.",
      replyTo: normalizedEmail,
    });

    const updated = await updateContactRequestStatus({
      requestId: created.id,
      status: "sent",
    });

    return NextResponse.json(
      {
        status: "queued",
        requestId: created.id,
        item: updated ?? created,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateContactRequestStatus({
      requestId: created.id,
      status: "failed",
      notificationError: message,
    }).catch(() => undefined);
    console.warn("Contact notification failed", error);

    return NextResponse.json(
      {
        status: "queued",
        requestId: created.id,
        item: created,
      },
      { status: 201 },
    );
  }
}
