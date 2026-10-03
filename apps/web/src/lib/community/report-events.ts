import { unstable_cache } from "next/cache";
import { toCommunityEventItem } from "./event-item";
import {
  indexCommunityEventRsvpSummaries,
  loadCommunityEventRsvpSummaries,
} from "./event-rsvp-summaries";
import type { CommunityEventItem } from "./http";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  REPORT_COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
  REPORT_COMMUNITY_EVENTS_CACHE_TAG,
} from "@/lib/community/event-cache-invalidation";

type ReportCommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string | null;
  title: string;
  event_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  location_source: import("./event-location").CommunityEventLocationSource | null;
  description: string | null;
};

function clampLimit(limit: number): number {
  return Math.min(120, Math.max(1, Math.trunc(limit)));
}

function buildReportCommunityEventsCacheKey(limit: number): string {
  return `limit:${clampLimit(limit)}`;
}

export async function loadCachedReportCommunityEvents(
  limit = 120,
): Promise<CommunityEventItem[]> {
  const normalizedLimit = clampLimit(limit);
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient(true);
      const eventsResult = await supabase
        .from("community_events")
        .select(
          "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
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
      const summaryByEventId = indexCommunityEventRsvpSummaries(summaries);

      return events.map((event) =>
        toCommunityEventItem(
          event,
          summaryByEventId.get(event.id) ?? null,
          { canEditOwnOps: false, myRsvpStatus: null },
        ),
      );
    },
    ["report-community-events", buildReportCommunityEventsCacheKey(normalizedLimit)],
    {
      revalidate: REPORT_COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
      tags: [REPORT_COMMUNITY_EVENTS_CACHE_TAG],
    },
  );

  return cached();
}
