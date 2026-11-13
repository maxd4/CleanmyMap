type TerritoryBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

// Retained for the France-specific Geoplateforme response filter. Generic map
// selection is world-wide and no longer uses this bbox as an interaction limit.
const FRANCE_TERRITORY_BOUNDS: TerritoryBounds = {
  west: -5.5,
  south: 41.0,
  east: 10.0,
  north: 51.5,
};

export const TERRITORY_CENTER: [number, number] = [46.603354, 1.888334];

function buildTerritoryViewbox(): string {
  return [
    FRANCE_TERRITORY_BOUNDS.west,
    FRANCE_TERRITORY_BOUNDS.north,
    FRANCE_TERRITORY_BOUNDS.east,
    FRANCE_TERRITORY_BOUNDS.south,
  ]
    .map(String)
    .join(",");
}

export function buildTerritoryLeafletBounds(): [[number, number], [number, number]] {
  return [
    [-90, -180],
    [90, 180],
  ];
}

export function buildPhotonSearchUrl(
  query: string,
  limit: number,
  countryName?: string,
): string | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const params = new URLSearchParams({
    q: countryName ? `${normalizedQuery}, ${countryName}` : normalizedQuery,
    limit: String(Math.max(1, Math.min(10, Math.trunc(limit) || 1))),
    lang: "en",
  });
  return `https://photon.komoot.io/api/?${params.toString()}`;
}

export function buildPhotonReverseUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  return `https://photon.komoot.io/reverse?${params.toString()}`;
}

export function parsePhotonCoordinates(
  result: unknown,
): { latitude: number; longitude: number } | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const geometry = (result as { geometry?: { coordinates?: unknown } }).geometry;
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const longitude = parseCoordinateComponent(coordinates[0]);
  const latitude = parseCoordinateComponent(coordinates[1]);
  if (latitude === null || longitude === null) return null;
  return isWithinTerritoryBounds(latitude, longitude)
    ? { latitude, longitude }
    : null;
}

function parseCoordinateComponent(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matchesPhotonCountry(result: unknown, countryCode: string): boolean {
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  const properties = (result as { properties?: { countrycode?: unknown } }).properties;
  const resultCountry = properties?.countrycode;
  const expectedCountry = countryCode.trim().toLowerCase();
  if (typeof resultCountry === "string" && resultCountry.trim()) {
    return resultCountry.trim().toLowerCase() === expectedCountry;
  }

  // France keeps the historical provider compatibility: the local parser
  // independently constrains coordinates to the French provider path. A
  // foreign request has no safe fallback without explicit country metadata.
  return expectedCountry === "fr";
}

export function buildTerritoryNominatimSearchUrl(query: string): string | null {
  return buildTerritoryNominatimSearchUrlWithLimit(query, 1);
}

export function buildTerritoryNominatimSearchUrlWithLimit(
  query: string,
  limit: number,
  viewbox: string | null = buildTerritoryViewbox(),
  countryCode = "fr",
): string | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    q: normalizedQuery,
    limit: String(Math.max(1, Math.min(10, Math.trunc(limit) || 1))),
    addressdetails: "1",
    countrycodes: countryCode.toLowerCase(),
  });
  if (viewbox) {
    params.set("bounded", "1");
    params.set("viewbox", viewbox);
  }

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

export type TerritoryAddressSuggestion = {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number;
};

const LOCAL_TERRITORY_ADDRESS_SUGGESTIONS: Array<
  TerritoryAddressSuggestion & { keywords: string[] }
