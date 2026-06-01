import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { env } from "@/lib/env";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import { sendEmail } from "@/lib/services/email";

const testEmailSchema = z.object({
  to: z.string().email().optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  html: z.string().trim().min(1).max(10000).optional(),
});

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const from = resolveEmailFrom();
  const replyTo = resolveContactEmail();
  if (!env.RESEND_API_KEY?.trim() || !from || !replyTo) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 503 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = testEmailSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const to = payload.to || replyTo;
  const subject = payload.subject || "[CleanMyMap] Test email";
  const html =
    payload.html || "<p>Test email from CleanMyMap modern stack baseline.</p>";

  const result = await sendEmail({
    actorUserId: access.userId,
    from,
    to,
    subject,
    html,
    replyTo,
  });

  return NextResponse.json({ status: result.status, id: result.id ?? null });
}
