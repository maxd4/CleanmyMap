export type GeographicBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

// Paris + proche banlieue: enough to cover the arrondissements and the
// immediate suburbs used by the map/form flows.
export const GREATER_PARIS_BOUNDS: GeographicBounds = {
  west: 2.12,
  south: 48.74,
  east: 2.55,
  north: 48.98,
};

export function buildGreaterParisViewbox(): string {
  return [
    GREATER_PARIS_BOUNDS.west,
    GREATER_PARIS_BOUNDS.north,
    GREATER_PARIS_BOUNDS.east,
    GREATER_PARIS_BOUNDS.south,
  ]
    .map(String)
    .join(",");
}

export function buildGreaterParisLeafletBounds(): [[number, number], [number, number]] {
  return [
    [GREATER_PARIS_BOUNDS.south, GREATER_PARIS_BOUNDS.west],
    [GREATER_PARIS_BOUNDS.north, GREATER_PARIS_BOUNDS.east],
  ];
}

export function buildGreaterParisNominatimSearchUrl(query: string): string | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    q: normalizedQuery,
    limit: "1",
    addressdetails: "1",
    countrycodes: "fr",
    bounded: "1",
    viewbox: buildGreaterParisViewbox(),
  });

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

export function parseNominatimCoordinates(
  result: unknown,
): { latitude: number; longitude: number } | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const candidate = result as { lat?: unknown; lon?: unknown };
  const latitude = Number(candidate.lat);
  const longitude = Number(candidate.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function isWithinGreaterParisBounds(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= GREATER_PARIS_BOUNDS.south &&
    latitude <= GREATER_PARIS_BOUNDS.north &&
    longitude >= GREATER_PARIS_BOUNDS.west &&
    longitude <= GREATER_PARIS_BOUNDS.east
  );
}
