import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { getCurrentUserActiveRole, getCurrentUserIdentity } from"@/lib/authz";
import { appendAdminOperationAudit } from"@/lib/admin/audit/operation-audit";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import {
 appendCommunityBugReport,
 getCommunityBugReportById,
 updateCommunityBugReportStatus,
} from"@/lib/community/bug-reports-store";
import { sendCreatorInboxEmail } from"@/lib/community/creator-inbox-email";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import {
 reserveDiscussionMessageSlot,
 toDiscussionRateLimitErrorPayload,
} from"@/lib/community/discussion-rate-limit";
import { withServerRateLimit } from"@/lib/rate-limit/server";
import {
 parseJsonBodyWithSchema,
 rejectPublicFormAbuse,
} from"@/lib/security/validation";
import { logWarning } from "@/lib/logging/failure-log";

export const runtime ="nodejs";

const payloadSchema = z.object({
 reportType: z.enum(["bug", "idea", "improvement", "collaboration"]),
 title: z.string().trim().min(4).max(160),
 description: z.string().trim().min(10).max(3000),
 pagePath: z.string().trim().min(1).max(240).optional().nullable(),
 source: z.enum(["discussion_form", "feedback_section", "feedback_discussion"]).optional(),
 honeypot: z.string().optional().default(""),
 submittedAt: z.number().int().positive().optional(),
});

const statusUpdateSchema = z.object({
 reportId: z.string().trim().min(1),
 status: z.enum(["open", "treated", "archived"]),
 reason: z.string().trim().min(5).max(500),
});

type BugReportAuditSnapshot = {
 status: "open" | "treated" | "archived" | "unknown";
 creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "unknown";
};

function toBugReportAuditSnapshot(
 report: Awaited<ReturnType<typeof getCommunityBugReportById>>,
): BugReportAuditSnapshot {
 return report
 ? { status: report.status, creatorState: report.creatorState }
 : { status: "unknown", creatorState: "unknown" };
}

function expectedBugReportAuditSnapshot(
 status: "open" | "treated" | "archived",
): BugReportAuditSnapshot {
 return {
 status,
 creatorState: status === "open" ? "new" : status,
 };
}

function canonicalTargetUserId(value: unknown): string | undefined {
 if (typeof value !== "string") {
 return undefined;
 }
 const normalized = value.trim();
 return normalized && normalized !== "unknown" ? normalized : undefined;
}

async function notifyBugReportCreated(
 created: Awaited<ReturnType<typeof appendCommunityBugReport>>,
 userId: string,
 identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>,
): Promise<void> {
 try {
 const notificationLabel =
 parsedReportTypeLabel(created.reportType);
 await sendCreatorInboxEmail({
  actorUserId: userId,
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
 logWarning("CommunityBugReports", "Creator inbox notification failed", {
  reportId: created.id,
  reason: error instanceof Error ? error.message : String(error),
 });
 }
}

function parsedReportTypeLabel(
 reportType: "bug" | "idea" | "improvement" | "collaboration",
): string {
 return reportType === "bug"
 ? "Bug"
 : reportType === "improvement"
 ? "Amélioration"
 : reportType === "collaboration"
 ? "Collaboration"
 : "Idée";
}

export async function POST(request: Request) {
 return withServerRateLimit(request, { limit: 4, window: 300 }, async () => {

 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }
 const identity = await getCurrentUserIdentity();

 const parsed = await parseJsonBodyWithSchema(request, payloadSchema);
 if (!parsed.ok) return parsed.response;

 const abuseResponse = rejectPublicFormAbuse(parsed.data);
 if (abuseResponse) return abuseResponse;

 const supabase = getSupabaseServerClient(true);
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

 await notifyBugReportCreated(created, userId, identity);

 return NextResponse.json(
  {
   status:"queued",
   requestId: created.id,
   item: created,
  },
  { status: 201 },
 );
 });
}

export async function PATCH(request: Request) {
 const role = await getCurrentUserActiveRole().catch(() => "anonymous");
 if (role !== "max") {
 return NextResponse.json({ error:"Forbidden" }, { status: 403 });
 }
 const identity = await getCurrentUserIdentity();
 if (!identity) {
 return unauthorizedJsonResponse();
 }

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

 const reason = parsed.data.reason;
 const operationId = `feedback-${parsed.data.reportId}-${Date.now()}`;
 let current;
 try {
 current = await getCommunityBugReportById(parsed.data.reportId);
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: identity.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.reportId,
 details: {
 operation:"update_bug_report_status",
 reason,
 stage:"lookup",
 partialMutation:false,
 previousValue: toBugReportAuditSnapshot(null),
 newValue: expectedBugReportAuditSnapshot(parsed.data.status),
 },
 });
 return NextResponse.json({ error:"Unable to load report" }, { status: 500 });
 }

 if (!current) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: identity.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.reportId,
 details: {
 operation:"update_bug_report_status",
 reason,
 stage:"lookup",
 partialMutation:false,
 previousValue: toBugReportAuditSnapshot(null),
 newValue: expectedBugReportAuditSnapshot(parsed.data.status),
 },
 });
 return NextResponse.json({ error:"Report not found" }, { status: 404 });
 }

 const previousValue = toBugReportAuditSnapshot(current);
 const newValue = expectedBugReportAuditSnapshot(parsed.data.status);
 const targetUserId = canonicalTargetUserId(current.submittedByUserId);
 let updated;
 try {
 updated = await updateCommunityBugReportStatus({
 reportId: parsed.data.reportId,
 status: parsed.data.status,
 });
 } catch {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: identity.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.reportId,
 details: {
 operation:"update_bug_report_status",
 reason,
 ...(targetUserId ? { targetUserId } : {}),
 previousValue,
 newValue,
 stage:"update",
 partialMutation:false,
 },
 });
 return NextResponse.json({ error:"Unable to update report" }, { status: 500 });
 }

 if (!updated) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: identity.userId,
 operationType:"admin_operation",
 outcome:"error",
 targetId: parsed.data.reportId,
 details: {
 operation:"update_bug_report_status",
 reason,
 ...(targetUserId ? { targetUserId } : {}),
 previousValue,
 newValue,
 stage:"update",
 partialMutation:false,
 },
 });
 return NextResponse.json({ error:"Unable to update report" }, { status: 500 });
 }

 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: identity.userId,
 operationType:"admin_operation",
 outcome:"success",
 targetId: parsed.data.reportId,
 details: {
 operation:"update_bug_report_status",
 reason,
 ...(targetUserId ? { targetUserId } : {}),
 previousValue,
 newValue: toBugReportAuditSnapshot(updated),
 },
 });

 return NextResponse.json({ status:"ok", item: updated });
}
