import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from"@/lib/authz";
import { appendAdminOperationAudit } from"@/lib/admin/operation-audit";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import {
 appendCommunityBugReport,
 updateCommunityBugReportStatus,
} from"@/lib/community/bug-reports-store";
import { sendCreatorInboxEmail } from"@/lib/community/creator-inbox-email";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import {
 reserveDiscussionMessageSlot,
 toDiscussionRateLimitErrorPayload,
} from"@/lib/community/discussion-rate-limit";

export const runtime ="nodejs";

const payloadSchema = z.object({
 reportType: z.enum(["bug", "idea", "improvement", "collaboration"]),
 title: z.string().trim().min(4).max(160),
 description: z.string().trim().min(10).max(3000),
 pagePath: z.string().trim().min(1).max(240).optional().nullable(),
 source: z.enum(["discussion_form", "feedback_section", "feedback_discussion"]).optional(),
});

const statusUpdateSchema = z.object({
 reportId: z.string().trim().min(1),
 status: z.enum(["open", "treated", "archived"]),
});

export async function POST(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }
 const identity = await getCurrentUserIdentity();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json({ error:"Invalid JSON payload" }, { status: 400 });
 }

 const parsed = payloadSchema.safeParse(payload);
 if (!parsed.success) {
 return NextResponse.json(
 {
 error:"Invalid payload",
 details: parsed.error.flatten().fieldErrors,
 },
 { status: 400 },
 );
 }

 const supabase = getSupabaseServerClient();
 const quota = await reserveDiscussionMessageSlot(supabase, {
 userId,
 channel:"bug_report",
 });
 if (!quota.allowed) {
 return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), {
 status: 429,
 });
 }

 const created = await appendCommunityBugReport({
 submittedByUserId: userId,
 input: {
 reportType: parsed.data.reportType,
 title: parsed.data.title,
 description: parsed.data.description,
 pagePath: parsed.data.pagePath ?? null,
 source: parsed.data.source,
 submittedByDisplayName: identity?.displayName ?? userId,
 submittedByEmail: identity?.email ?? null,
 submittedByRole: identity?.role ?? null,
 },
 });

 try {
 const notificationLabel =
 parsed.data.reportType ==="bug"
 ? "Bug"
 : parsed.data.reportType ==="improvement"
 ? "Amélioration"
 : parsed.data.reportType ==="collaboration"
 ? "Collaboration"
 : "Idée";
 await sendCreatorInboxEmail({
 subject: `[CleanMyMap] Nouveau feedback - ${notificationLabel}`,
 title: "Nouveau feedback reçu",
 intro: "Un questionnaire feedback vient d'arriver dans la file créateur.",
 lines: [
 { label:"Type", value: notificationLabel },
 { label:"Source", value: created.source },
 { label:"Auteur", value: identity?.displayName ?? userId },
 { label:"Email", value: identity?.email ?? "non communiqué" },
 { label:"Rôle", value: identity?.role ?? "non communiqué" },
 { label:"Page", value: created.pagePath ?? "non communiquée" },
 { label:"Titre", value: created.title },
 { label:"Statut", value: created.status },
 { label:"Contenu", value: created.description },
 ],
 footer: "Le retour est enregistré dans l'espace créateur avec la date et la source de soumission.",
 });
 } catch (error) {
 console.warn("Creator inbox notification failed for feedback", error);
 }

 return NextResponse.json(
  {
   status:"queued",
   requestId: created.id,
   item: created,
  },
  { status: 201 },
 );
}

export async function PATCH(request: Request) {
 const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
 if (role !== "max") {
 return NextResponse.json({ error:"Forbidden" }, { status: 403 });
 }
 const identity = await getCurrentUserIdentity();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json({ error:"Invalid JSON payload" }, { status: 400 });
 }

 const parsed = statusUpdateSchema.safeParse(payload);
 if (!parsed.success) {
 return NextResponse.json(
 {
 error:"Invalid payload",
 details: parsed.error.flatten().fieldErrors,
 },
 { status: 400 },
 );
 }

 const updated = await updateCommunityBugReportStatus({
 reportId: parsed.data.reportId,
 status: parsed.data.status,
 });

if (!updated) {
 return NextResponse.json({ error:"Report not found" }, { status: 404 });
}

 await appendAdminOperationAudit({
 operationId: `feedback-${updated.id}-${Date.now()}`,
 at: new Date().toISOString(),
 actorUserId: identity?.userId ?? "unknown",
 operationType:"moderation",
 outcome:"success",
 targetId: updated.id,
 details: {
 entityType:"feedback_report",
 action:`status_${parsed.data.status}`,
 source: updated.source,
 },
 }).catch(() => undefined);

 return NextResponse.json({ status:"ok", item: updated });
}
