import { describe, expect, it } from "vitest";
import {
  buildCompactSelectionFromSuggestion,
  buildCountrySelection,
  buildSelectionFromSuggestion,
  filterSuggestionsForLevel,
  normalizeTerritorySearchText,
  parseSelectedArrondissementCity,
} from "./greater-paris-location";

const suggestion = {
  label: "Paris 11e, 75011 Paris",
  subtitle: "Paris 11e · Paris",
  latitude: 48.86,
  longitude: 2.38,
  importance: null,
};

describe("greater-paris-location", () => {
  it("normalizes search text and validates arrondissement cities", () => {
    expect(normalizeTerritorySearchText(" Évry-Courcouronnes ")).toBe(
      "evry-courcouronnes",
    );
    expect(parseSelectedArrondissementCity("Lyon")).toBe("Lyon");
    expect(parseSelectedArrondissementCity("Bordeaux")).toBeNull();
  });

  it("builds the canonical country selection", () => {
    expect(buildCountrySelection()).toEqual({
      country: "France",
      level: "country",
      label: "France",
      subtitle: "Territoire national",
      arrondissement: null,
      arrondissementCity: null,
    });
  });

  it("preserves arrondissement data from a suggestion", () => {
    expect(buildSelectionFromSuggestion("commune", suggestion, "", null)).toMatchObject({
      level: "commune",
      label: suggestion.label,
      arrondissement: 11,
      arrondissementCity: "Paris",
    });
    expect(buildCompactSelectionFromSuggestion(suggestion)).toMatchObject({
      level: "arrondissement",
      label: "Paris 11e arrondissement",
      arrondissement: 11,
      arrondissementCity: "Paris",
    });
  });

  it("prioritizes arrondissement suggestions without changing other levels", () => {
    const regular = { ...suggestion, label: "Paris, 75000 Paris" };
    const filtered = filterSuggestionsForLevel([regular, suggestion], "arrondissement");
    expect(filtered[0]).toBe(suggestion);
    expect(filterSuggestionsForLevel([regular], "commune")).toEqual([regular]);
  });
});
