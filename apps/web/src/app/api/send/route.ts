import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { env } from "@/lib/env";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { getResendClient } from "@/lib/services/resend";

export const runtime = "nodejs";

const DEFAULT_TEST_TO = "maxence.deroome@gmail.com";

const sendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  html: z.string().trim().min(1).max(10000).optional(),
});

function hasValidTestToken(request: Request): boolean {
  const configuredToken = env.RESEND_TEST_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const tokenFromHeader = request.headers.get("x-resend-test-token")?.trim();
  return Boolean(tokenFromHeader && tokenFromHeader === configuredToken);
}

export async function POST(request: Request) {
  const tokenAuthorized = hasValidTestToken(request);

  if (!tokenAuthorized) {
    const access = await requireAdminAccess();
    if (!access.ok) {
      return adminAccessErrorJsonResponse(access);
    }
  }

  const resend = getResendClient();
  if (!resend || !env.RESEND_FROM_EMAIL) {
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
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const replyTo = env.RESEND_REPLY_TO || env.RESEND_FROM_EMAIL;
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: payload.to ?? DEFAULT_TEST_TO,
      subject: payload.subject ?? "[CleanMyMap] Test Resend",
      html:
        payload.html ??
        "<p>Test OK depuis <strong>CleanMyMap</strong> via l'API /api/send.</p>",
      replyTo,
    });

    if (result.error) {
      return NextResponse.json(
        { error: "Resend send failed", details: result.error.message },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: "queued",
      id: result.data?.id ?? null,
      to: payload.to ?? DEFAULT_TEST_TO,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Resend error";
    return NextResponse.json(
      { error: "Resend send failed", details: message },
      { status: 502 },
    );
  }
}
