import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { env } from "@/lib/env";
import { getResendClient } from "@/lib/services/resend";

type TestEmailPayload = {
  to?: string;
  subject?: string;
  html?: string;
};

export async function POST(request: Request) {
  const token = request.headers.get("x-admin-token") || "";
  const tokenAuthorized = Boolean(env.RESEND_TEST_TOKEN && token === env.RESEND_TEST_TOKEN);

  if (!tokenAuthorized) {
    const access = await requireAdminAccess();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const resend = getResendClient();
  if (!resend || !env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 503 });
  }

  const payload = (await request.json()) as TestEmailPayload;
  const to = payload.to || "ops@example.org";
  const subject = payload.subject || "[CleanMyMap] Test email";
  const html = payload.html || "<p>Test email from CleanMyMap modern stack baseline.</p>";

  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  return NextResponse.json({ status: "queued", id: result.data?.id ?? null });
}
