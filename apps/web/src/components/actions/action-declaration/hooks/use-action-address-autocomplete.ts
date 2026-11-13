import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ActionLocationCoordinates } from "@/lib/actions/types";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import { DEFAULT_COUNTRY_CODE, type CountryCode } from "@/lib/user-location-preference";
import { parseActionCoordinateInput } from "../action-coordinate-input";
import {
  getAddressSuggestionHighlightIndex,
  getLocalGeoAddressSuggestions,
  loadRemoteAddressSuggestions,
} from "../action-address-autocomplete.model";

type UseActionAddressAutocompleteProps = {
  value: string;
  onChange: (value: string, coordinates?: ActionLocationCoordinates | null) => void;
  countryCode?: CountryCode;
};

export function useActionAddressAutocomplete({ value, onChange, countryCode = DEFAULT_COUNTRY_CODE }: UseActionAddressAutocompleteProps) {
  const listboxId = useId();
  const [suggestions, setSuggestions] = useState<GeoAddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const blurTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const trimmedValue = value.trim();
  const hasVisibleSuggestions = isOpen && trimmedValue.length >= 3;

  useEffect(() => {
    if (!hasVisibleSuggestions) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const loadSuggestions = async () => {
      setIsLoading(true);
      const localSuggestions = countryCode === DEFAULT_COUNTRY_CODE
        ? getLocalGeoAddressSuggestions(trimmedValue, 6)
        : [];
      setSuggestions(localSuggestions);
      setHighlightedIndex(0);
      try {
        const nextSuggestions = await loadRemoteAddressSuggestions({
          query: trimmedValue,
          localSuggestions,
          countryCode,
          signal: controller.signal,
        });
        if (nextSuggestions !== null) setSuggestions(nextSuggestions);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    const timer = window.setTimeout(() => {
      void /* fire-and-forget -- the debounce callback owns its loading state and abort handling. */ loadSuggestions().catch(() => undefined);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [countryCode, hasVisibleSuggestions, trimmedValue]);

  useEffect(() => () => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    abortRef.current?.abort();
  }, []);

  const closeSuggestions = () => {
    setIsOpen(false);
    setSuggestions([]);
    setIsLoading(false);
    setHighlightedIndex(0);
  };
  const selectSuggestion = (suggestion: GeoAddressSuggestion) => {
    onChange(suggestion.label, { latitude: suggestion.latitude, longitude: suggestion.longitude });
    closeSuggestions();
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value, parseActionCoordinateInput(event.target.value));
    setIsOpen(true);
    setHighlightedIndex(0);
    if (event.target.value.trim().length < 3) {
      setSuggestions([]);
      setIsLoading(false);
    }
  };
  const handleFocus = () => {
    setIsOpen(true);
    if (trimmedValue.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      setHighlightedIndex(0);
    }
  };
  const handleBlur = () => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(closeSuggestions, 120);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!hasVisibleSuggestions || suggestions.length === 0) {
      if (event.key === "Escape") closeSuggestions();
      return;
    }
    const nextIndex = getAddressSuggestionHighlightIndex({ key: event.key, currentIndex: highlightedIndex, suggestionCount: suggestions.length });
    if (nextIndex !== null) {
      event.preventDefault();
      setHighlightedIndex(nextIndex);
      return;
    }
    if (event.key === "Enter") {
      const suggestion = suggestions[highlightedIndex];
      if (suggestion) {
        event.preventDefault();
        selectSuggestion(suggestion);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
    }
  };

  return {
    listboxId,
    suggestions,
    isLoading,
    highlightedIndex,
    trimmedValue,
    hasVisibleSuggestions,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
    selectSuggestion,
    setHighlightedIndex,
  };
}
