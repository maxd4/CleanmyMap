export const PLACE_TYPE_OPTIONS = [
  "N° Rue/Allée/Villa/Ruelle/Impasse",
  "Bois/Parc/Jardin/Square/Sentier",
  "Quai/Pont/Port",
  "N° Boulevard/Avenue/Place",
  "Gare/Station/Portique",
  "Galerie/Passage couvert",
  "Monument",
] as const;
export const PLACE_TYPE_FORM_OPTIONS = [
  { value: "N° Rue/Allée/Villa/Ruelle/Impasse", label: "N° Rue/Allée/Villa/Ruelle/Impasse" },
  { value: "Bois/Parc/Jardin/Square/Sentier", label: "Bois/Parc/Jardin/Square/Sentier" },
  { value: "Quai/Pont/Port", label: "Quai/Pont/Port" },
  { value: "N° Boulevard/Avenue/Place", label: "N° Boulevard/Avenue/Place" },
  { value: "Gare/Station/Portique", label: "Gare/Station/Portique" },
  { value: "Galerie/Passage couvert", label: "Galerie & Monument" },
] as const;
