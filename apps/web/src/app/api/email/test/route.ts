import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { env } from "@/lib/env";
import { getResendClient } from "@/lib/services/resend";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

type TestEmailPayload = {
  to?: string;
  subject?: string;
  html?: string;
};

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const resend = getResendClient();
  if (!resend || !env.RESEND_FROM_EMAIL) {
    return NextResponse.json(
      { error: "Resend not configured" },
      { status: 503 },
    );
  }

  const payload = (await request.json()) as TestEmailPayload;
  const to = payload.to || "ops@example.org";
  const subject = payload.subject || "[CleanMyMap] Test email";
  const html =
    payload.html || "<p>Test email from CleanMyMap modern stack baseline.</p>";

  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  return NextResponse.json({ status: "queued", id: result.data?.id ?? null });
}
