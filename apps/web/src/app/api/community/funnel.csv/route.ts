import { requireAdminAccess } from"@/lib/authz";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { computeEventConversions } from"@/lib/community/engagement";
import { formatCleanupWasteTypesLabel } from"@/lib/community/event-ops";
import { toCommunityEventItem } from"@/lib/community/event-item";
import { loadCommunityEventRsvpSummaries } from"@/lib/community/event-rsvp-summaries";
import { escapeCsvCell } from"@/lib/reports/csv";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import type { CommunityEventRow } from"@/types/database";
import { fetchUnifiedActionContracts } from"@/lib/actions/unified-source";
import { toActionListItem } from"@/lib/actions/data-contract";
import { buildDeliverableFilename } from"@/lib/reports/deliverable-name";
import { parsePositiveInteger } from "@/lib/http/query-params";

export const runtime ="nodejs";

type CommunityEventSupabase = ReturnType<typeof getSupabaseServerClient>;
type CommunityEventConversion = ReturnType<typeof computeEventConversions>;

function formatParisDate(date: Date): string {
 return new Intl.DateTimeFormat("en-CA", {
 timeZone:"Europe/Paris",
 year:"numeric",
 month:"2-digit",
 day:"2-digit",
 }).format(date);
}

async function loadCommunityEventFunnelData(
 supabase: CommunityEventSupabase,
 eventId: string | null,
 floorDate: string,
 limit: number,
) {
 const eventsResult = eventId && eventId.trim() !==""
  ? await supabase
   .from("community_events")
   .select(
  "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
   )
   .eq("id", eventId.trim())
   .limit(1)
  : await supabase
   .from("community_events")
   .select(
  "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
   )
   .gte("event_date", floorDate)
   .order("event_date", { ascending: false })
   .limit(limit);

 if (eventsResult.error) {
  throw new Error(eventsResult.error.message);
 }

 const events = (eventsResult.data ?? []) as CommunityEventRow[];
 const summaries = await loadCommunityEventRsvpSummaries(supabase, {
  eventIds: events.map((item) => item.id),
  userId: null,
 });
 const summaryByEventId = new Map(summaries.map((row) => [row.eventId, row] as const));
 const items = events.map((event) =>
  toCommunityEventItem(
   event,
   summaryByEventId.get(event.id) ?? null,
   { canEditOwnOps: false, myRsvpStatus: null },
  ),
 );
 return { events, items };
}

function buildCommunityFunnelLines(conversion: CommunityEventConversion): string[] {
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
 return lines;
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
 const supabase = getSupabaseServerClient(true);
 const { events, items } = await loadCommunityEventFunnelData(
  supabase,
  eventId,
  floorDate,
  limit,
 );

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

 const lines = buildCommunityFunnelLines(conversion);

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
