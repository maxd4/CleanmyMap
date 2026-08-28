import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH,
  LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH,
  normalizeLegalContentReportUrl,
} from "@/lib/legal-content-report/legal-content-report";
import { appendLegalContentReport } from "@/lib/legal-content-report/legal-content-report-store";
import {
  sendLegalContentReportAcknowledgement,
  sendLegalContentReportCreatorNotification,
} from "@/lib/legal-content-report/legal-content-report-service";
import { logWarning } from "@/lib/logging/failure-log";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import {
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
} from "@/lib/security/validation";

export const runtime = "nodejs";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const payloadSchema = z
  .object({
    notifierName: optionalText(160),
    notifierEmail: optionalText(254),
    identityException: z.boolean().optional().default(false),
    identityExceptionReason: optionalText(LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH),
    contentUrl: z.string().trim().min(1).max(2048),
    contentType: optionalText(120),
    contentId: optionalText(160),
    allegationReason: z.string().trim().min(20).max(LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH),
    goodFaithConfirmed: z.boolean(),
    honeypot: z.string().optional().default(""),
    submittedAt: z.number().int().positive().optional(),
  })
  .superRefine((data, context) => {
    if (!normalizeLegalContentReportUrl(data.contentUrl)) {
      context.addIssue({
        code: "custom",
        path: ["contentUrl"],
        message: "L'URL doit être une adresse HTTP ou HTTPS exacte.",
      });
    }
    if (!data.identityException && !data.notifierName) {
      context.addIssue({
        code: "custom",
        path: ["notifierName"],
        message: "Le nom est requis hors exception d'identité.",
      });
    }
    if (!data.identityException && !data.notifierEmail) {
      context.addIssue({
        code: "custom",
        path: ["notifierEmail"],
        message: "L'email est requis hors exception d'identité.",
      });
    }
    if (data.notifierEmail) {
      const email = z.string().email().safeParse(data.notifierEmail);
      if (!email.success) {
        context.addIssue({
          code: "custom",
          path: ["notifierEmail"],
          message: "L'email doit être valide.",
        });
      }
    }
    if (data.goodFaithConfirmed !== true) {
      context.addIssue({
        code: "custom",
        path: ["goodFaithConfirmed"],
        message: "La confirmation de bonne foi est obligatoire.",
      });
    }
  });

function badPayloadResponse(error: { flatten: () => { fieldErrors: Record<string, unknown> } }) {
  return NextResponse.json(
    { error: "Invalid payload", details: error.flatten().fieldErrors },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const writeRateLimit = await verifyRateLimit(request, { limit: 3, window: 300 });
  const rateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
    writeRateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return badPayloadResponse(parsed.error);
  if (hasHoneypotSignal(parsed.data.honeypot) || hasRecentSubmission(parsed.data.submittedAt)) {
    return createPublicRateLimitResponse("Impossible d'envoyer la notification pour le moment.");
  }

  const { userId } = await auth();
  const created = await appendLegalContentReport({
    submittedByUserId: userId ?? null,
    notifierName: parsed.data.notifierName || null,
    notifierEmail: parsed.data.notifierEmail.toLowerCase() || null,
    identityExceptionReason: parsed.data.identityException
      ? parsed.data.identityExceptionReason || null
      : null,
    contentUrl: normalizeLegalContentReportUrl(parsed.data.contentUrl)!,
    contentType: parsed.data.contentType || null,
    contentId: parsed.data.contentId || null,
    allegationReason: parsed.data.allegationReason,
    goodFaithConfirmed: true,
  });

  let acknowledgement: "sent" | "failed" | "not_requested" = "not_requested";
  if (created.notifierEmail) {
    try {
      const result = await sendLegalContentReportAcknowledgement(created);
      acknowledgement = result?.status === "sent" || result?.status === "mocked" ? "sent" : "failed";
    } catch (error) {
      acknowledgement = "failed";
      logWarning("LegalContentReport", "Acknowledgement email failed after persistence", {
        reportId: created.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let creatorInbox: "sent" | "failed" = "failed";
  try {
    const result = await sendLegalContentReportCreatorNotification(created);
    creatorInbox = result ? "sent" : "failed";
  } catch (error) {
    logWarning("LegalContentReport", "Creator inbox notification failed after persistence", {
      reportId: created.id,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(
    {
      status: "queued",
      trackingId: created.id,
      notification: { acknowledgement, creatorInbox },
    },
    { status: 201 },
  );
}
