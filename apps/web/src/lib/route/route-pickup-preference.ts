export const ROUTE_PICKUP_PREFERENCES = [
  "balanced",
  "waste",
  "cigarette_butts",
] as const;

export type RoutePickupPreference = (typeof ROUTE_PICKUP_PREFERENCES)[number];

export function isRoutePickupPreference(
  value: unknown,
): value is RoutePickupPreference {
  return (
    typeof value === "string" &&
    ROUTE_PICKUP_PREFERENCES.includes(value as RoutePickupPreference)
  );
}
