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

type AddressSuggestionsResponse = {
  status: string;
  query: string;
  items: GeoAddressSuggestion[];
};

export function useWeatherLocationSuggestions(locationQuery: string) {
  const locationSuggestionsAbortRef = useRef<AbortController | null>(null);
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState(locationQuery.trim());

  useEffect(() => {
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
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      const localSuggestions = getLocalGeoAddressSuggestions(debouncedLocationQuery, 6);

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
        return {
          ...remote,
          items: mergeGeoAddressSuggestions(localSuggestions, remote.items ?? [], 6),
        };
      } catch (error) {
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

  return {
    locationSuggestions,
    locationSuggestionsError: locationSuggestions.error
      ? "location_suggestions_unavailable"
      : null,
  };
}
