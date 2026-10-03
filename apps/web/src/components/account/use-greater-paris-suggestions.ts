"use client";

import { useEffect, useState } from "react";
import {
  getLocalGeoAddressSuggestions,
  mergeGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import { filterSuggestionsForLevel } from "@/lib/geo/greater-paris-location";
import type { TerritoryLocationLevel } from "@/lib/user-location-preference";

export function useTerritorySuggestions(
  query: string,
  level: TerritoryLocationLevel,
) {
  const [suggestions, setSuggestions] = useState<GeoAddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trimmedQuery = query.trim();
  const hasActiveQuery = level !== "country" && trimmedQuery.length >= 2;

  useEffect(() => {
    const nextTrimmedQuery = query.trim();
    const nextHasActiveQuery = level !== "country" && nextTrimmedQuery.length >= 2;

    if (!nextHasActiveQuery) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setErrorMessage(null);

      const localSuggestions = filterSuggestionsForLevel(
        getLocalGeoAddressSuggestions(nextTrimmedQuery, 8),
        level,
      );
      setSuggestions(localSuggestions);

      if (localSuggestions.length >= 8) {
        setIsLoading(false);
        return;
      }

      fetch(`/api/geo/address-suggestions?q=${encodeURIComponent(nextTrimmedQuery)}&limit=8`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Impossible de charger les suggestions.");
          }
          return (await response.json()) as {
            items?: GeoAddressSuggestion[];
          };
        })
        .then((payload) => {
          const items = Array.isArray(payload.items) ? payload.items : [];
          setSuggestions(
            mergeGeoAddressSuggestions(
              localSuggestions,
              filterSuggestionsForLevel(items, level),
              8,
            ),
          );
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Impossible de charger les suggestions.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [level, query]);

  return {
    suggestions: hasActiveQuery ? suggestions : [],
    isLoading: hasActiveQuery ? isLoading : false,
    errorMessage: hasActiveQuery ? errorMessage : null,
    trimmedQuery,
  };
}
