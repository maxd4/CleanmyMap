import {
  getLocalGeoAddressSuggestions,
  mergeGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";

type AddressSuggestionsResponse = {
  status: "ok";
  query: string;
  items: GeoAddressSuggestion[];
};

export async function loadRemoteAddressSuggestions({
  query,
  localSuggestions,
  signal,
  fetcher = fetch,
}: {
  query: string;
  localSuggestions: GeoAddressSuggestion[];
  signal: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<GeoAddressSuggestion[] | null> {
  if (localSuggestions.length >= 6) {
    return localSuggestions;
  }

  try {
    const response = await fetcher(
      `/api/geo/address-suggestions?q=${encodeURIComponent(query)}&limit=6`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      },
    );
    if (!response.ok) {
      return localSuggestions;
    }

    const data = (await response.json()) as AddressSuggestionsResponse;
    if (signal.aborted) {
      return null;
    }

    return mergeGeoAddressSuggestions(localSuggestions, data.items ?? [], 6);
  } catch {
    return signal.aborted ? null : localSuggestions;
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
