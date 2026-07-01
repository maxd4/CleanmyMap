import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const REVERSE_LOCATION_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
};
const REVERSE_LOCATION_REVALIDATE_SECONDS = 300;

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
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
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

function buildReverseLocationCacheKey(lat: number, lon: number): string {
  return [`lat:${lat.toFixed(4)}`, `lon:${lon.toFixed(4)}`].join("|");
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
  const url = new URL(request.url);
  const lat = parseCoordinate(url.searchParams.get("lat"));
  const lon = parseCoordinate(url.searchParams.get("lon"));

  if (lat === null || lon === null) {
    return NextResponse.json({
      status: "ok",
      location: null,
    });
  }

  try {
    const cached = unstable_cache(
      async () => {
        const response = await fetch(buildReverseUrl(lat, lon), {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          return null;
        }

        const body = (await response.json()) as { features?: GeoplateformeReverseFeature[] };
        return body.features?.map(formatReverseLocation).find(Boolean) ?? null;
      },
      ["reverse-location", buildReverseLocationCacheKey(lat, lon)],
      {
        revalidate: REVERSE_LOCATION_REVALIDATE_SECONDS,
        tags: ["reverse-location"],
      },
    );

    const location = await cached();

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
}
