import { buildTerritoryNominatimSearchUrlWithLimit, parseTerritoryCoordinates } from "./territory";
import type { TerritoryLocationPreference } from "@/lib/user-location-preference";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import {
  getArrondissementCityCenter,
  type ArrondissementCity,
  getTerritoryArrondissementCenter,
} from "./paris-arrondissements";

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number): number {
  return Number(value.toFixed(6));
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

export async function resolveMapFallbackReference(
  preference: TerritoryLocationPreference | null,
): Promise<GeoPoint | null> {
  if (!preference) {
    return null;
  }

  const point = await resolvePreferencePoint(preference);
  if (!point) {
    return null;
  }

  return point;
}

export async function resolveMapViewportFallback(
  preference: TerritoryLocationPreference | null,
): Promise<MapViewportState | null> {
  const point = await resolveMapFallbackReference(preference);
  return point ? buildViewportFromPoints([point]) : null;
}
