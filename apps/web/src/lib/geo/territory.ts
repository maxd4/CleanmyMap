type TerritoryBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

// Metropolitan France bbox. Kept intentionally broad so territory-level geocoding
// is no longer biased toward Île-de-France.
const TERRITORY_BOUNDS: TerritoryBounds = {
  west: -5.5,
  south: 41.0,
  east: 10.0,
  north: 51.5,
};

export const TERRITORY_CENTER: [number, number] = [46.603354, 1.888334];

function buildTerritoryViewbox(): string {
  return [
    TERRITORY_BOUNDS.west,
    TERRITORY_BOUNDS.north,
    TERRITORY_BOUNDS.east,
    TERRITORY_BOUNDS.south,
  ]
    .map(String)
    .join(",");
}

export function buildTerritoryLeafletBounds(): [[number, number], [number, number]] {
  return [
    [TERRITORY_BOUNDS.south, TERRITORY_BOUNDS.west],
    [TERRITORY_BOUNDS.north, TERRITORY_BOUNDS.east],
  ];
}

export function buildTerritoryNominatimSearchUrl(query: string): string | null {
  return buildTerritoryNominatimSearchUrlWithLimit(query, 1);
}

export function buildTerritoryNominatimSearchUrlWithLimit(
  query: string,
  limit: number,
  viewbox = buildTerritoryViewbox(),
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
    countrycodes: "fr",
    bounded: "1",
    viewbox,
  });

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
  const latitude = Number(candidate.lat);
  const longitude = Number(candidate.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function isWithinTerritoryBounds(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= TERRITORY_BOUNDS.south &&
    latitude <= TERRITORY_BOUNDS.north &&
    longitude >= TERRITORY_BOUNDS.west &&
    longitude <= TERRITORY_BOUNDS.east
  );
}
