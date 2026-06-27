import { buildTerritoryNominatimSearchUrlWithLimit, parseTerritoryCoordinates } from "./territory";
import type { TerritoryLocationPreference } from "@/lib/user-location-preference";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import {
  getArrondissementCityCenter,
  type ArrondissementCity,
  getTerritoryArrondissementCenter,
} from "./paris-arrondissements";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type MajorCity = GeoPoint & {
  label: string;
};

const MAJOR_FRENCH_CITIES: MajorCity[] = [
  { label: "Paris", latitude: 48.8566, longitude: 2.3522 },
  { label: "Lyon", latitude: 45.764, longitude: 4.8357 },
  { label: "Marseille", latitude: 43.2965, longitude: 5.3698 },
  { label: "Lille", latitude: 50.6292, longitude: 3.0573 },
  { label: "Bordeaux", latitude: 44.8378, longitude: -0.5792 },
  { label: "Toulouse", latitude: 43.6045, longitude: 1.444 },
  { label: "Nantes", latitude: 47.2184, longitude: -1.5536 },
  { label: "Rennes", latitude: 48.1173, longitude: -1.6778 },
  { label: "Strasbourg", latitude: 48.5734, longitude: 7.7521 },
  { label: "Montpellier", latitude: 43.6108, longitude: 3.8767 },
  { label: "Nice", latitude: 43.7102, longitude: 7.262 },
  { label: "Grenoble", latitude: 45.1885, longitude: 5.7245 },
  { label: "Rouen", latitude: 49.4432, longitude: 1.0993 },
  { label: "Brest", latitude: 48.3904, longitude: -4.4861 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(left: GeoPoint, right: GeoPoint): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(right.latitude - left.latitude);
  const dLon = toRadians(right.longitude - left.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(left.latitude)) *
      Math.cos(toRadians(right.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(value: number): number {
  return Number(value.toFixed(6));
}

export function findNearestMajorCity(point: GeoPoint): MajorCity {
  let nearest = MAJOR_FRENCH_CITIES[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const city of MAJOR_FRENCH_CITIES) {
    const candidateDistance = distanceKm(point, city);
    if (candidateDistance < nearestDistance) {
      nearest = city;
      nearestDistance = candidateDistance;
    }
  }

  return nearest;
}

export function buildViewportFromPoints(points: GeoPoint[]): MapViewportState | null {
  if (points.length === 0) {
    return null;
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.06);
  const lngSpan = Math.max(maxLng - minLng, 0.08);
  const latPadding = Math.max(latSpan * 0.18, 0.02);
  const lngPadding = Math.max(lngSpan * 0.18, 0.02);

  const bounds = {
    south: normalize(clamp(minLat - latPadding, -90, 90)),
    west: normalize(clamp(minLng - lngPadding, -180, 180)),
    north: normalize(clamp(maxLat + latPadding, -90, 90)),
    east: normalize(clamp(maxLng + lngPadding, -180, 180)),
  };

  const centerLat = (bounds.south + bounds.north) / 2;
  const centerLng = (bounds.west + bounds.east) / 2;
  const adjustedLngSpan =
    (bounds.east - bounds.west) * Math.max(0.6, Math.cos(toRadians(centerLat)));
  const effectiveSpan = Math.max(bounds.north - bounds.south, adjustedLngSpan);

  const zoom =
    effectiveSpan <= 0.03
      ? 13.5
      : effectiveSpan <= 0.06
        ? 13
        : effectiveSpan <= 0.12
          ? 12
          : effectiveSpan <= 0.24
            ? 11
            : effectiveSpan <= 0.5
              ? 10
              : 9;

  return {
    center: [normalize(centerLat), normalize(centerLng)],
    zoom,
    bounds,
  };
}

async function geocodeTerritoryLabel(label: string): Promise<GeoPoint | null> {
  const url = buildTerritoryNominatimSearchUrlWithLimit(label, 1);
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    const coordinates = parseTerritoryCoordinates(payload[0]);
    return coordinates ? {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    } : null;
  } catch {
    return null;
  }
}

async function resolvePreferencePoint(
  preference: TerritoryLocationPreference,
): Promise<GeoPoint | null> {
  if (preference.level === "arrondissement" && preference.arrondissement !== null) {
    if (preference.arrondissementCity === "Paris") {
      const center = getTerritoryArrondissementCenter(preference.arrondissement);
      return {
        latitude: center.lat,
        longitude: center.lng,
      };
    }

    if (preference.arrondissementCity === "Lyon" || preference.arrondissementCity === "Marseille") {
      const cityCenter = getArrondissementCityCenter(
        preference.arrondissementCity as ArrondissementCity,
      );
      const geocoded = await geocodeTerritoryLabel(preference.label);
      return geocoded ?? {
        latitude: cityCenter.lat,
        longitude: cityCenter.lng,
      };
    }
  }

  const geocoded = await geocodeTerritoryLabel(preference.label);
  if (geocoded) {
    return geocoded;
  }

  return preference.arrondissement !== null && preference.arrondissementCity
    ? (() => {
        const cityCenter = getArrondissementCityCenter(
          preference.arrondissementCity as ArrondissementCity,
        );
        return {
          latitude: cityCenter.lat,
          longitude: cityCenter.lng,
        };
      })()
    : null;
}

export async function resolveMapViewportFallback(
  preference: TerritoryLocationPreference | null,
): Promise<MapViewportState | null> {
  if (!preference) {
    return null;
  }

  const point = await resolvePreferencePoint(preference);
  if (!point) {
    return null;
  }

  const nearestCity = findNearestMajorCity(point);
  return buildViewportFromPoints([point, nearestCity]);
}
