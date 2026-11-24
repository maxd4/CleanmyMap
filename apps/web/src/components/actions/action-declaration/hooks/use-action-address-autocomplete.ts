import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ActionLocationCoordinates } from "@/lib/actions/types";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import { DEFAULT_COUNTRY_CODE, type CountryCode } from "@/lib/user-location-preference";
import { parseActionCoordinateInput } from "../action-coordinate-input";
import {
  getAddressSuggestionHighlightIndex,
  getLocalGeoAddressSuggestions,
  loadRemoteAddressSuggestionsWithStatus,
} from "../action-address-autocomplete.model";

const MAX_REMOTE_CACHE_ENTRIES = 20;

type UseActionAddressAutocompleteProps = {
  value: string;
  onChange: (value: string, coordinates?: ActionLocationCoordinates | null) => void;
  countryCode?: CountryCode;
};

export function useActionAddressAutocomplete({ value, onChange, countryCode = DEFAULT_COUNTRY_CODE }: UseActionAddressAutocompleteProps) {
  const listboxId = useId();
  const [suggestionsState, setSuggestionsState] = useState<{ key: string; items: GeoAddressSuggestion[] }>({
    key: "",
    items: [],
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [referencedValue, setReferencedValue] = useState<string | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const remoteCacheRef = useRef<Map<string, GeoAddressSuggestion[]>>(new Map());
  const trimmedValue = value.trim();
  const hasVisibleSuggestions = isOpen && trimmedValue.length > 0;
  const parsedCoordinates = parseActionCoordinateInput(trimmedValue);
  const currentQueryKey = `${countryCode}:${trimmedValue}`;
  const shouldFetchRemote =
    hasVisibleSuggestions &&
    trimmedValue.length >= 3 &&
    referencedValue !== trimmedValue &&
    parsedCoordinates === null;
  const isLoading = shouldFetchRemote && loadingKey === currentQueryKey;
  const suggestions =
    hasVisibleSuggestions &&
    trimmedValue.length >= 3 &&
    parsedCoordinates === null &&
    suggestionsState.key === currentQueryKey
      ? suggestionsState.items
      : [];

  useEffect(() => {
    if (!shouldFetchRemote) {
      abortRef.current?.abort();
      return;
    }
    if (remoteCacheRef.current.has(currentQueryKey)) {
      abortRef.current?.abort();
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const loadSuggestions = async () => {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setLoadingKey(currentQueryKey);
      const localSuggestions = countryCode === DEFAULT_COUNTRY_CODE
        ? getLocalGeoAddressSuggestions(trimmedValue, 6)
        : [];
      setSuggestionsState({ key: currentQueryKey, items: localSuggestions });
      setHighlightedIndex(0);
      try {
        const result = await loadRemoteAddressSuggestionsWithStatus({
          query: trimmedValue,
          localSuggestions,
          countryCode,
          signal: controller.signal,
        });
        if (controller.signal.aborted || requestId !== requestIdRef.current || result.status === "aborted") {
          return;
        }
        if (result.status === "ok") {
          if (remoteCacheRef.current.size >= MAX_REMOTE_CACHE_ENTRIES) {
            const oldestKey = remoteCacheRef.current.keys().next().value;
            if (oldestKey !== undefined) remoteCacheRef.current.delete(oldestKey);
          }
          remoteCacheRef.current.set(currentQueryKey, result.items);
        }
        setSuggestionsState({ key: currentQueryKey, items: result.items });
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoadingKey((current) => (current === currentQueryKey ? null : current));
        }
      }
    };
    const timer = window.setTimeout(() => {
      void /* fire-and-forget -- the debounce callback owns its loading state and abort handling. */ loadSuggestions().catch(() => undefined);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [countryCode, currentQueryKey, shouldFetchRemote, trimmedValue]);

  useEffect(() => () => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    abortRef.current?.abort();
  }, []);

  const closeSuggestions = () => {
    abortRef.current?.abort();
    setIsOpen(false);
    setLoadingKey(null);
    setSuggestionsState({ key: "", items: [] });
    setHighlightedIndex(0);
  };
  const selectSuggestion = (suggestion: GeoAddressSuggestion) => {
    setReferencedValue(suggestion.label);
    onChange(suggestion.label, { latitude: suggestion.latitude, longitude: suggestion.longitude });
    closeSuggestions();
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReferencedValue(null);
    const nextValue = event.target.value;
    const nextTrimmed = nextValue.trim();
    const parsedCoords = parseActionCoordinateInput(nextValue);
    onChange(nextValue, parsedCoords);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (nextTrimmed.length < 3 || parsedCoords !== null) {
      abortRef.current?.abort();
      setLoadingKey(null);
      setSuggestionsState({ key: "", items: [] });
      return;
    }
    const nextKey = `${countryCode}:${nextTrimmed}`;
    const cached = remoteCacheRef.current.get(nextKey);
    if (cached !== undefined) {
      setLoadingKey(null);
      setSuggestionsState({ key: nextKey, items: cached });
    }
  };
  const handleFocus = () => {
    setIsOpen(true);
    if (trimmedValue.length < 3 || parsedCoordinates !== null || referencedValue === trimmedValue) {
      setLoadingKey(null);
      setSuggestionsState({ key: "", items: [] });
      setHighlightedIndex(0);
      return;
    }
    const cachedSuggestions = remoteCacheRef.current.get(currentQueryKey);
    if (cachedSuggestions !== undefined) {
      setLoadingKey(null);
      setSuggestionsState({ key: currentQueryKey, items: cachedSuggestions });
      setHighlightedIndex(0);
    }
  };
  const handleBlur = () => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(closeSuggestions, 120);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!hasVisibleSuggestions) {
      if (event.key === "Escape") closeSuggestions();
      return;
    }
    const nextIndex = getAddressSuggestionHighlightIndex({ key: event.key, currentIndex: highlightedIndex, suggestionCount: suggestions.length + 1 });
    if (nextIndex !== null) {
      event.preventDefault();
      setHighlightedIndex(nextIndex);
      return;
    }
    if (event.key === "Enter") {
      if (highlightedIndex === 0) {
        event.preventDefault();
        const address = trimmedValue;
        if (address) {
          setReferencedValue(null);
          onChange(address, null);
          closeSuggestions();
        }
        return;
      }
      const suggestion = suggestions[highlightedIndex - 1];
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
    selectFreeAddress: () => {
      const address = trimmedValue;
      if (!address) return;
      setReferencedValue(null);
      onChange(address, null);
      closeSuggestions();
    },
    isReferenced: referencedValue === trimmedValue,
    setHighlightedIndex,
  };
}
