import {
  getLocalGeoAddressSuggestions,
  mergeGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import { DEFAULT_COUNTRY_CODE, type CountryCode } from "@/lib/user-location-preference";

type AddressSuggestionsResponse = {
  status: "ok";
  query: string;
  items: GeoAddressSuggestion[];
};

export async function loadRemoteAddressSuggestions({
  query,
  localSuggestions,
  countryCode = DEFAULT_COUNTRY_CODE,
  signal,
  fetcher = fetch,
}: {
  query: string;
  localSuggestions: GeoAddressSuggestion[];
  countryCode?: CountryCode;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<GeoAddressSuggestion[] | null> {
  const effectiveLocalSuggestions = countryCode === DEFAULT_COUNTRY_CODE ? localSuggestions : [];
  if (effectiveLocalSuggestions.length >= 6) {
    return effectiveLocalSuggestions;
  }

  try {
    const response = await fetcher(
      `/api/geo/address-suggestions?q=${encodeURIComponent(query)}&limit=6&country=${encodeURIComponent(countryCode)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      },
    );
    if (!response.ok) {
      return effectiveLocalSuggestions;
    }

    const data = (await response.json()) as AddressSuggestionsResponse;
    if (signal.aborted) {
      return null;
    }

    return mergeGeoAddressSuggestions(effectiveLocalSuggestions, data.items ?? [], 6);
  } catch {
    return signal.aborted ? null : effectiveLocalSuggestions;
  }
}

export function getAddressSuggestionHighlightIndex({
  key,
  currentIndex,
  suggestionCount,
}: {
  key: string;
  currentIndex: number;
  suggestionCount: number;
}): number | null {
  if (suggestionCount === 0) {
    return null;
  }
  if (key === "ArrowDown") {
    return (currentIndex + 1) % suggestionCount;
  }
  if (key === "ArrowUp") {
    return currentIndex === 0 ? suggestionCount - 1 : currentIndex - 1;
  }
  return null;
}

export { getLocalGeoAddressSuggestions };
