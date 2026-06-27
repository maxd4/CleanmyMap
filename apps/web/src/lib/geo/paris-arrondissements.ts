export const PARIS_ARRONDISSEMENTS = [
  { value: 1, label: "Paris 1er", center: { lat: 48.8626, lng: 2.3363 } },
  { value: 2, label: "Paris 2e", center: { lat: 48.8676, lng: 2.3441 } },
  { value: 3, label: "Paris 3e", center: { lat: 48.8635, lng: 2.3615 } },
  { value: 4, label: "Paris 4e", center: { lat: 48.8549, lng: 2.3572 } },
  { value: 5, label: "Paris 5e", center: { lat: 48.8463, lng: 2.3488 } },
  { value: 6, label: "Paris 6e", center: { lat: 48.8492, lng: 2.3325 } },
  { value: 7, label: "Paris 7e", center: { lat: 48.8562, lng: 2.3123 } },
  { value: 8, label: "Paris 8e", center: { lat: 48.8722, lng: 2.3126 } },
  { value: 9, label: "Paris 9e", center: { lat: 48.8761, lng: 2.3378 } },
  { value: 10, label: "Paris 10e", center: { lat: 48.8761, lng: 2.3591 } },
  { value: 11, label: "Paris 11e", center: { lat: 48.8579, lng: 2.3812 } },
  { value: 12, label: "Paris 12e", center: { lat: 48.8374, lng: 2.4158 } },
  { value: 13, label: "Paris 13e", center: { lat: 48.8282, lng: 2.3622 } },
  { value: 14, label: "Paris 14e", center: { lat: 48.8339, lng: 2.3265 } },
  { value: 15, label: "Paris 15e", center: { lat: 48.8414, lng: 2.2968 } },
  { value: 16, label: "Paris 16e", center: { lat: 48.8632, lng: 2.2769 } },
  { value: 17, label: "Paris 17e", center: { lat: 48.8873, lng: 2.3079 } },
  { value: 18, label: "Paris 18e", center: { lat: 48.8924, lng: 2.3444 } },
  { value: 19, label: "Paris 19e", center: { lat: 48.8871, lng: 2.3849 } },
  { value: 20, label: "Paris 20e", center: { lat: 48.8637, lng: 2.3994 } },
] as const;

export type ParisArrondissement = (typeof PARIS_ARRONDISSEMENTS)[number]["value"];
export type TerritoryArrondissement = ParisArrondissement;
export type ArrondissementCity = "Paris" | "Lyon" | "Marseille";
export type MarseilleSector = "1/7" | "2/3" | "4/5" | "6/8" | "9/10" | "11/12" | "13/14" | "15/16";

export type ArrondissementCityOption = {
  value: ArrondissementCity;
  label: string;
  arrondissementCount: number;
  description: string;
};

export const ARRONDISSEMENT_CITY_OPTIONS: ArrondissementCityOption[] = [
  {
    value: "Paris",
    label: "Paris",
    arrondissementCount: 20,
    description: "20 arrondissements municipaux",
  },
  {
    value: "Lyon",
    label: "Lyon",
    arrondissementCount: 9,
    description: "9 arrondissements municipaux",
  },
  {
    value: "Marseille",
    label: "Marseille",
    arrondissementCount: 16,
    description: "16 arrondissements municipaux, 8 mairies de secteur",
  },
];

const ARRONDISSEMENT_CITY_CENTERS: Record<ArrondissementCity, { lat: number; lng: number }> = {
  Paris: {
    lat: 48.8566,
    lng: 2.3522,
  },
  Lyon: {
    lat: 45.764,
    lng: 4.8357,
  },
  Marseille: {
    lat: 43.2965,
    lng: 5.3698,
  },
};

const MARSEILLE_SECTOR_BY_ARRONDISSEMENT: Record<number, MarseilleSector> = {
  1: "1/7",
  7: "1/7",
  2: "2/3",
  3: "2/3",
  4: "4/5",
  5: "4/5",
  6: "6/8",
  8: "6/8",
  9: "9/10",
  10: "9/10",
  11: "11/12",
  12: "11/12",
  13: "13/14",
  14: "13/14",
  15: "15/16",
  16: "15/16",
};

