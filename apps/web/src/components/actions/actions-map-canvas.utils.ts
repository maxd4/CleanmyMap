import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCoordinates } from "@/lib/actions/data-contract";
import type { MapViewportState } from "./map/map-export.types";

type MapCenter = [number, number];

/**
 * Neutral coordinates used until the browser location or residence fallback
 * has been resolved. They are deliberately not a real territory default.
 */
export const NEUTRAL_MAP_CENTER: MapCenter = [0, 0];
const BASE_MAP_BOUND_SPAN = {
  latitude: 0.028,
  longitude: 0.038,
};

function createViewportBounds(center: MapCenter, zoom: number): MapViewportState["bounds"] {
  const normalizedZoom = Math.max(2, Math.min(16, Math.round(zoom)));
  const zoomScale = 2 ** (15 - normalizedZoom);
  const latHalfSpan = (BASE_MAP_BOUND_SPAN.latitude * zoomScale) / 2;
  const lonHalfSpan = (BASE_MAP_BOUND_SPAN.longitude * zoomScale) / 2;

  return {
    south: Number(Math.max(-90, center[0] - latHalfSpan).toFixed(6)),
    west: Number(Math.max(-180, center[1] - lonHalfSpan).toFixed(6)),
    north: Number(Math.min(90, center[0] + latHalfSpan).toFixed(6)),
    east: Number(Math.min(180, center[1] + lonHalfSpan).toFixed(6)),
  };
}

export function createActionsMapViewport(
  center: MapCenter,
  zoom = 13,
): MapViewportState {
  return {
    center,
    zoom,
    bounds: createViewportBounds(center, zoom),
  };
}

export const DEFAULT_ACTIONS_MAP_VIEWPORT: MapViewportState =
  createActionsMapViewport(NEUTRAL_MAP_CENTER, 3);

export function getActionsMapCenter(
  items: ActionMapItem[],
): MapCenter {
  const first = items.find((item) => {
    const coords = mapItemCoordinates(item);
    return coords.latitude !== null && coords.longitude !== null;
  });

  if (!first) {
    return NEUTRAL_MAP_CENTER;
  }

  const coords = mapItemCoordinates(first);
  if (coords.latitude === null || coords.longitude === null) {
    return NEUTRAL_MAP_CENTER;
  }

  return [coords.latitude, coords.longitude];
}