> = [
  {
    label: "12 Rue de Rivoli, 75004 Paris",
    subtitle: "Paris 4e · Louvre",
    latitude: 48.8557,
    longitude: 2.3562,
    importance: 0.98,
    keywords: ["rue de rivoli", "rivoli"],
  },
  {
    label: "10 Cours de l'Intendance, 33000 Bordeaux",
    subtitle: "Bordeaux · Centre historique",
    latitude: 44.8392,
    longitude: -0.5794,
    importance: 0.96,
    keywords: ["cours de l'intendance", "intendance", "bordeaux"],
  },
  {
    label: "8 Place du Capitole, 31000 Toulouse",
    subtitle: "Toulouse · Capitole",
    latitude: 43.6044,
    longitude: 1.4442,
    importance: 0.95,
    keywords: ["place du capitole", "capitole", "toulouse"],
  },
  {
    label: "1 Place de la Comédie, 34000 Montpellier",
    subtitle: "Montpellier · Centre",
    latitude: 43.6085,
    longitude: 3.8797,
    importance: 0.94,
    keywords: ["place de la comédie", "comedie", "montpellier"],
  },
  {
    label: "25 Place du Général de Gaulle, 59800 Lille",
    subtitle: "Lille · Grand Place",
    latitude: 50.6366,
    longitude: 3.0636,
    importance: 0.93,
    keywords: ["place du general de gaulle", "grand place", "lille"],
  },
  {
    label: "2 Rue Crébillon, 44000 Nantes",
    subtitle: "Nantes · Graslin",
    latitude: 47.2173,
    longitude: -1.5548,
    importance: 0.92,
    keywords: ["rue crébillon", "crebillon", "nantes"],
  },
  {
    label: "5 Quai de la Mairie, 13002 Marseille",
    subtitle: "Marseille · Vieux-Port",
    latitude: 43.2965,
    longitude: 5.3698,
    importance: 0.91,
    keywords: ["marseille", "vieux-port", "vieux port"],
  },
  {
    label: "1 Place de la Mairie, 35000 Rennes",
    subtitle: "Rennes · Centre",
    latitude: 48.1173,
    longitude: -1.6778,
    importance: 0.9,
    keywords: ["place de la mairie", "rennes"],
  },
  {
    label: "5 Rue de la République, 69002 Lyon",
    subtitle: "Lyon · Presqu'île",
    latitude: 45.758,
    longitude: 4.8357,
    importance: 0.97,
    keywords: ["rue de la république", "rue de la republique", "lyon", "presqu'île", "presquile"],
  },
  {
    label: "3 Place Kléber, 67000 Strasbourg",
    subtitle: "Strasbourg · Centre",
    latitude: 48.5846,
    longitude: 7.7507,
    importance: 0.9,
    keywords: ["place kléber", "place kleber", "strasbourg"],
  },
];

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchLocalTerritoryAddressSuggestions(
  query: string,
  limit = 6,
): TerritoryAddressSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const scored = LOCAL_TERRITORY_ADDRESS_SUGGESTIONS.map((item) => {
    const normalizedLabel = normalizeSearchText(item.label);
    const normalizedSubtitle = normalizeSearchText(item.subtitle);
    const matchesKeyword = item.keywords.some((keyword) =>
      normalizedQuery.includes(normalizeSearchText(keyword)) ||
      normalizeSearchText(keyword).includes(normalizedQuery),
    );
    const startsWith = normalizedLabel.startsWith(normalizedQuery) ? 4 : 0;
    const contains = normalizedLabel.includes(normalizedQuery) ? 2 : 0;
    const subtitleMatch = normalizedSubtitle.includes(normalizedQuery) ? 1 : 0;
    const keywordScore = matchesKeyword ? 3 : 0;
    const score = startsWith + contains + subtitleMatch + keywordScore;
    return { ...item, score };
  })
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score === left.score
        ? right.importance - left.importance
        : right.score - left.score,
    )
    .slice(0, Math.max(1, Math.min(8, Math.trunc(limit) || 1)));

  return scored.map((entry) => {
    const { score, keywords, ...item } = entry;
    void score;
    void keywords;
    return item;
  });
}

export function parseTerritoryCoordinates(
  result: unknown,
): { latitude: number; longitude: number } | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const candidate = result as { lat?: unknown; lon?: unknown };
  const latitude = parseCoordinateComponent(candidate.lat);
  const longitude = parseCoordinateComponent(candidate.lon);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export function isWithinTerritoryBounds(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function isWithinFranceTerritoryBounds(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= FRANCE_TERRITORY_BOUNDS.south &&
    latitude <= FRANCE_TERRITORY_BOUNDS.north &&
    longitude >= FRANCE_TERRITORY_BOUNDS.west &&
    longitude <= FRANCE_TERRITORY_BOUNDS.east
  );
}
