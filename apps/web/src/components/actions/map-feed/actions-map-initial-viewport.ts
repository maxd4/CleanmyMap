import type { ActionMapItem, ActionMapViewportQuery } from "@/lib/actions/types";
import { mapItemCoordinates } from "@/lib/actions/contracts/contract-mappers";
import { fetchInitialNearestPollution } from "@/lib/actions/pollution/initial-nearest-pollution-http";
import type {
  InitialPollutionCandidateFetcher,
  MapReferencePoint,
} from "@/lib/actions/pollution/initial-nearest-pollution";
import {
  INITIAL_MAP_SEARCH_RADII_KM,
  isWithinRadialSearch,
} from "@/lib/actions/pollution/initial-nearest-pollution";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import { createActionsMapViewport } from "@/components/actions/actions-map-canvas.utils";

export type { InitialPollutionCandidateFetcher, MapReferencePoint } from "@/lib/actions/pollution/initial-nearest-pollution";
export {
  DISTANCE_TIE_EPSILON_KM,
  INITIAL_MAP_SEARCH_RADII_KM,
  deriveReferenceFromBounds,
  haversineDistanceKm,
  isActivePollutionItem,
  isWithinRadialSearch,
  selectNearestActivePollution,
} from "@/lib/actions/pollution/initial-nearest-pollution";

export function selectMapReferencePoint(
  gpsReference: MapReferencePoint | null | undefined,
  residenceReference: MapReferencePoint | null | undefined,
): MapReferencePoint | null {
  return gpsReference ?? residenceReference ?? null;
}

export type InitialMapViewportResolution = {
  reference: MapReferencePoint;
  viewport: MapViewportState;
  selectedItem: ActionMapItem | null;
  searchRadiiKm: number[];
};

function isValidReferencePoint(point: MapReferencePoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function buildMapSearchViewport(
  reference: MapReferencePoint,
  radiusKm: number,
): MapViewportState {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm /
    (111.32 * Math.max(0.2, Math.cos((reference.latitude * Math.PI) / 180)));
  const bounds: ActionMapViewportQuery = {
    south: Math.max(-90, reference.latitude - latitudeDelta),
    west: Math.max(-180, reference.longitude - longitudeDelta),
    north: Math.min(90, reference.latitude + latitudeDelta),
    east: Math.min(180, reference.longitude + longitudeDelta),
    zoom: 10,
  };

  return {
    center: [reference.latitude, reference.longitude],
    zoom: 10,
    bounds,
  };
}

export async function resolveInitialMapViewport({
  reference,
  fetchInitialPollution = fetchInitialNearestPollution,
}: {
  reference: MapReferencePoint;
  fetchInitialPollution?: InitialPollutionCandidateFetcher;
}): Promise<InitialMapViewportResolution> {
  const searchRadiiKm: number[] = [];

  if (!isValidReferencePoint(reference)) {
    return {
      reference,
      viewport: createActionsMapViewport([0, 0], 12),
      selectedItem: null,
      searchRadiiKm,
    };
  }

  for (const radiusKm of INITIAL_MAP_SEARCH_RADII_KM) {
    searchRadiiKm.push(radiusKm);
    const response = await fetchInitialPollution({
      radiusKm,
      viewport: {
        ...buildMapSearchViewport(reference, radiusKm).bounds,
        zoom: null,
      },
    });
    const selectedItem = response.item && isWithinRadialSearch(
      reference,
      response.item,
      radiusKm,
    )
      ? response.item
      : null;
    if (selectedItem) {
      const coordinates = mapItemCoordinates(selectedItem);
      if (coordinates.latitude !== null && coordinates.longitude !== null) {
        return {
          reference,
          viewport: createActionsMapViewport([coordinates.latitude, coordinates.longitude], 15),
          selectedItem,
          searchRadiiKm,
        };
      }
    }
  }

  return {
    reference,
    viewport: createActionsMapViewport([reference.latitude, reference.longitude], 12),
    selectedItem: null,
    searchRadiiKm,
  };
}
