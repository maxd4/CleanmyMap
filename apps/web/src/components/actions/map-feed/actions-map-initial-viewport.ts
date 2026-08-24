import type { ActionMapItem, ActionMapViewportQuery } from "@/lib/actions/types";
import { fetchMapActions } from "@/lib/actions/map-http";
import { mapItemCoordinates, mapItemType } from "@/lib/actions/contract-mappers";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "@/lib/actions/pollution-score";
import {
  resolveItemPollutionScores,
} from "@/components/actions/map-marker-categories";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import { createActionsMapViewport } from "@/components/actions/actions-map-canvas.utils";

export type MapReferencePoint = {
  latitude: number;
  longitude: number;
};

export const INITIAL_MAP_SEARCH_RADII_KM = [5, 20, 75, 150] as const;
const DISTANCE_TIE_EPSILON_KM = 0.001;

export function selectMapReferencePoint(
  gpsReference: MapReferencePoint | null | undefined,
  residenceReference: MapReferencePoint | null | undefined,
): MapReferencePoint | null {
  return gpsReference ?? residenceReference ?? null;
}

export type InitialMapActionsFetcher = (params: {
  status: "approved";
  floorDate: null;
  limit: number;
  types: "all";
  viewport: MapViewportState;
}) => Promise<{ items: ActionMapItem[] }>;

export type InitialMapViewportResolution = {
  reference: MapReferencePoint;
  viewport: MapViewportState;
  selectedItem: ActionMapItem | null;
  searchRadiiKm: number[];
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  left: MapReferencePoint,
  right: MapReferencePoint,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(right.latitude - left.latitude);
  const dLon = toRadians(right.longitude - left.longitude);
  const latitudeFactor =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(left.latitude)) *
      Math.cos(toRadians(right.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(latitudeFactor), Math.sqrt(1 - latitudeFactor));
}

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
  const longitudeDelta = radiusKm / (111.32 * Math.max(0.2, Math.cos(toRadians(reference.latitude))));
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

export function isActivePollutionItem(
  item: ActionMapItem,
): boolean {
  if (mapItemType(item) !== "spot") {
    return false;
  }

  return (
    item.source_status !== "cleaned" &&
    resolveItemPollutionScores(item, DEFAULT_POLLUTION_SCORE_REFERENCES).severityScore > 0
  );
}

export function selectNearestActivePollution(
  items: ActionMapItem[],
  reference: MapReferencePoint,
  pollutionScoreReferences: PollutionScoreReferences = DEFAULT_POLLUTION_SCORE_REFERENCES,
): ActionMapItem | null {
  let selected: ActionMapItem | null = null;
  let selectedDistance = Number.POSITIVE_INFINITY;
  let selectedSeverity = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    if (!isActivePollutionItem(item)) {
      continue;
    }

    const coordinates = mapItemCoordinates(item);
    if (coordinates.latitude === null || coordinates.longitude === null) {
      continue;
    }

    const candidateDistance = haversineDistanceKm(reference, {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
    const candidateSeverity = resolveItemPollutionScores(item, pollutionScoreReferences).severityScore;
    const isCloser = candidateDistance < selectedDistance - DISTANCE_TIE_EPSILON_KM;
    const isEquivalentAndMoreSevere =
      Math.abs(candidateDistance - selectedDistance) <= DISTANCE_TIE_EPSILON_KM &&
      candidateSeverity > selectedSeverity;

    if (isCloser || isEquivalentAndMoreSevere) {
      selected = item;
      selectedDistance = candidateDistance;
      selectedSeverity = candidateSeverity;
    }
  }

  return selected;
}

export async function resolveInitialMapViewport({
  reference,
    fetchActions = fetchMapActions,
  pollutionScoreReferences = DEFAULT_POLLUTION_SCORE_REFERENCES,
}: {
  reference: MapReferencePoint;
  fetchActions?: InitialMapActionsFetcher;
  pollutionScoreReferences?: PollutionScoreReferences | null;
}): Promise<InitialMapViewportResolution> {
  const references = pollutionScoreReferences ?? DEFAULT_POLLUTION_SCORE_REFERENCES;
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
    const response = await fetchActions({
      status: "approved",
      floorDate: null,
      limit: 120,
      types: "all",
      viewport: buildMapSearchViewport(reference, radiusKm),
    });
    const selectedItem = selectNearestActivePollution(response.items, reference, references);
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
