import {
  extractArrondissementFromLabel,
  getArrondissementCityCount,
  getArrondissementMunicipalLabel,
  inferArrondissementCityFromLabel,
  parseTerritoryArrondissement,
  type ArrondissementCity,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import type {
  TerritoryLocationLevel,
  TerritoryLocationSelection,
} from "@/lib/user-location-preference";

export function normalizeTerritorySearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildCountrySelection(): TerritoryLocationSelection {
  return {
    country: "France",
    level: "country",
    label: "France",
    subtitle: "Territoire national",
    arrondissement: null,
    arrondissementCity: null,
  };
}

export function parseSelectedArrondissementCity(
  value: unknown,
): ArrondissementCity | null {
  return value === "Paris" || value === "Lyon" || value === "Marseille"
    ? value
    : null;
}

export function buildSelectionFromSuggestion(
  level: TerritoryLocationLevel,
  suggestion: GeoAddressSuggestion,
  arrondissementValue: string,
  arrondissementCity: ArrondissementCity | null,
): TerritoryLocationSelection {
  const parsedFromLabel = extractArrondissementFromLabel(suggestion.label);
  const parsedFromDraft = extractArrondissementFromLabel(arrondissementValue);
  const arrondissement =
    parseTerritoryArrondissement(parsedFromLabel) ??
    parseTerritoryArrondissement(parsedFromDraft) ??
    null;
  const inferredCity =
    inferArrondissementCityFromLabel(suggestion.label) ??
    inferArrondissementCityFromLabel(suggestion.subtitle) ??
    arrondissementCity;

  return {
    country: "France",
    level,
    label: suggestion.label,
    subtitle: suggestion.subtitle || null,
    arrondissement,
    arrondissementCity: inferredCity,
  };
}

function getCompactArrondissement(
  suggestion: GeoAddressSuggestion,
): { city: ArrondissementCity; arrondissement: ParisArrondissement } | null {
  const sources = [suggestion.subtitle, suggestion.label];
  for (const source of sources) {
    const match = source.match(
      /\b(Paris|Lyon|Marseille)\s+(\d{1,2})(?:er|e|ème|eme)?\b/i,
    );
    if (match) {
      const arrondissement = parseTerritoryArrondissement(
        Number.parseInt(match[2], 10),
      );
      const city = parseSelectedArrondissementCity(match[1]);
      if (city && arrondissement && arrondissement <= getArrondissementCityCount(city)) {
        return { city, arrondissement };
      }
    }
  }

  const postalMatch = suggestion.label.match(/\b(75|69|13)(\d{3})\b/);
  if (postalMatch) {
    const city =
      postalMatch[1] === "75"
        ? "Paris"
        : postalMatch[1] === "69"
          ? "Lyon"
          : "Marseille";
    const arrondissement = parseTerritoryArrondissement(
      Number.parseInt(postalMatch[2].slice(1), 10),
    );
    if (arrondissement && arrondissement <= getArrondissementCityCount(city)) {
      return { city, arrondissement };
    }
  }

  return null;
}

export function buildCompactSelectionFromSuggestion(
  suggestion: GeoAddressSuggestion,
): TerritoryLocationSelection {
  const arrondissement = getCompactArrondissement(suggestion);
  const inferredCity =
    arrondissement?.city ??
    inferArrondissementCityFromLabel(suggestion.subtitle) ??
    inferArrondissementCityFromLabel(suggestion.label);
  const subtitleCity = suggestion.subtitle
    .split("·")[0]
    ?.split(",")[0]
    ?.trim();
  const labelCity = suggestion.label
    .split(",")
    .at(-1)
    ?.replace(/\b\d{5}\b/, "")
    .trim();
  const label = arrondissement
    ? getArrondissementMunicipalLabel(arrondissement.city, arrondissement.arrondissement)
    : subtitleCity || labelCity || suggestion.label;

  return {
    country: "France",
    level: arrondissement ? "arrondissement" : "commune",
    label,
    subtitle: inferredCity ?? null,
    arrondissement: arrondissement?.arrondissement ?? null,
    arrondissementCity: inferredCity,
  };
}

export function filterSuggestionsForLevel(
  items: GeoAddressSuggestion[],
  level: TerritoryLocationLevel,
): GeoAddressSuggestion[] {
  return level === "arrondissement"
    ? items
        .filter((item) => {
          const label = normalizeTerritorySearchText(item.label);
          return (
            Boolean(extractArrondissementFromLabel(item.label)) ||
            label.includes("arrondissement")
          );
        })
        .sort((left, right) => {
          const leftScore = extractArrondissementFromLabel(left.label) ? 1 : 0;
          const rightScore = extractArrondissementFromLabel(right.label) ? 1 : 0;
          return rightScore - leftScore;
        })
    : items;
}
