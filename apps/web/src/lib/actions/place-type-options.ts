export const PLACE_TYPE_OPTIONS = [
  "N° Rue/Allée/Villa/Ruelle/Impasse",
  "Bois/Parc/Jardin/Square/Sentier",
  "Quai/Pont/Port",
  "N° Boulevard/Avenue/Place",
  "Gare/Station/Portique",
  "Galerie/Passage couvert",
  "Monument",
] as const;

export type PlaceTypeOption = (typeof PLACE_TYPE_OPTIONS)[number];

export const PLACE_TYPE_FORM_OPTIONS = [
  { value: "N° Rue/Allée/Villa/Ruelle/Impasse", label: "N° Rue/Allée/Villa/Ruelle/Impasse" },
  { value: "Bois/Parc/Jardin/Square/Sentier", label: "Bois/Parc/Jardin/Square/Sentier" },
  { value: "Quai/Pont/Port", label: "Quai/Pont/Port" },
  { value: "N° Boulevard/Avenue/Place", label: "N° Boulevard/Avenue/Place" },
  { value: "Gare/Station/Portique", label: "Gare/Station/Portique" },
  { value: "Galerie/Passage couvert", label: "Galerie & Monument" },
] as const;

const PLACE_TYPE_UI_VALUE_ALIASES: Record<string, string> = {
  Monument: "Galerie/Passage couvert",
};

export function normalizePlaceTypeForUi(value: string | null | undefined): string {
  if (!value) return PLACE_TYPE_OPTIONS[0];
  return PLACE_TYPE_UI_VALUE_ALIASES[value] ?? value;
}

export function isValidPlaceType(value: string | null | undefined): boolean {
  if (!value) return false;
  return (PLACE_TYPE_OPTIONS as readonly string[]).includes(value);
}
