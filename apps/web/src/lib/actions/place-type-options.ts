export type PlaceTypeIcon =
  | "urban"
  | "parks"
  | "forest"
  | "water"
  | "coast"
  | "covered"
  | "activity"
  | "roadside"
  | "other";

export const PLACE_TYPE_CATALOG = [
  {
    value: "urban_streets",
    label: "Rues & espaces urbains",
    description: "Rues, trottoirs, boulevards, places et monuments.",
    icon: "urban",
  },
  {
    value: "parks_gardens",
    label: "Parcs & jardins",
    description: "Parcs urbains, squares, jardins et espaces aménagés.",
    icon: "parks",
  },
  {
    value: "forests_countryside",
    label: "Forêts & campagne",
    description: "Bois, forêts, sentiers et chemins ruraux.",
    icon: "forest",
  },
  {
    value: "rivers_lakes",
    label: "Rivières & plans d'eau",
    description: "Berges, fleuves, canaux, lacs, étangs et quais fluviaux.",
    icon: "water",
  },
  {
    value: "coast_beaches",
    label: "Littoral & plages",
    description: "Plages, dunes, côtes, digues et ports maritimes.",
    icon: "coast",
  },
  {
    value: "stations_covered_spaces",
    label: "Gares & espaces couverts",
    description: "Gares, stations, galeries, halls et passages couverts.",
    icon: "covered",
  },
  {
    value: "parking_activity_zones",
    label: "Parkings & zones d'activités",
    description: "Parkings, zones commerciales, industrielles et terrains délaissés.",
    icon: "activity",
  },
  {
    value: "roadside_areas",
    label: "Abords routiers",
    description: "Accotements, fossés et aires de repos.",
    icon: "roadside",
  },
  {
    value: "other",
    label: "Autre",
    description: "Environnement non couvert par les catégories précédentes.",
    icon: "other",
  },
] as const satisfies readonly {
  value: string;
  label: string;
  description: string;
  icon: PlaceTypeIcon;
}[];

export type CanonicalPlaceType = (typeof PLACE_TYPE_CATALOG)[number]["value"];

export const PLACE_TYPE_FORM_OPTIONS = PLACE_TYPE_CATALOG.map(({ value, label }) => ({
  value,
  label,
}));

export function getPlaceTypeFormOptions(currentValue?: string | null): Array<{ value: string; label: string }> {
  const trimmed = currentValue?.trim() ?? "";
  if (!trimmed || isCanonicalPlaceType(trimmed)) return [...PLACE_TYPE_FORM_OPTIONS];
  return [
    { value: trimmed, label: `Valeur historique : ${trimmed}` },
    ...PLACE_TYPE_FORM_OPTIONS,
  ];
}

const LEGACY_PLACE_TYPE_TO_CANONICAL: Readonly<Record<string, CanonicalPlaceType>> = {
  "n° rue/allee/villa/ruelle/impasse": "urban_streets",
  "n° boulevard/avenue/place": "urban_streets",
  "galerie/passage couvert": "stations_covered_spaces",
  foret: "forests_countryside",
  campagne: "forests_countryside",
  riviere: "rivers_lakes",
  fleuve: "rivers_lakes",
  canal: "rivers_lakes",
  lac: "rivers_lakes",
  etang: "rivers_lakes",
  plage: "coast_beaches",
  littoral: "coast_beaches",
  cote: "coast_beaches",
  parking: "parking_activity_zones",
  "zone commerciale": "parking_activity_zones",
  "zone industrielle": "parking_activity_zones",
  "terrain delaisse": "parking_activity_zones",
  accotement: "roadside_areas",
  fosse: "roadside_areas",
  "aire de repos": "roadside_areas",
};

function normalizePlaceTypeValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function isCanonicalPlaceType(value: string | null | undefined): value is CanonicalPlaceType {
  return PLACE_TYPE_CATALOG.some((option) => option.value === value);
}

export function resolvePlaceTypeCategory(
  value: string | null | undefined,
): CanonicalPlaceType | null {
  if (isCanonicalPlaceType(value)) return value;
  const normalized = typeof value === "string" ? normalizePlaceTypeValue(value) : "";
  return LEGACY_PLACE_TYPE_TO_CANONICAL[normalized] ?? null;
}

export function getPlaceTypeLabel(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return PLACE_TYPE_CATALOG.find((option) => option.value === trimmed)?.label ?? trimmed;
}

export function isAmbiguousLegacyPlaceType(value: string | null | undefined): boolean {
  const normalized = typeof value === "string" ? normalizePlaceTypeValue(value) : "";
  return [
    "bois/parc/jardin/square/sentier",
    "quai/pont/port",
    "gare/station/portique",
    "monument",
  ].includes(normalized);
}
