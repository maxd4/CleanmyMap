import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCoordinates } from "@/lib/actions/data-contract";
import type { MapViewportState } from "./map/map-export.types";

type MapCenter = [number, number];

export const PARIS_CENTER: MapCenter = [48.8566, 2.3522];
const PARIS_INTRAMUROS_BOUND_SPAN = {
  latitude: 0.092,
  longitude: 0.122,
};

function createViewportBounds(center: MapCenter, zoom: number): MapViewportState["bounds"] {
  const normalizedZoom = Math.max(10, Math.min(16, Math.round(zoom)));
  const zoomScale = normalizedZoom >= 14 ? 0.75 : normalizedZoom >= 13 ? 1 : 1.2;
  const latHalfSpan = (PARIS_INTRAMUROS_BOUND_SPAN.latitude * zoomScale) / 2;
  const lonHalfSpan = (PARIS_INTRAMUROS_BOUND_SPAN.longitude * zoomScale) / 2;

  return {
    south: Number((center[0] - latHalfSpan).toFixed(6)),
    west: Number((center[1] - lonHalfSpan).toFixed(6)),
    north: Number((center[0] + latHalfSpan).toFixed(6)),
    east: Number((center[1] + lonHalfSpan).toFixed(6)),
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
  createActionsMapViewport(PARIS_CENTER, 13);

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
