import type { ActionMapItem, ActionMapViewportQuery } from "@/lib/actions/types";
import {
  mapItemCoordinates,
  mapItemType,
} from "@/lib/actions/contracts/contract-mappers";
import { fetchInitialNearestPollution } from "@/lib/actions/pollution/initial-nearest-pollution-http";
import type {
  InitialPollutionCandidateFetcher,
  MapReferencePoint,
} from "@/lib/actions/pollution/initial-nearest-pollution";
import {
  INITIAL_MAP_SEARCH_RADII_KM,
  haversineDistanceKm,
  isWithinRadialSearch,
} from "@/lib/actions/pollution/initial-nearest-pollution";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import { createActionsMapViewport } from "@/components/actions/actions-map-canvas.utils";
import { fetchMapActions } from "@/lib/actions/map/map-http";
import { buildViewportFromPoints } from "@/lib/geo/map-viewport-fallback";

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

export const INITIAL_PUBLIC_ACTION_SEARCH_RADII_KM = [5, 20, 75, 150] as const;
const INITIAL_PUBLIC_CITY_SEARCH_RADIUS_KM = 30;
const INITIAL_PUBLIC_ACTION_LIMIT = 300;

export type InitialPublicActionFetcher = (params: {
  viewport?: MapViewportState;
  limit: number;
}) => Promise<{ items: ActionMapItem[] }>;

export type InitialPublicMapViewportResolution = {
  reference: MapReferencePoint | null;
  viewport: MapViewportState | null;
  selectedItem: ActionMapItem | null;
  cityLabel: string | null;
  cityItems: ActionMapItem[];
  searchRadiiKm: number[];
};

