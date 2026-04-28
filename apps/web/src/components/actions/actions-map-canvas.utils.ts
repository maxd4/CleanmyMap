import type { LatLngTuple } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCoordinates } from "@/lib/actions/data-contract";

export const PARIS_CENTER: LatLngTuple = [48.8566, 2.3522];

export function getActionsMapCenter(
  items: ActionMapItem[],
): LatLngTuple {
  const first = items.find((item) => {
    const coords = mapItemCoordinates(item);
    return coords.latitude !== null && coords.longitude !== null;
  });

  if (!first) {
    return PARIS_CENTER;
  }

  const coords = mapItemCoordinates(first);
  if (coords.latitude === null || coords.longitude === null) {
    return PARIS_CENTER;
  }

  return [coords.latitude, coords.longitude];
}
