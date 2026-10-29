export function toOptionalNumber(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A coordinate is usable only as a complete, bounded latitude/longitude pair. */
export function hasValidCoordinatePair(latitude: string, longitude: string): boolean {
  const parsedLatitude = toOptionalNumber(latitude);
  const parsedLongitude = toOptionalNumber(longitude);
  return (
    parsedLatitude !== undefined &&
    parsedLongitude !== undefined &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180
  );
}

export function toRequiredNumber(input: string, fallback: number): number {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}
