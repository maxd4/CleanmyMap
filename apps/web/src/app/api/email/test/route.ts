import { NextResponse } from"next/server";
import { z } from"zod";
import { requireAdminAccess } from"@/lib/authz";
import { env } from"@/lib/env";
import { getResendClient } from"@/lib/services/resend";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";

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
 if (!resend || !env.RESEND_FROM_EMAIL) {
 return NextResponse.json(
 { error:"Resend not configured" },
 { status: 503 },
 );
 }

 let rawPayload: unknown;
 try {
 rawPayload = await request.json();
 } catch {
 return NextResponse.json({ error:"Invalid JSON" }, { status: 400 });
 }

 const parsed = testEmailSchema.safeParse(rawPayload);
 if (!parsed.success) {
 return NextResponse.json(
 { error:"Invalid payload", details: parsed.error.flatten().fieldErrors },
 { status: 400 },
 );
 }

 const payload = parsed.data;
 const to = payload.to ||"ops@example.org";
 const subject = payload.subject ||"[CleanMyMap] Test email";
 const html =
 payload.html ||"<p>Test email from CleanMyMap modern stack baseline.</p>";
 const replyTo = env.RESEND_REPLY_TO || env.RESEND_FROM_EMAIL;

 const result = await resend.emails.send({
 from: env.RESEND_FROM_EMAIL,
 to,
 subject,
 html,
 replyTo,
 });

 return NextResponse.json({ status:"queued", id: result.data?.id ?? null });
}
