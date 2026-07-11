import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { env } from "@/lib/env";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

const sendSchema = z.object({
  to: z
    .union([
      z.string().email(),
      z.array(z.string().email()).min(1).max(10),
    ])
    .optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  html: z.string().trim().min(1).max(10000).optional(),
});

function hasValidLocalTestToken(request: Request): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const configuredToken = env.RESEND_TEST_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const tokenFromHeader = request.headers.get("x-resend-test-token")?.trim();
  return Boolean(tokenFromHeader && tokenFromHeader === configuredToken);
}

export async function POST(request: Request) {
  const tokenAuthorized = hasValidLocalTestToken(request);
  const { userId: actorUserId } = await auth();

  if (!tokenAuthorized) {
    const access = await requireAdminAccess();
    if (!access.ok) {
      return adminAccessErrorJsonResponse(access);
    }
  }

  const from = resolveEmailFrom();
  const replyTo = resolveContactEmail();

  if (!env.RESEND_API_KEY?.trim() || !from || !replyTo) {
    return NextResponse.json(
      { error: "Resend not configured" },
      { status: 503 },
    );
  }

  let rawPayload: unknown = {};

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.toLowerCase().includes("application/json")) {
      rawPayload = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = sendSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const to = payload.to ?? replyTo;

  try {
    const result = await sendEmail({
      actorUserId,
      from,
      to,
      subject: payload.subject ?? "[CleanMyMap] Test Resend",
      html:
        payload.html ??
        "<p>Test OK depuis <strong>CleanMyMap</strong> via l'API /api/send.</p>",
      replyTo,
    });

    return NextResponse.json({
      ok: true,
      status: result.status,
      id: result.id ?? null,
      to,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Resend error";

    console.error("[Resend test] send failed", {
      recipientCount: Array.isArray(to) ? to.length : 1,
      error: message,
    });

    return NextResponse.json(
      { error: "Resend send failed", details: "Unavailable" },
      { status: 502 },
    );
  }
}
