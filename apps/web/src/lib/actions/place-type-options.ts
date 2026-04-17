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

export function isValidPlaceType(value: string | null | undefined): boolean {
  if (!value) return false;
  return (PLACE_TYPE_OPTIONS as readonly string[]).includes(value);
}
