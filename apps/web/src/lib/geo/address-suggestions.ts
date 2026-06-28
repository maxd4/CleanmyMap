import {
  searchLocalTerritoryAddressSuggestions,
  type TerritoryAddressSuggestion,
} from "@/lib/geo/territory";

export type GeoAddressSuggestion = {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number | null;
};

function normalizeSuggestionKey(suggestion: Pick<GeoAddressSuggestion, "label" | "latitude" | "longitude">): string {
  return `${suggestion.label.trim().toLowerCase()}|${suggestion.latitude}|${suggestion.longitude}`;
}

export function mapTerritoryAddressSuggestion(
  suggestion: TerritoryAddressSuggestion,
): GeoAddressSuggestion {
  return {
    label: suggestion.label,
    subtitle: suggestion.subtitle,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    importance: suggestion.importance,
  };
}

export function getLocalGeoAddressSuggestions(
  query: string,
  limit: number,
): GeoAddressSuggestion[] {
  return searchLocalTerritoryAddressSuggestions(query, limit).map(mapTerritoryAddressSuggestion);
}

export function mergeGeoAddressSuggestions(
  localSuggestions: GeoAddressSuggestion[],
  remoteSuggestions: GeoAddressSuggestion[],
  limit: number,
): GeoAddressSuggestion[] {
  const merged: GeoAddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of [...localSuggestions, ...remoteSuggestions]) {
    const key = normalizeSuggestionKey(suggestion);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(suggestion);
    if (merged.length >= Math.max(1, Math.min(8, Math.trunc(limit) || 1))) {
      break;
    }
  }

  return merged;
}

export function shouldSkipRemoteGeoSearch(
  localSuggestions: GeoAddressSuggestion[],
  limit: number,
): boolean {
  return localSuggestions.length >= Math.max(1, Math.min(8, Math.trunc(limit) || 1));
}
