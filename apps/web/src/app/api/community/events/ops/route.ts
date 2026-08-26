import { auth } from"@clerk/nextjs/server";
import { randomUUID } from"node:crypto";
import { NextResponse } from"next/server";
import { z } from"zod";
import { appendAdminOperationAudit } from"@/lib/admin/operation-audit";
import { requireAdminAccess } from"@/lib/authz";
import { trackCommunityOpsUpdate } from"@/lib/gamification/progression";
import {
 defaultCommunityEventOps,
 mergeCommunityEventOps,
 parseCommunityEventDescription,
 serializeCommunityEventDescription,
} from"@/lib/community/event-ops";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { loadCommunityEventRsvpSummaries } from"@/lib/community/event-rsvp-summaries";

export const runtime ="nodejs";
const updateEventOpsSchema = z
 .object({
 eventId: z.string().trim().min(1).max(120),
 capacityTarget: z.number().int().min(1).max(200000).nullable().optional(),
 attendanceCount: z.number().int().min(0).max(200000).nullable().optional(),
 postMortem: z.string().trim().max(6000).nullable().optional(),
 reason: z.string().trim().max(500).optional(),
 })
 .strict();

type CommunityEventRow = {
 id: string;
 created_at: string;
 organizer_clerk_id: string;
 title: string;
 event_date: string;
 location_label: string;
 description: string | null;
};

type CommunityEventOpsAuditValue = {
 capacityTarget: number | null;
 attendanceCount: number | null;
 postMortemPresent: boolean;
 postMortemLength: number;
};

const ADMIN_OVERRIDE_OPERATION = "update_community_event_ops_admin_override";

function toCommunityEventOpsAuditValue(
 ops: ReturnType<typeof defaultCommunityEventOps>,
): CommunityEventOpsAuditValue {
 const postMortem = (ops.postMortem ?? "").trim();
 return {
 capacityTarget: ops.capacityTarget,
 attendanceCount: ops.attendanceCount,
 postMortemPresent: postMortem.length > 0,
 postMortemLength: postMortem.length,
 };
}

function toEventResponseItem(
 event: CommunityEventRow,
 summary: {
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalCount: number;
  myRsvpStatus: "yes" | "maybe" | "no" | null;
 } | null,
) {
 const parsedDescription = parseCommunityEventDescription(event.description);
 const ops = parsedDescription.ops ?? defaultCommunityEventOps();

 return {
 id: event.id,
 createdAt: event.created_at,
 organizerClerkId: event.organizer_clerk_id,
 title: event.title,
 eventDate: event.event_date,
 locationLabel: event.location_label,
 description: parsedDescription.plainDescription,
 capacityTarget: ops.capacityTarget,
 attendanceCount: ops.attendanceCount,
 postMortem: ops.postMortem,
 cleanupObjective: ops.cleanupObjective,
 cleanupZone: ops.cleanupZone,
 cleanupLogisticsNeeds: ops.cleanupLogisticsNeeds,
  cleanupSupportLevel: ops.cleanupSupportLevel,
  cleanupWasteTypesExpected: ops.cleanupWasteTypesExpected,
  rsvpCounts: {
  yes: summary?.yesCount ?? 0,
  maybe: summary?.maybeCount ?? 0,
 no: summary?.noCount ?? 0,
 total: summary?.totalCount ?? 0,
  },
  myRsvpStatus: summary?.myRsvpStatus ?? null,
 };
}

