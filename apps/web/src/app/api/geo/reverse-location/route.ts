import { NextResponse } from "next/server";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";

export const runtime = "nodejs";
const REVERSE_LOCATION_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=86400",
};
const REVERSE_LOCATION_TIMEOUT_MS = 4_000;

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

function parseCoordinate(value: string | null): number | null {
  const parsed = Number(value ?? "");
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
  if (typeof lon !== "number" || typeof lat !== "number") {
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

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 60, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const url = new URL(request.url);
  const rawLat = url.searchParams.get("lat");
  const rawLon = url.searchParams.get("lon");
  const lat = parseCoordinate(rawLat);
  const lon = parseCoordinate(rawLon);

  if (lat === null || lon === null) {
    if (rawLat !== null || rawLon !== null) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      status: "ok",
      location: null,
    });
  }

  if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
    return NextResponse.json(
      { error: "Latitude or longitude out of range" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_LOCATION_TIMEOUT_MS);
  try {
    const response = await fetch(buildReverseUrl(lat, lon), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const location = response.ok
      ? ((await response.json()) as { features?: GeoplateformeReverseFeature[] })
          .features?.map(formatReverseLocation).find(Boolean) ?? null
      : null;

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
  } finally {
    clearTimeout(timeout);
  }
}
