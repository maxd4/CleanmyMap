"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const activeRequestQueryRef = useRef<string | null>(null);
  const abortedQueryRef = useRef<Set<string>>(new Set());
  const locationQueryGenerationRef = useRef(0);
  const normalizedLocationQuery = locationQuery.trim();
  const lastNormalizedLocationQueryRef = useRef(normalizedLocationQuery);
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState(normalizedLocationQuery);

  const abortActiveLocationRequest = useCallback(() => {
    const controller = locationSuggestionsAbortRef.current;
    if (!controller || controller.signal.aborted) return;
    controller.abort();
    if (activeRequestQueryRef.current) {
      abortedQueryRef.current.add(activeRequestQueryRef.current);
    }
  }, []);

  const locationSuggestions = useSWR<AddressSuggestionsResponse>(
    debouncedLocationQuery.length >= 3
      ? ["section-weather-location-suggestions", debouncedLocationQuery]
      : null,
    async () => {
      abortActiveLocationRequest();
      const controller = new AbortController();
      locationSuggestionsAbortRef.current = controller;
      activeRequestQueryRef.current = debouncedLocationQuery;
      abortedQueryRef.current.delete(debouncedLocationQuery);
      const requestQueryGeneration = locationQueryGenerationRef.current;
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      const localSuggestions = getLocalGeoAddressSuggestions(debouncedLocationQuery, 6);

      const isStaleRequest = () => controller.signal.aborted
        || requestQueryGeneration !== locationQueryGenerationRef.current;

      if (localSuggestions.length >= 6) {
        window.clearTimeout(timeout);
        if (locationSuggestionsAbortRef.current === controller) {
          locationSuggestionsAbortRef.current = null;
          activeRequestQueryRef.current = null;
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
          activeRequestQueryRef.current = null;
        }
      }
    },
    { ...swrRecentViewOptions, keepPreviousData: false },
  );
  const { mutate: revalidateLocationSuggestions } = locationSuggestions;

  useEffect(() => {
    const queryChanged = lastNormalizedLocationQueryRef.current !== normalizedLocationQuery;
    if (queryChanged) {
      lastNormalizedLocationQueryRef.current = normalizedLocationQuery;
      locationQueryGenerationRef.current += 1;
      abortActiveLocationRequest();
    }

    const timer = window.setTimeout(() => {
      setDebouncedLocationQuery(normalizedLocationQuery);
      if (abortedQueryRef.current.delete(normalizedLocationQuery)) {
        void revalidateLocationSuggestions().catch(() => undefined);
      }
    }, WEATHER_LOCATION_SUGGESTION_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [abortActiveLocationRequest, normalizedLocationQuery, revalidateLocationSuggestions]);

  useEffect(() => () => locationSuggestionsAbortRef.current?.abort(), []);
  useEffect(() => {
    if (debouncedLocationQuery.length < 3) {
      abortActiveLocationRequest();
    }
  }, [abortActiveLocationRequest, debouncedLocationQuery]);

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
