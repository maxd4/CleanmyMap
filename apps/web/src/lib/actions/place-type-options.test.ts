import { describe, expect, it } from "vitest";
import {
  getPlaceTypeLabel,
  getPlaceTypeFormOptions,
  isAmbiguousLegacyPlaceType,
  isCanonicalPlaceType,
  PLACE_TYPE_CATALOG,
  PLACE_TYPE_FORM_OPTIONS,
  resolvePlaceTypeCategory,
} from "./place-type-options";

describe("place type catalog", () => {
  it("exposes the nine stable categories used by new declarations", () => {
    expect(PLACE_TYPE_CATALOG).toHaveLength(9);
    expect(PLACE_TYPE_CATALOG.map((option) => option.value)).toEqual([
      "urban_streets",
      "parks_gardens",
      "forests_countryside",
      "rivers_lakes",
      "coast_beaches",
      "stations_covered_spaces",
      "parking_activity_zones",
      "roadside_areas",
      "other",
    ]);
    expect(PLACE_TYPE_CATALOG.every((option) => option.label && option.description && option.icon)).toBe(true);
    expect(PLACE_TYPE_FORM_OPTIONS).toHaveLength(9);
  });

  it.each([
    ["N° Rue/Allée/Villa/Ruelle/Impasse", "urban_streets"],
    ["N° Boulevard/Avenue/Place", "urban_streets"],
    ["Galerie/Passage couvert", "stations_covered_spaces"],
    ["Forêt", "forests_countryside"],
    ["Lac", "rivers_lakes"],
    ["Plage", "coast_beaches"],
  ] as const)("maps the certain historical value %s", (legacy, canonical) => {
    expect(resolvePlaceTypeCategory(legacy)).toBe(canonical);
  });

  it.each([
    "Bois/Parc/Jardin/Square/Sentier",
    "Quai/Pont/Port",
    "Gare/Station/Portique",
    "Monument",
    "Valeur historique inconnue",
  ])("keeps the ambiguous or unknown value unmapped: %s", (legacy) => {
    expect(resolvePlaceTypeCategory(legacy)).toBeNull();
  });

  it("distinguishes canonical IDs from preserved historical labels", () => {
    expect(isCanonicalPlaceType("urban_streets")).toBe(true);
    expect(isCanonicalPlaceType("Bois/Parc/Jardin/Square/Sentier")).toBe(false);
    expect(isAmbiguousLegacyPlaceType("Monument")).toBe(true);
    expect(getPlaceTypeLabel("urban_streets")).toBe("Rues & espaces urbains");
    expect(getPlaceTypeLabel("Monument")).toBe("Monument");
    expect(getPlaceTypeLabel("Valeur historique inconnue")).toBe("Valeur historique inconnue");
    expect(getPlaceTypeFormOptions("Quai/Pont/Port")[0]).toEqual({ value: "Quai/Pont/Port", label: "Valeur historique : Quai/Pont/Port" });
    expect(getPlaceTypeFormOptions("urban_streets")[0]?.value).toBe("urban_streets");
  });
});