function isValidCoordinatePair(
  latitude: number | null,
  longitude: number | null,
): latitude is number {
  return (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isPublicGeolocatedAction(item: ActionMapItem): boolean {
  const coordinates = mapItemCoordinates(item);
  return (
    item.status === "approved" &&
    mapItemType(item) === "action" &&
    isValidCoordinatePair(coordinates.latitude, coordinates.longitude)
  );
}

function normalizeCityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr-FR");
}

/**
 * The preparation contract carries the explicit commune selected for an
 * action. The location label is the existing public fallback when older
 * actions predate communeZoneLabel; it is never fabricated from coordinates.
 */
export function mapItemCityLabel(item: ActionMapItem): string | null {
  const preparationLabel = item.contract?.metadata.preparationData?.communeZoneLabel;
  if (typeof preparationLabel === "string" && preparationLabel.trim()) {
    return preparationLabel.trim();
  }

  const locationLabel = item.contract?.location.label ?? item.location_label;
  const postalCityMatch =
    typeof locationLabel === "string"
      ? locationLabel.match(/\b\d{5}\s+([^,→]+?)(?=\s*(?:→|,|$))/u)
      : null;
  if (postalCityMatch?.[1]) {
    return postalCityMatch[1].trim();
  }

  return typeof locationLabel === "string" && locationLabel.trim()
    ? locationLabel.trim()
    : null;
}

export function selectNearestPublicAction(
  items: ActionMapItem[],
  reference: MapReferencePoint,
  maxDistanceKm?: number,
): ActionMapItem | null {
  return items
    .filter(isPublicGeolocatedAction)
    .map((item) => ({
      item,
      distanceKm: haversineDistanceKm(reference, {
        latitude: mapItemCoordinates(item).latitude as number,
        longitude: mapItemCoordinates(item).longitude as number,
      }),
    }))
    .filter(({ distanceKm }) => maxDistanceKm === undefined || distanceKm <= maxDistanceKm)
    .sort((left, right) => {
      if (left.distanceKm !== right.distanceKm) {
        return left.distanceKm - right.distanceKm;
      }
      return left.item.id.localeCompare(right.item.id);
    })[0]?.item ?? null;
}

export function fetchInitialPublicActions({
  viewport,
  limit,
}: {
  viewport?: MapViewportState;
  limit: number;
}): Promise<{ items: ActionMapItem[] }> {
  return fetchMapActions({
    status: "approved",
    floorDate: null,
    limit,
    types: ["action"],
    viewport,
  });
}

function actionPoint(item: ActionMapItem | null | undefined): MapReferencePoint | null {
  if (!item) {
    return null;
  }
  const coordinates = mapItemCoordinates(item);
  if (!isValidCoordinatePair(coordinates.latitude, coordinates.longitude)) {
    return null;
  }
  return typeof coordinates.longitude === "number"
    ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
    : null;
}

function buildPublicCityViewport(items: ActionMapItem[]): MapViewportState | null {
  const points = items.flatMap((item) => {
    const point = actionPoint(item);
    return point ? [point] : [];
  });
  return buildViewportFromPoints(points);
}

/**
 * Resolves a useful public-action viewport without ever exposing the neutral
 * world viewport. Every action read is a bounded public map request: a radial
 * search around the reference, followed by one bounded city-sized read.
 */
export async function resolveInitialPublicMapViewport({
  reference,
  fetchActions = fetchInitialPublicActions,
}: {
  reference?: MapReferencePoint | null;
  fetchActions?: InitialPublicActionFetcher;
}): Promise<InitialPublicMapViewportResolution> {
  const searchRadiiKm: number[] = [];
  let selectedItem: ActionMapItem | null = null;
  let resolvedReference = reference ?? null;

  if (reference && isValidReferencePoint(reference)) {
    for (const radiusKm of INITIAL_PUBLIC_ACTION_SEARCH_RADII_KM) {
      searchRadiiKm.push(radiusKm);
      const response = await fetchActions({
        viewport: buildMapSearchViewport(reference, radiusKm),
        limit: INITIAL_PUBLIC_ACTION_LIMIT,
      });
      selectedItem = selectNearestPublicAction(response.items, reference, radiusKm);
      if (selectedItem) {
        break;
      }
    }
  } else {
    const response = await fetchActions({ limit: 1 });
    const firstPoint = actionPoint(response.items[0]);
    selectedItem = firstPoint
      ? selectNearestPublicAction(response.items, firstPoint)
      : null;
    resolvedReference = actionPoint(selectedItem ?? response.items[0]);
  }

  if (!selectedItem) {
    return {
      reference: resolvedReference,
      viewport: null,
      selectedItem: null,
      cityLabel: null,
      cityItems: [],
      searchRadiiKm,
    };
  }

  const selectedPoint = actionPoint(selectedItem);
  if (!selectedPoint) {
    return {
      reference: resolvedReference,
      viewport: null,
      selectedItem: null,
      cityLabel: null,
      cityItems: [],
      searchRadiiKm,
    };
  }
  resolvedReference ??= selectedPoint;

  const cityLabel = mapItemCityLabel(selectedItem);
  let cityItems = [selectedItem];
  const cityResponse = await fetchActions({
    viewport: buildMapSearchViewport(selectedPoint, INITIAL_PUBLIC_CITY_SEARCH_RADIUS_KM),
    limit: INITIAL_PUBLIC_ACTION_LIMIT,
  });
  if (cityLabel) {
    const cityKey = normalizeCityKey(cityLabel);
    cityItems = cityResponse.items.filter(
      (item) =>
        isPublicGeolocatedAction(item) &&
        mapItemCityLabel(item) !== null &&
        normalizeCityKey(mapItemCityLabel(item) as string) === cityKey,
    );
    if (!cityItems.some((item) => item.id === selectedItem?.id)) {
      cityItems.unshift(selectedItem);
    }
  }

  return {
    reference: resolvedReference,
    viewport:
      buildPublicCityViewport(cityItems) ??
      createActionsMapViewport([selectedPoint.latitude, selectedPoint.longitude], 13),
    selectedItem,
    cityLabel,
    cityItems,
    searchRadiiKm,
  };
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
