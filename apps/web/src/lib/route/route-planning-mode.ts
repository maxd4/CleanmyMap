export type RoutePlanningMode =
  | { type: "free" }
  | { type: "event-centered"; eventId: string };

export const FREE_ROUTE_PLANNING_MODE: RoutePlanningMode = { type: "free" };

export type RouteEventTemporalStatus =
  | "past"
  | "today"
  | "future";

export function routeEventTemporalStatus(
  eventDate: string,
  now = new Date(),
): RouteEventTemporalStatus {
  const today = now.toISOString().slice(0, 10);
  if (eventDate < today) return "past";
  if (eventDate === today) return "today";
  return "future";
}

export function routeEventAgeDays(
  eventDate: string,
  now = new Date(),
): number | null {
  const eventTime = new Date(`${eventDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(eventTime)) return null;
  const ageDays = (now.getTime() - eventTime) / 86_400_000;
  return ageDays >= 0 ? ageDays : null;
}
