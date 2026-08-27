import type { ActionMapItem, ActionMapViewportQuery } from "../types";
import { mapItemCoordinates, mapItemType } from "../contract-mappers";
import type { PollutionScoreReferences } from "./pollution-score";
import { resolveItemPollutionScores } from "@/components/actions/map-marker-categories";

export const INITIAL_MAP_SEARCH_RADII_KM = [5, 20, 75, 150] as const;
export const DISTANCE_TIE_EPSILON_KM = 0.001;

export type MapReferencePoint = {
  latitude: number;
  longitude: number;
};

export type InitialPollutionSearchBounds = ActionMapViewportQuery & {
  radiusKm: number;
};

export function deriveReferenceFromBounds(
  bounds: ActionMapViewportQuery,
): MapReferencePoint {
  return {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2,
  };
}

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

export function isWithinRadialSearch(
  reference: MapReferencePoint,
  item: ActionMapItem,
  radiusKm: number,
): boolean {
  const coordinates = mapItemCoordinates(item);
  if (coordinates.latitude === null || coordinates.longitude === null) {
    return false;
  }

  return haversineDistanceKm(reference, {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  }) <= radiusKm + DISTANCE_TIE_EPSILON_KM;
}

export function isActivePollutionItem(
  item: ActionMapItem,
  pollutionScoreReferences: PollutionScoreReferences,
): boolean {
  if (mapItemType(item) !== "spot") {
    return false;
  }

  if ((item.source_status ?? "").toLowerCase() === "cleaned") {
    return false;
  }

  return resolveItemPollutionScores(item, pollutionScoreReferences).severityScore > 0;
}

export function selectNearestActivePollution(
  items: ActionMapItem[],
  reference: MapReferencePoint,
  pollutionScoreReferences: PollutionScoreReferences,
  radiusKm?: number,
): ActionMapItem | null {
  let selected: ActionMapItem | null = null;
  let selectedDistance = Number.POSITIVE_INFINITY;
  let selectedSeverity = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    if (
      !isActivePollutionItem(item, pollutionScoreReferences) ||
      (radiusKm !== undefined && !isWithinRadialSearch(reference, item, radiusKm))
    ) {
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
    const candidateSeverity = resolveItemPollutionScores(
      item,
      pollutionScoreReferences,
    ).severityScore;
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

export type InitialPollutionCandidateFetcher = (params: {
  radiusKm: number;
  viewport: ActionMapViewportQuery;
}) => Promise<{ item: ActionMapItem | null }>;
