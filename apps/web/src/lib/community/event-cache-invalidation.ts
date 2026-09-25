import { revalidateTag } from "next/cache";

export const COMMUNITY_EVENTS_CACHE_TAG = "community-events";
export const REPORT_COMMUNITY_EVENTS_CACHE_TAG = "report-community-events";
export const ROUTE_EVENT_PRESSURE_CACHE_TAG = "route-recommendation-event-pressure";

export const COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS = 900;
export const REPORT_COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS = 900;
export const ROUTE_EVENT_PRESSURE_CACHE_REVALIDATE_SECONDS = 900;

export function revalidateCommunityEventCaches(): void {
  revalidateTag(COMMUNITY_EVENTS_CACHE_TAG, "max");
  revalidateTag(REPORT_COMMUNITY_EVENTS_CACHE_TAG, "max");
  revalidateTag(ROUTE_EVENT_PRESSURE_CACHE_TAG, "max");
}