const ARRONDISSEMENT_LOOKUP = new Map(
  PARIS_ARRONDISSEMENTS.map((item) => [item.value, item]),
);

export function parseParisArrondissement(value: unknown): ParisArrondissement | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }
  return parsed as ParisArrondissement;
}

export function parseTerritoryArrondissement(
  value: unknown,
): TerritoryArrondissement | null {
  return parseParisArrondissement(value);
}

export function getArrondissementCityOptions(): ArrondissementCityOption[] {
  return ARRONDISSEMENT_CITY_OPTIONS;
}

export function formatArrondissementLabel(
  city: ArrondissementCity | null,
  arrondissement: number,
): string {
  const suffix = arrondissement === 1 ? "1er" : `${arrondissement}e`;
  return city ? `${city} ${suffix}` : `Arrondissement ${suffix}`;
}

export function getArrondissementMunicipalLabel(
  city: ArrondissementCity | null,
  arrondissement: number,
): string {
  if (city === "Marseille") {
    return `Marseille ${arrondissement === 1 ? "1er" : `${arrondissement}e`} arrondissement`;
  }

  if (city === "Paris") {
    return `Paris ${arrondissement === 1 ? "1er" : `${arrondissement}e`} arrondissement`;
  }

  if (city === "Lyon") {
    return `Lyon ${arrondissement === 1 ? "1er" : `${arrondissement}e`} arrondissement`;
  }

  return formatArrondissementLabel(city, arrondissement);
}

export function getArrondissementHelpLabel(
  city: ArrondissementCity | null,
  arrondissement: number,
): string | null {
  if (city === "Marseille") {
    const sector = MARSEILLE_SECTOR_BY_ARRONDISSEMENT[arrondissement];
    return sector ? `Mairie de secteur ${sector}` : "Mairie de secteur";
  }

  if (city === "Paris" || city === "Lyon") {
    return "Mairie d'arrondissement";
  }

  return null;
}

export function normalizeArrondissementCityLabel(
  city: ArrondissementCity,
): string {
  return city;
}

export function getArrondissementCityCount(city: ArrondissementCity): number {
  return ARRONDISSEMENT_CITY_OPTIONS.find((option) => option.value === city)?.arrondissementCount ?? 0;
}

export function getArrondissementCityCenter(
  city: ArrondissementCity,
): { lat: number; lng: number } {
  return ARRONDISSEMENT_CITY_CENTERS[city];
}

export function isParisArrondissement(
  value: number | null | undefined,
): value is ParisArrondissement {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20;
}

export function isTerritoryArrondissement(
  value: number | null | undefined,
): value is TerritoryArrondissement {
  return isParisArrondissement(value);
}

export function getParisArrondissementLabel(
  arrondissement: ParisArrondissement,
): string {
  return ARRONDISSEMENT_LOOKUP.get(arrondissement)?.label ?? `Paris ${arrondissement}e`;
}

export function getTerritoryArrondissementLabel(
  arrondissement: TerritoryArrondissement,
): string {
  return getParisArrondissementLabel(arrondissement);
}

export function getParisArrondissementCenter(
  arrondissement: ParisArrondissement,
): { lat: number; lng: number } {
  return ARRONDISSEMENT_LOOKUP.get(arrondissement)?.center ?? {
    lat: 48.8566,
    lng: 2.3522,
  };
}

