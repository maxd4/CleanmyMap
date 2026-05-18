import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import { getResendClient } from "@/lib/services/resend";

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

  const resend = getResendClient();
  const from = resolveEmailFrom();
  const replyTo = resolveContactEmail();
  if (!resend || !from || !replyTo) {
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

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo,
  });

  return NextResponse.json({ status: "queued", id: result.data?.id ?? null });
}
