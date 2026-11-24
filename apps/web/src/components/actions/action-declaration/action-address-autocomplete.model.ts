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

export type RemoteAddressSuggestionsResult = {
  status: "ok" | "error" | "aborted";
  items: GeoAddressSuggestion[];
};

export async function loadRemoteAddressSuggestionsWithStatus({
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
}): Promise<RemoteAddressSuggestionsResult> {
  const effectiveLocalSuggestions = countryCode === DEFAULT_COUNTRY_CODE ? localSuggestions : [];
  if (effectiveLocalSuggestions.length >= 6) {
    return { status: "ok", items: effectiveLocalSuggestions };
  }
  if (signal.aborted) {
    return { status: "aborted", items: [] };
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
    if (signal.aborted) {
      return { status: "aborted", items: [] };
    }
    if (!response.ok) {
      return { status: "error", items: effectiveLocalSuggestions };
    }

    const data = (await response.json()) as AddressSuggestionsResponse;
    if (signal.aborted) {
      return { status: "aborted", items: [] };
    }

    return {
      status: "ok",
      items: mergeGeoAddressSuggestions(effectiveLocalSuggestions, data.items ?? [], 6),
    };
  } catch {
    return signal.aborted
      ? { status: "aborted", items: [] }
      : { status: "error", items: effectiveLocalSuggestions };
  }
}

export async function loadRemoteAddressSuggestions(params: {
  query: string;
  localSuggestions: GeoAddressSuggestion[];
  countryCode?: CountryCode;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<GeoAddressSuggestion[] | null> {
  const result = await loadRemoteAddressSuggestionsWithStatus(params);
  return result.status === "aborted" ? null : result.items;
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
