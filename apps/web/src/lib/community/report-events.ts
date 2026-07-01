import { unstable_cache } from "next/cache";
import {
  defaultCommunityEventOps,
  parseCommunityEventDescription,
} from "./event-ops";
import {
  loadCommunityEventRsvpSummaries,
  type CommunityEventRsvpSummary,
} from "./event-rsvp-summaries";
import type { CommunityEventItem } from "./http";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ReportCommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string | null;
  title: string;
  event_date: string;
  location_label: string;
  description: string | null;
};

const REPORT_COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS = 120;

function clampLimit(limit: number): number {
  return Math.min(120, Math.max(1, Math.trunc(limit)));
}

function buildReportCommunityEventsCacheKey(limit: number): string {
  return `limit:${clampLimit(limit)}`;
}

function toCommunityEventItem(
  event: ReportCommunityEventRow,
  summary: CommunityEventRsvpSummary | null,
): CommunityEventItem {
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
    myRsvpStatus: null,
  };
}

export async function loadCachedReportCommunityEvents(
  limit = 120,
): Promise<CommunityEventItem[]> {
  const normalizedLimit = clampLimit(limit);
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient();
      const eventsResult = await supabase
        .from("community_events")
        .select(
          "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
        )
        .order("event_date", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(normalizedLimit);

      if (eventsResult.error) {
        throw new Error(eventsResult.error.message);
      }

      const events = (eventsResult.data ?? []) as ReportCommunityEventRow[];
      if (events.length === 0) {
        return [];
      }

      const summaries = await loadCommunityEventRsvpSummaries(supabase, {
        eventIds: events.map((event) => event.id),
        userId: null,
      });
      const summaryByEventId = new Map(
        summaries.map((row) => [row.eventId, row] as const),
      );

      return events.map((event) =>
        toCommunityEventItem(event, summaryByEventId.get(event.id) ?? null),
      );
    },
    ["report-community-events", buildReportCommunityEventsCacheKey(normalizedLimit)],
    {
      revalidate: REPORT_COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
      tags: ["report-community-events"],
    },
  );

  return cached();
}