export async function POST(request: Request) {
 const adminAccess = await requireAdminAccess();
 const { userId } = await auth();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json(
 { error:"Invalid JSON payload" },
 { status: 400 },
 );
 }

 const parsed = updateEventOpsSchema.safeParse(payload);
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
 const eventResult = await supabase
 .from("community_events")
 .select(
"id, created_at, organizer_clerk_id, title, event_date, location_label, description",
 )
 .eq("id", parsed.data.eventId)
 .maybeSingle();

 if (eventResult.error) {
 return handleApiError(
  eventResult.error,
  "POST /api/community/events/ops (event lookup)",
 );
 }
 if (!eventResult.data) {
 return NextResponse.json({ error:"Event not found" }, { status: 404 });
 }

 const isOrganizer = eventResult.data.organizer_clerk_id === userId;
 if (!isOrganizer && !adminAccess.ok) {
 return adminAccessErrorJsonResponse(adminAccess);
 }

 const isAdminOverride = !isOrganizer && adminAccess.ok;
 const reason = parsed.data.reason?.trim() ?? "";
 if (isAdminOverride && reason.length < 5) {
 return NextResponse.json(
 { error:"A reason of at least 5 characters is required for an admin override" },
 { status: 400 },
 );
 }

 const parsedDescription = parseCommunityEventDescription(
 eventResult.data.description,
 );
 const mergedOps = mergeCommunityEventOps(parsedDescription.ops, {
 capacityTarget: parsed.data.capacityTarget,
 attendanceCount: parsed.data.attendanceCount,
 postMortem: parsed.data.postMortem,
 });
 const description = serializeCommunityEventDescription(
 parsedDescription.plainDescription,
 mergedOps,
 );

 const previousValue = toCommunityEventOpsAuditValue(parsedDescription.ops);
 const newValue = toCommunityEventOpsAuditValue(mergedOps);
 const operationId = isAdminOverride
 ? `community-event-ops-${randomUUID()}`
 : null;
 const auditDetails = isAdminOverride
 ? {
 operation: ADMIN_OVERRIDE_OPERATION,
 targetUserId: eventResult.data.organizer_clerk_id,
 reason,
 previousValue,
 newValue,
 }
 : null;

 let updated;
 try {
 updated = await supabase
 .from("community_events")
 .update({ description })
 .eq("id", parsed.data.eventId)
 .select(
"id, created_at, organizer_clerk_id, title, event_date, location_label, description",
 )
 .single();
 } catch (error) {
 if (isAdminOverride && operationId && auditDetails) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: adminAccess.userId,
 operationType: "admin_operation",
 outcome: "error",
 targetId: parsed.data.eventId,
 details: { ...auditDetails, stage: "event_update" },
 });
 }
 return handleApiError(error, "POST /api/community/events/ops (update)");
 }

 if (updated.error) {
 if (isAdminOverride && operationId && auditDetails) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: adminAccess.userId,
 operationType: "admin_operation",
 outcome: "error",
 targetId: parsed.data.eventId,
 details: { ...auditDetails, stage: "event_update" },
 });
 }
 return handleApiError(updated.error, "POST /api/community/events/ops (update)");
 }

 if (isAdminOverride && operationId && auditDetails) {
 await appendAdminOperationAudit({
 operationId,
 at: new Date().toISOString(),
 actorUserId: adminAccess.userId,
 operationType: "admin_operation",
 outcome: "success",
 targetId: parsed.data.eventId,
 details: auditDetails,
 });
 }

 const summaries = await loadCommunityEventRsvpSummaries(supabase, {
  eventIds: [parsed.data.eventId],
  userId: userId ?? null,
 });

 const item = toEventResponseItem(
  updated.data as CommunityEventRow,
  summaries[0] ?? null,
 );

 if (userId) {
 try {
 await trackCommunityOpsUpdate(supabase, {
 userId,
 eventId: parsed.data.eventId,
 attendanceCount: item.attendanceCount,
 hasPostMortem: (item.postMortem ??"").trim().length >= 20,
 });
 } catch (progressionError) {
 console.error("Progression tracking failed for community ops update", {
 userId,
 eventId: parsed.data.eventId,
 message:
 progressionError instanceof Error
 ? progressionError.message
 : String(progressionError),
 });
 }
 }

 return NextResponse.json({ status:"ok", item });
}
