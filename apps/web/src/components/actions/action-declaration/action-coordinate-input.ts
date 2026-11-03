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

function parseDmsComponent(degrees: string, minutes: string | undefined, seconds: string | undefined, hemisphere: string): number | null {
  const degreeValue = toDecimal(degrees);
  const minuteValue = minutes === undefined ? 0 : toDecimal(minutes);
  const secondValue = seconds === undefined ? 0 : toDecimal(seconds);
  if (degreeValue === null || minuteValue === null || secondValue === null || minuteValue >= 60 || secondValue >= 60) return null;
  const absolute = Math.abs(degreeValue) + minuteValue / 60 + secondValue / 3600;
  const normalizedHemisphere = hemisphere.toUpperCase();
  if (!["N", "S", "E", "W"].includes(normalizedHemisphere)) return null;
  return normalizedHemisphere === "S" || normalizedHemisphere === "W" ? -absolute : absolute;
}

function parseDmsPair(value: string): ActionLocationCoordinates | null {
  const component = `(${DMS_NUMBER})\\s*(?:°|º|d)\\s*(?:(\\d{1,2})(?:'|’|m)\\s*)?(?:(\\d{1,2}(?:[.,]\\d+)?)(?:\\"|”|s)\\s*)?([NSWE])`;
  const match = value.trim().match(new RegExp(`^${component}\\s*[,;|/]?\\s*${component}$`, "i"));
  if (!match) return null;

  const latitude = parseDmsComponent(match[1], match[2], match[3], match[4]);
  const longitude = parseDmsComponent(match[5], match[6], match[7], match[8]);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return buildPair(latitude, longitude);
}

function parseCoordinateText(value: string): ActionLocationCoordinates | null {
  return parseDmsPair(value) ?? parseDecimalPair(value);
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
    const urlCoordinatePatterns = [
      /@\s*([-+]?\d{1,3}(?:[.,]\d+)?)[,\s]+([-+]?\d{1,3}(?:[.,]\d+)?)/i,
      /(?:[?&#](?:q|query|ll)=|\/search\/)([-+]?\d{1,3}(?:[.,]\d+)?)[,\s]+([-+]?\d{1,3}(?:[.,]\d+)?)/i,
    ];
    for (const pattern of urlCoordinatePatterns) {
      const match = trimmed.match(pattern);
      if (!match) continue;
      const pair = buildPair(toDecimal(match[1]), toDecimal(match[2]));
      if (pair) return pair;
    }
  }

  return parseCoordinateText(trimmed);
}
