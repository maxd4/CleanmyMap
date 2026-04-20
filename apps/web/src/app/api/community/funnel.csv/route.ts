import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { computeEventConversions } from "@/lib/community/engagement";
import { parseCommunityEventDescription } from "@/lib/community/event-ops";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { toActionListItem } from "@/lib/actions/data-contract";
import { buildDeliverableFilename } from "@/lib/reports/deliverable-name";

export const runtime = "nodejs";

type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  title: string;
  event_date: string;
  location_label: string;
  description: string | null;
};

type EventRsvpRow = {
  event_id: string;
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
};

function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!raw || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function escapeCsvCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  if (!/[",\r\n]/.test(raw)) {
    return raw;
  }
  return `"${raw.replace(/"/g, '""')}"`;
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

  try {
    const supabase = getSupabaseServerClient();
    
    let query = supabase.from("community_events").select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
    );
    
    if (eventId && eventId.trim() !== "") {
      query = query.eq("id", eventId.trim());
    } else {
      query = query.order("event_date", { ascending: false }).limit(limit);
    }

    const eventsResult = await query;

    if (eventsResult.error) {
      return new Response(`Export error: ${eventsResult.error.message}`, {
        status: 500,
      });
    }

    const events = (eventsResult.data ?? []) as CommunityEventRow[];
    const eventIds = events.map((item) => item.id);

    const rsvpsResult = eventIds.length
      ? await supabase
          .from("event_rsvps")
          .select("event_id, participant_clerk_id, status")
          .in("event_id", eventIds)
      : { data: [] as EventRsvpRow[], error: null };

    if (rsvpsResult.error) {
      return new Response(`Export error: ${rsvpsResult.error.message}`, {
        status: 500,
      });
    }

    const grouped = new Map<string, EventRsvpRow[]>();
    for (const row of (rsvpsResult.data ?? []) as EventRsvpRow[]) {
      const previous = grouped.get(row.event_id) ?? [];
      previous.push(row);
      grouped.set(row.event_id, previous);
    }

    const items = events.map((event) => {
      const ops = parseCommunityEventDescription(event.description).ops;
      const rsvps = grouped.get(event.id) ?? [];
      const yes = rsvps.filter((item) => item.status === "yes").length;
      const maybe = rsvps.filter((item) => item.status === "maybe").length;
      const no = rsvps.filter((item) => item.status === "no").length;
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
        rsvpCounts: { yes, maybe, no, total: yes + maybe + no },
        myRsvpStatus: null,
      };
    });

    const now = new Date();
    const floorMs = now.getTime() - days * 24 * 60 * 60 * 1000;
    const filteredEvents = items.filter((item) => {
      if (eventId && eventId.trim() !== "") return true; // Bypass date constraint if specific event
      const eventMs = new Date(`${item.eventDate}T12:00:00`).getTime();
      return Number.isFinite(eventMs) && eventMs >= floorMs;
    });

    const { items: contracts, isTruncated: isActionsTruncated } =
      await fetchUnifiedActionContracts(supabase, {
        limit: 2500,
        status: "approved",
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
      rubrique: "analytics_funnel_community",
      extension: "csv",
      date: now,
    });

    const isEventsTruncated = events.length >= limit;
    const isTruncated = isEventsTruncated || isActionsTruncated;

    const headers: Record<string, string> = {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    };
    if (isTruncated) {
      headers["X-Export-Warning"] = isEventsTruncated
        ? "Event dataset truncated to limit"
        : "Action dataset truncated to limit";
    }

    return new Response(`\uFEFF${lines.join("\n")}`, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Export error: ${message}`, { status: 500 });
  }
}
