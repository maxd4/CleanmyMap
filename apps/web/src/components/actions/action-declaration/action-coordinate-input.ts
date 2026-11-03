import type { ActionLocationCoordinates } from "@/lib/actions/types";

const DECIMAL_NUMBER = "[-+]?\\d{1,3}(?:[.,]\\d+)?";
const DMS_NUMBER = "\\d{1,3}(?:[.,]\\d+)?";

function toDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
function isCoordinatePair(latitude: number, longitude: number): boolean {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function buildPair(latitude: number | null, longitude: number | null): ActionLocationCoordinates | null {
  if (latitude === null || longitude === null || !isCoordinatePair(latitude, longitude)) return null;
  return {
    latitude: Math.round(latitude * 1e7) / 1e7,
    longitude: Math.round(longitude * 1e7) / 1e7,
  };
}

function parseDecimalPair(value: string): ActionLocationCoordinates | null {
  const trimmed = value.trim();
  const match = trimmed.match(new RegExp(`^(${DECIMAL_NUMBER})\\s*(?:,|;|\\||\\s)\\s*(${DECIMAL_NUMBER})$`));
  if (!match) return null;

  const first = toDecimal(match[1]);
  const second = toDecimal(match[2]);
  if (first === null || second === null) return null;

  // A decimal pair is accepted only when its separator makes the order clear.
  // A comma between two comma-decimal values is intentionally rejected.
  if (trimmed.includes(",") && /\d,\d/.test(trimmed) && !trimmed.includes(";") && !trimmed.includes("|")) {
    return null;
  }
  return buildPair(first, second);
}

function parseDmsComponent(
  degrees: string,
  minutes: string | undefined,
  seconds: string | undefined,
  hemisphere: string,
  allowedHemisphere: "NS" | "EW",
): number | null {
  const degreeValue = toDecimal(degrees);
  const minuteValue = minutes === undefined ? 0 : toDecimal(minutes);
  const secondValue = seconds === undefined ? 0 : toDecimal(seconds);
  if (degreeValue === null || minuteValue === null || secondValue === null || minuteValue >= 60 || secondValue >= 60) return null;
  const absolute = Math.abs(degreeValue) + minuteValue / 60 + secondValue / 3600;
  const normalizedHemisphere = hemisphere.toUpperCase();
  if (!allowedHemisphere.includes(normalizedHemisphere)) return null;
  return normalizedHemisphere === "S" || normalizedHemisphere === "W" ? -absolute : absolute;
}

function parseDmsPair(value: string): ActionLocationCoordinates | null {
  const component = `(${DMS_NUMBER})\\s*(?:°|º|d)\\s*(?:(\\d{1,2})(?:'|’|m)\\s*)?(?:(\\d{1,2}(?:[.,]\\d+)?)(?:\\"|”|s)\\s*)?([NSWE])`;
  const match = value.trim().match(new RegExp(`^${component}\\s*[,;|/]?\\s*${component}$`, "i"));
  if (!match) return null;

  const latitude = parseDmsComponent(match[1], match[2], match[3], match[4], "NS");
  const longitude = parseDmsComponent(match[5], match[6], match[7], match[8], "EW");
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return buildPair(latitude, longitude);
}

function parseCoordinateText(value: string): ActionLocationCoordinates | null {
  return parseDmsPair(value) ?? parseDecimalPair(value);
}

function parseExplicitUrlCoordinate(value: string): ActionLocationCoordinates | null {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  decoded = decoded.replace(/\+/g, " ").trim();

  const parsedText = parseCoordinateText(decoded);
  if (parsedText) return parsedText;

  const decimalMatch = decoded.match(new RegExp(`^(${DECIMAL_NUMBER})\\s*,\\s*(${DECIMAL_NUMBER})$`));
  if (!decimalMatch) return null;
  return buildPair(toDecimal(decimalMatch[1]), toDecimal(decimalMatch[2]));
}

function parseGoogleMapsPathCoordinate(url: URL): ActionLocationCoordinates | null {
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }

  const explicitPath = path.match(/\/maps\/(?:place|search)\/([^/]+)/i);
  if (explicitPath) {
    const pair = parseExplicitUrlCoordinate(explicitPath[1]);
    if (pair) return pair;
  }

  // Keep the existing coordinate-only Google Maps URL contract. In a place URL,
  // the @ segment is deliberately ignored because it identifies the viewport.
  if (/^\/maps\/@/i.test(path)) {
    const viewportSegment = path.slice("/maps/@".length).split(/[/?]/, 1)[0];
    const coordinateText = viewportSegment.split(",").slice(0, 2).join(",");
    return parseExplicitUrlCoordinate(coordinateText);
  }

  return null;
}

function parseGoogleMapsUrl(url: URL): ActionLocationCoordinates | null {
  for (const key of ["destination", "query", "q", "ll"] as const) {
    const candidate = url.searchParams.get(key);
    if (!candidate) continue;
    const pair = parseExplicitUrlCoordinate(candidate);
    if (pair) return pair;
  }
  return parseGoogleMapsPathCoordinate(url);
}

export function parseActionCoordinateInput(value: string): ActionLocationCoordinates | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let googleMapsUrl: URL | null = null;
  try {
    googleMapsUrl = new URL(trimmed);
  } catch {
    googleMapsUrl = null;
  }
  if (
    googleMapsUrl &&
    (googleMapsUrl.hostname.toLowerCase() === "maps.google.com" ||
      (["google.com", "www.google.com"].includes(googleMapsUrl.hostname.toLowerCase()) &&
        googleMapsUrl.pathname.startsWith("/maps")))
  ) {
    const pair = parseGoogleMapsUrl(googleMapsUrl);
    if (pair) return pair;
  }

  return parseCoordinateText(trimmed);
}
