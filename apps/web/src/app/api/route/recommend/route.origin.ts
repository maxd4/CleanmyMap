import {
  getTerritoryArrondissementCenter,
  type TerritoryArrondissement,
} from "@/lib/geo/paris-arrondissements";
import type { RoutePlannerOrigin } from "@/lib/route/route-planner";

export function resolveRouteOrigin(
  explicitOrigin: RoutePlannerOrigin | undefined,
  arrondissement: TerritoryArrondissement | undefined,
): RoutePlannerOrigin | null {
  if (explicitOrigin) {
    return explicitOrigin;
  }

  if (arrondissement === undefined) {
    return null;
  }

  const center = getTerritoryArrondissementCenter(arrondissement);
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    return null;
  }

  return {
    latitude: center.lat,
    longitude: center.lng,
    source: "approximate_saved_area",
  };
}