export function getTerritoryArrondissementCenter(
  arrondissement: TerritoryArrondissement,
): { lat: number; lng: number } {
  return getParisArrondissementCenter(arrondissement);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function distanceToParisArrondissementKm(
  lat: number,
  lng: number,
  arrondissement: ParisArrondissement,
): number {
  const center = ARRONDISSEMENT_LOOKUP.get(arrondissement)?.center;
  if (!center) {
    return Number.POSITIVE_INFINITY;
  }
  return haversineDistanceKm(lat, lng, center.lat, center.lng);
}

export function distanceToTerritoryArrondissementKm(
  lat: number,
  lng: number,
  arrondissement: TerritoryArrondissement,
): number {
  return distanceToParisArrondissementKm(lat, lng, arrondissement);
}

/**
 * Neighboring Arrondissements Adjacency Map
 * 1, 2, 3, 4 are considered 'Paris Centre' (mutually neighbors)
 */
const PARIS_ARRONDISSEMENT_NEIGHBORS: Record<number, number[]> = {
  1: [2, 3, 4, 5, 6, 7, 8, 9],
  2: [1, 3, 4, 9, 10],
  3: [1, 2, 4, 10, 11],
  4: [1, 2, 3, 5, 6, 11, 12],
  5: [1, 4, 6, 13, 14],
  6: [1, 4, 5, 7, 14, 15],
  7: [1, 6, 8, 15, 16],
  8: [1, 7, 9, 16, 17],
  9: [1, 2, 8, 10, 17, 18],
  10: [2, 3, 9, 11, 18, 19],
  11: [3, 4, 10, 12, 19, 20],
  12: [4, 11, 13, 20],
  13: [5, 12, 14],
  14: [5, 6, 13, 15],
  15: [6, 7, 14, 16],
  16: [7, 8, 15, 17],
  17: [8, 9, 16, 18],
  18: [9, 10, 17, 19],
  19: [10, 11, 18, 20],
  20: [11, 12, 19],
};

/**
 * Returns the list of arrondissements that should be notified for an event
 * (Target + Neighbors)
 */
export function getAffectedArrondissements(arrondissement: number): number[] {
  const neighbors = PARIS_ARRONDISSEMENT_NEIGHBORS[arrondissement] || [];
  return Array.from(new Set([arrondissement, ...neighbors]));
}

/**
 * Parse arrondissement from a string label (e.g. "75011 Paris" or "Paris 11e")
 */
export function extractArrondissementFromLabel(label: string): number | null {
  const zipMatch = label.match(/750(\d{2})/);
  if (zipMatch) return parseInt(zipMatch[1], 10);

  const ordinalMatch = label.match(/(\d{1,2})(?:eme|er|e)?\b/i);
  if (ordinalMatch) {
    const val = parseInt(ordinalMatch[1], 10);
    if (val >= 1 && val <= 20) return val;
  }
  
  return null;
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isParisPostalCodeLabel(normalizedLabel: string): boolean {
  return /\b750\d{2}\b/.test(normalizedLabel);
}

function isLyonPostalCodeLabel(normalizedLabel: string): boolean {
  return /\b6900[1-9]\b/.test(normalizedLabel);
}

function isMarseillePostalCodeLabel(normalizedLabel: string): boolean {
  return /\b130(?:0[1-9]|1[0-6])\b/.test(normalizedLabel);
}

export function inferArrondissementCityFromLabel(
  label: string,
): ArrondissementCity | null {
  const normalized = normalizeLabel(label);
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("marseille") ||
    isMarseillePostalCodeLabel(normalized)
  ) {
    return "Marseille";
  }

  if (normalized.includes("lyon") || isLyonPostalCodeLabel(normalized)) {
    return "Lyon";
  }

  if (normalized.includes("paris") || isParisPostalCodeLabel(normalized)) {
    return "Paris";
  }

  return null;
}

export function isParisArrondissementLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  return (
    normalized.includes("paris") ||
    /^750\d{2}\b/.test(normalized) ||
    /\b(?:[1-9]|1[0-9]|20)(?:er|e)?\s+arrondissement\b/.test(normalized) ||
    PARIS_ARRONDISSEMENTS.some((item) => normalized.includes(normalizeLabel(item.label)))
  );
}

export function extractParisArrondissementFromLabel(label: string): number | null {
  return isParisArrondissementLabel(label) ? extractArrondissementFromLabel(label) : null;
}
