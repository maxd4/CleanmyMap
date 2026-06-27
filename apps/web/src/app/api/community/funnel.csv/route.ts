import { requireAdminAccess } from"@/lib/authz";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { computeEventConversions } from"@/lib/community/engagement";
import {
 formatCleanupWasteTypesLabel,
 parseCommunityEventDescription,
} from"@/lib/community/event-ops";
import { loadCommunityEventRsvpSummaries } from"@/lib/community/event-rsvp-summaries";
import { escapeCsvCell } from"@/lib/reports/csv";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import type { CommunityEventRow } from"@/types/database";
import { fetchUnifiedActionContracts } from"@/lib/actions/unified-source";
import { toActionListItem } from"@/lib/actions/data-contract";
import { buildDeliverableFilename } from"@/lib/reports/deliverable-name";

export const runtime ="nodejs";


function formatParisDate(date: Date): string {
 return new Intl.DateTimeFormat("en-CA", {
 timeZone:"Europe/Paris",
 year:"numeric",
 month:"2-digit",
 day:"2-digit",
 }).format(date);
}

function parsePositiveInteger(
 raw: string | null,
 min: number,
 max: number,
 fallback: number,
): number {
 if (!raw || raw.trim() ==="") {
 return fallback;
 }
 const parsed = Number(raw);
 if (!Number.isFinite(parsed)) {
 return fallback;
 }
 return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: Request) {
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access);
 }
 const url = new URL(request.url);
 const days = parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 90);
 const limit = parsePositiveInteger(
 url.searchParams.get("limit"),
 1,
 1000,
 400,
 );
 const eventId = url.searchParams.get("eventId");
 const floorDate = formatParisDate(
 new Date(Date.now() - days * 24 * 60 * 60 * 1000),
 );

 try {
 const supabase = getSupabaseServerClient();
 
 let query = supabase.from("community_events").select(
"id, created_at, organizer_clerk_id, title, event_date, location_label, description",
 );
 
 if (eventId && eventId.trim() !=="") {
 query = query.eq("id", eventId.trim());
 } else {
 query = query.gte("event_date", floorDate);
 query = query.order("event_date", { ascending: false }).limit(limit);
 }

 const eventsResult = await query;

 if (eventsResult.error) {
 return new Response("Export unavailable", {
  status: 500,
 });
 }

 const events = (eventsResult.data ?? []) as CommunityEventRow[];
 const eventIds = events.map((item) => item.id);

 const summaries = await loadCommunityEventRsvpSummaries(supabase, {
  eventIds,
  userId: null,
 });
 const summaryByEventId = new Map(summaries.map((row) => [row.eventId, row] as const));

 const items = events.map((event) => {
 const ops = parseCommunityEventDescription(event.description).ops;
 const summary = summaryByEventId.get(event.id) ?? null;
 return {
 id: event.id,
 createdAt: event.created_at,
 organizerClerkId: event.organizer_clerk_id,
 title: event.title,
 eventDate: event.event_date,
 locationLabel: event.location_label,
 description: parseCommunityEventDescription(event.description)
 .plainDescription,
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
 myRsvpStatus: null,
 };
});

 const now = new Date();
 const filteredEvents = items;

 const { items: contracts, isTruncated: isActionsTruncated } =
 await fetchUnifiedActionContracts(supabase, {
 limit: 2500,
 status:"approved",
 floorDate: null,
 requireCoordinates: false,
 types: ["action"],
 });
 const actions = contracts.map((contract) => toActionListItem(contract));
 const conversion = computeEventConversions(filteredEvents, actions);

 const header = [
"event_id",
"title",
"event_date",
"location_label",
"capacity_target",
"rsvp_yes",
"rsvp_maybe",
"rsvp_no",
"attendance_count",
"cleanup_objective",
"cleanup_zone",
"cleanup_logistics_needs",
"cleanup_support_level",
"cleanup_waste_types_expected",
"linked_actions",
"fill_rate_pct",
"rsvp_to_attendance_pct",
"attendance_to_action_pct",
"rsvp_to_action_pct",
 ];
 const lines = [header.join(",")];
 for (const row of conversion.rows) {
 lines.push(
 [
 row.eventId,
 row.title,
 row.eventDate,
 row.locationLabel,
 row.capacityTarget,
 row.rsvpYes,
 row.rsvpMaybe,
 row.rsvpNo,
 row.attendanceCount,
 row.cleanupObjective,
 row.cleanupZone,
 row.cleanupLogisticsNeeds,
 row.cleanupSupportLevel,
 formatCleanupWasteTypesLabel(row.cleanupWasteTypesExpected),
 row.linkedActions,
 row.fillRate,
 row.rsvpToAttendanceRate,
 row.attendanceToActionRate,
 row.rsvpToActionRate,
 ]
 .map((cell) => escapeCsvCell(cell as string | number | null))
 .join(","),
 );
 }

 const filename = buildDeliverableFilename({
 rubrique:"analytics_funnel_community",
 extension:"csv",
 date: now,
 });

 const isEventsTruncated = events.length >= limit;
 const isTruncated = isEventsTruncated || isActionsTruncated;

 const headers: Record<string, string> = {
  "Content-Type": "text/csv; charset=utf-8",
  "Content-Disposition": `attachment; filename="${filename}"`,
  // Justification Vercel: this export is user-scoped and time-sensitive, so it must bypass caches.
  "Cache-Control": "no-store",
 };
 if (isTruncated) {
 headers["X-Export-Warning"] = isEventsTruncated
 ?"Event dataset truncated to limit"
 :"Action dataset truncated to limit";
 }

 return new Response(`\uFEFF${lines.join("\n")}`, {
 status: 200,
 headers,
 });
 } catch {
 return new Response("Export unavailable", { status: 500 });
 }
}
