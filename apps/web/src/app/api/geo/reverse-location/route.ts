import { NextResponse } from "next/server";
import { withServerRateLimit } from "@/lib/rate-limit/server";
import {
  buildPhotonReverseUrl,
  isWithinFranceTerritoryBounds,
  parsePhotonCoordinates,
} from "@/lib/geo/territory";
import { haversineDistanceKm } from "@/lib/geo/geodesic-distance";

export const runtime = "nodejs";
const REVERSE_LOCATION_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=86400",
};
const REVERSE_LOCATION_TIMEOUT_MS = 4_000;
const REVERSE_RESULT_MAX_DISTANCE_KM = 10;

type ReverseLocation = {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number | null;
};

type GeoplateformeReverseFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    label?: string;
    name?: string;
    city?: string;
    postcode?: string;
    context?: string;
    type?: string;
    kind?: string;
    _type?: string;
    score?: number;
    distance?: number;
  };
};

type PhotonReverseFeature = {
  geometry?: { coordinates?: unknown };
  properties?: {
    name?: unknown;
    street?: unknown;
    housenumber?: unknown;
    postcode?: unknown;
    city?: unknown;
    town?: unknown;
    village?: unknown;
    state?: unknown;
    country?: unknown;
    countrycode?: unknown;
  };
};

type PhotonReverseLookup = {
  location: ReverseLocation;
  countryCode: string | null;
};

function parseCoordinate(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

function cleanPart(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function buildReverseUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    index: "address",
    limit: "1",
  });

  return `https://data.geopf.fr/geocodage/reverse?${params.toString()}`;
}

function formatReverseLocation(feature: GeoplateformeReverseFeature): ReverseLocation | null {
  const lon = feature.geometry?.coordinates?.[0];
  const lat = feature.geometry?.coordinates?.[1];
  if (
    typeof lon !== "number" ||
    typeof lat !== "number" ||
    !isValidLatitude(lat) ||
    !isValidLongitude(lon)
  ) {
    return null;
  }

  const properties = feature.properties ?? {};
  const city = cleanPart(properties.city);
  const postcode = cleanPart(properties.postcode);
  const label = city || cleanPart(properties.label) || cleanPart(properties.name) || "Position détectée";
  const subtitle =
    [postcode, city].filter(Boolean).join(" ") ||
    cleanPart(properties.context) ||
    cleanPart(properties.type) ||
    cleanPart(properties.kind) ||
    cleanPart(properties._type) ||
    "Lieu géocodé";

  return {
    label,
    subtitle,
    latitude: lat,
    longitude: lon,
    importance: typeof properties.score === "number" ? properties.score : null,
  };
}

function formatPhotonReverseLocation(feature: PhotonReverseFeature): ReverseLocation | null {
  const coordinates = parsePhotonCoordinates(feature);
  if (!coordinates) return null;

  const properties = feature.properties ?? {};
  const street = [properties.housenumber, properties.street]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");
  const city = cleanPart(
    [properties.city, properties.town, properties.village]
      .find((value) => typeof value === "string" && value.trim()) as string | undefined,
  );
  const label = cleanPart(String(properties.name ?? "")) || street || city || "Position détectée";
  const subtitle = [
    cleanPart(String(properties.postcode ?? "")),
    city,
    cleanPart(String(properties.state ?? "")),
    cleanPart(String(properties.country ?? "")),
  ].filter(Boolean).join(" · ") || "Lieu géocodé";

  return {
    label,
    subtitle,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    importance: null,
  };
}

function isNearRequestedPoint(
  location: ReverseLocation,
  latitude: number,
  longitude: number,
): boolean {
  return haversineDistanceKm(
    [latitude, longitude],
    [location.latitude, location.longitude],
  ) <= REVERSE_RESULT_MAX_DISTANCE_KM;
}

async function loadPhotonReverseLocation(
  latitude: number,
  longitude: number,
): Promise<PhotonReverseLookup | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_LOCATION_TIMEOUT_MS);
  try {
    const response = await fetch(buildPhotonReverseUrl(latitude, longitude), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { features?: PhotonReverseFeature[] };
    for (const feature of payload.features ?? []) {
      const location = formatPhotonReverseLocation(feature);
      if (!location || !isNearRequestedPoint(location, latitude, longitude)) continue;
      const rawCountryCode = feature.properties?.countrycode;
      return {
        location,
        countryCode: typeof rawCountryCode === "string" && rawCountryCode.trim()
          ? rawCountryCode.trim().toLowerCase()
          : null,
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadGeoplateformeReverseLocation(
  latitude: number,
  longitude: number,
): Promise<ReverseLocation | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_LOCATION_TIMEOUT_MS);
  try {
    const response = await fetch(buildReverseUrl(latitude, longitude), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { features?: GeoplateformeReverseFeature[] };
    for (const feature of payload.features ?? []) {
      const location = formatReverseLocation(feature);
      if (location && isNearRequestedPoint(location, latitude, longitude)) {
        return location;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  return withServerRateLimit(request, { limit: 60, window: 60 }, async () => {

  const url = new URL(request.url);
  const rawLat = url.searchParams.get("lat");
  const rawLon = url.searchParams.get("lon");
  if (rawLat === null && rawLon === null) {
    return NextResponse.json({
      status: "ok",
      location: null,
    });
  }

  if (rawLat === null || rawLon === null) {
    return NextResponse.json(
      { error: "Latitude and longitude are required together" },
      { status: 400 },
    );
  }

  const lat = parseCoordinate(rawLat);
  const lon = parseCoordinate(rawLon);

  if (lat === null || lon === null) {
    return NextResponse.json(
      { error: "Invalid latitude or longitude" },
      { status: 400 },
    );
  }

  if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
    return NextResponse.json(
      { error: "Latitude or longitude out of range" },
      { status: 400 },
    );
  }

  try {
    // The bbox only decides whether Geoplateforme is worth probing. Photon
    // country metadata remains the required France check before its result is
    // accepted as the metropolitan reverse provider.
    const shouldProbeGeoplateforme = isWithinFranceTerritoryBounds(lat, lon);
    const geoplateformeLocation = shouldProbeGeoplateforme
      ? await loadGeoplateformeReverseLocation(lat, lon)
      : null;
    const photonLookup = await loadPhotonReverseLocation(lat, lon);
    const location = !shouldProbeGeoplateforme
      ? photonLookup?.location ?? null
      : photonLookup?.countryCode === "fr"
        ? geoplateformeLocation ?? photonLookup.location
        : photonLookup?.location ?? null;

    return NextResponse.json({
      status: "ok",
      location,
    }, {
      headers: REVERSE_LOCATION_CACHE_HEADERS,
    });
  } catch {
    return NextResponse.json({
      status: "ok",
      location: null,
    }, {
      headers: REVERSE_LOCATION_CACHE_HEADERS,
    });
  }
  });
}
