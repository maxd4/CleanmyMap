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

export type ReportCommunityEventsAvailability = "available" | "partial" | "unavailable";

export type ReportCommunityEventsLoadResult = {
  items: CommunityEventItem[];
  availability: ReportCommunityEventsAvailability;
};

const REPORT_COMMUNITY_EVENTS_MAX_PAGES = 10;

function clampLimit(limit: number): number {
  return Math.min(120, Math.max(1, Math.trunc(limit)));
}

function buildReportCommunityEventsCacheKey(limit: number, complete: boolean): string {
  return `${complete ? "complete" : "page"}:limit:${clampLimit(limit)}`;
}

async function loadReportCommunityEventsPage(
  pageSize: number,
  pageIndex: number,
): Promise<CommunityEventItem[]> {
  const supabase = getSupabaseServerClient(true);
  const eventsResult = await supabase
    .from("community_events")
    .select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
    )
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(pageIndex * pageSize, pageIndex * pageSize + pageSize - 1);

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
}

async function loadReportCommunityEvents(
  pageSize: number,
  complete: boolean,
): Promise<ReportCommunityEventsLoadResult> {
  const pagesToLoad = complete ? REPORT_COMMUNITY_EVENTS_MAX_PAGES : 1;
  const items: CommunityEventItem[] = [];

  for (let pageIndex = 0; pageIndex < pagesToLoad; pageIndex += 1) {
    const page = await loadReportCommunityEventsPage(pageSize, pageIndex);
    items.push(...page);
    if (page.length < pageSize) {
      return { items, availability: "available" };
    }
  }

  if (!complete) {
    return { items, availability: "available" };
  }

  // Probe the first row beyond the item budget so an exactly-full corpus is
  // not mislabeled partial. The probe is discarded and never enters metrics.
  const overflowProbe = await loadReportCommunityEventsPage(pageSize, pagesToLoad);
  return {
    items,
    availability: overflowProbe.length === 0 ? "available" : "partial",
  };
}

async function loadCachedReportCommunityEventsResult(
  limit: number,
  complete: boolean,
): Promise<ReportCommunityEventsLoadResult> {
  const normalizedLimit = clampLimit(limit);
  const cached = unstable_cache(
    () => loadReportCommunityEvents(normalizedLimit, complete),
    ["report-community-events", buildReportCommunityEventsCacheKey(normalizedLimit, complete)],
    {
      revalidate: REPORT_COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
      tags: [REPORT_COMMUNITY_EVENTS_CACHE_TAG],
    },
  );

  return cached();
}

/** Bounded compatibility read used by non-report operational consumers. */
export async function loadCachedReportCommunityEvents(
  limit = 120,
): Promise<CommunityEventItem[]> {
  const result = await loadCachedReportCommunityEventsResult(limit, false);
  return result.items;
}

/** Full report read, with an explicit partial state when the page budget is reached. */
export async function loadCachedReportCommunityEventsWithAvailability(
  limit = 120,
): Promise<ReportCommunityEventsLoadResult> {
  return loadCachedReportCommunityEventsResult(limit, true);
}
