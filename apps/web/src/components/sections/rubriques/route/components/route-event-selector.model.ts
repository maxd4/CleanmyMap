import type { CommunityEventItem } from "@/lib/community/http";
import {
  routeEventTemporalStatus,
  type RouteEventTemporalStatus,
} from "@/lib/route/route-planning-mode";

export type RouteEventDateFilter = "all" | "past" | "today" | "upcoming";

export function getRouteEventStatus(
  event: Pick<CommunityEventItem, "eventDate">,
  now = new Date(),
): RouteEventTemporalStatus {
  return routeEventTemporalStatus(event.eventDate, now);
}
export function filterRouteEventsByDate(
  events: readonly CommunityEventItem[],
  filter: RouteEventDateFilter,
  now = new Date(),
): CommunityEventItem[] {
  return events.filter((event) => {
    const status = getRouteEventStatus(event, now);
    return filter === "all" || status === (filter === "upcoming" ? "future" : filter);
  });
}

export function routeEventStatusLabel(
  status: RouteEventTemporalStatus,
  fr = true,
): string {
  if (status === "past") return fr ? "Passé" : "Past";
 if (status === "today") return fr ? "Aujourd’hui" : "Today";
 return fr ? "À venir" : "Upcoming";
}
