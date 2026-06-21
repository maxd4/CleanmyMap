import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCoordinates } from "@/lib/actions/data-contract";
import type { MapViewportState } from "./map/map-export.types";

type MapCenter = [number, number];

export const PARIS_CENTER: MapCenter = [48.8566, 2.3522];
export const DEFAULT_ACTIONS_MAP_VIEWPORT: MapViewportState = {
  center: PARIS_CENTER,
  zoom: 11,
  bounds: {
    south: 48.35,
    west: 1.85,
    north: 49.25,
    east: 3.05,
  },
};

export function getActionsMapCenter(
  items: ActionMapItem[],
): MapCenter {
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
