"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  getLocalGeoAddressSuggestions,
  mergeGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import { swrRecentViewOptions } from "@/lib/swr-config";

export const WEATHER_LOCATION_SUGGESTION_DEBOUNCE_MS = 220;

function createAbortError(): DOMException {
  return new DOMException("La requête a été annulée.", "AbortError");
}

type AddressSuggestionsResponse = {
  status: string;
  query: string;
  items: GeoAddressSuggestion[];
};

export function useWeatherLocationSuggestions(locationQuery: string) {
  const locationSuggestionsAbortRef = useRef<AbortController | null>(null);
  const locationQueryGenerationRef = useRef(0);
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState(locationQuery.trim());

  useEffect(() => {
    locationQueryGenerationRef.current += 1;
    locationSuggestionsAbortRef.current?.abort();
    const timer = window.setTimeout(() => {
      setDebouncedLocationQuery(locationQuery.trim());
    }, WEATHER_LOCATION_SUGGESTION_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [locationQuery]);

  const locationSuggestions = useSWR<AddressSuggestionsResponse>(
    debouncedLocationQuery.length >= 3
      ? ["section-weather-location-suggestions", debouncedLocationQuery]
      : null,
    async () => {
      locationSuggestionsAbortRef.current?.abort();
      const controller = new AbortController();
      locationSuggestionsAbortRef.current = controller;
      const requestQueryGeneration = locationQueryGenerationRef.current;
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      const localSuggestions = getLocalGeoAddressSuggestions(debouncedLocationQuery, 6);

      const isStaleRequest = () => controller.signal.aborted
        || requestQueryGeneration !== locationQueryGenerationRef.current;

      if (localSuggestions.length >= 6) {
        window.clearTimeout(timeout);
        if (locationSuggestionsAbortRef.current === controller) {
          locationSuggestionsAbortRef.current = null;
        }
        return { status: "ok", query: debouncedLocationQuery, items: localSuggestions };
      }

      try {
        const response = await fetch(
          `/api/geo/address-suggestions?q=${encodeURIComponent(debouncedLocationQuery)}&limit=6`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("location_suggestions_unavailable");
        }

        const remote = (await response.json()) as AddressSuggestionsResponse;
        if (isStaleRequest()) {
          throw createAbortError();
        }
        return {
          ...remote,
          query: debouncedLocationQuery,
          items: mergeGeoAddressSuggestions(localSuggestions, remote.items ?? [], 6),
        };
      } catch (error) {
        if (isStaleRequest()) {
          throw createAbortError();
        }
        if (localSuggestions.length > 0) {
          return { status: "ok", query: debouncedLocationQuery, items: localSuggestions };
        }
        throw error;
      } finally {
        window.clearTimeout(timeout);
        if (locationSuggestionsAbortRef.current === controller) {
          locationSuggestionsAbortRef.current = null;
        }
      }
    },
    { ...swrRecentViewOptions, keepPreviousData: false },
  );

  useEffect(() => () => locationSuggestionsAbortRef.current?.abort(), []);
  useEffect(() => {
    if (debouncedLocationQuery.length < 3) {
      locationSuggestionsAbortRef.current?.abort();
    }
  }, [debouncedLocationQuery]);

  const normalizedLocationQuery = locationQuery.trim();
  const hasCurrentSuggestions = locationSuggestions.data?.query === normalizedLocationQuery;
  const isAbortError = locationSuggestions.error?.name === "AbortError";

  return {
    locationSuggestions: {
      ...locationSuggestions,
      data: hasCurrentSuggestions ? locationSuggestions.data : undefined,
    },
    locationSuggestionsError: debouncedLocationQuery === normalizedLocationQuery
      && locationSuggestions.error
      && !isAbortError
      ? "location_suggestions_unavailable"
      : null,
  };
}
