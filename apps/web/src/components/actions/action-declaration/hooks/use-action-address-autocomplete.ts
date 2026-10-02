import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ActionLocationCoordinates } from "@/lib/actions/types";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import {
  getAddressSuggestionHighlightIndex,
  getLocalGeoAddressSuggestions,
  loadRemoteAddressSuggestions,
} from "../action-address-autocomplete.model";

type UseActionAddressAutocompleteProps = {
  value: string;
  onChange: (value: string, coordinates?: ActionLocationCoordinates | null) => void;
};

export function useActionAddressAutocomplete({ value, onChange }: UseActionAddressAutocompleteProps) {
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
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      const localSuggestions = getLocalGeoAddressSuggestions(trimmedValue, 6);
      setSuggestions(localSuggestions);
      setHighlightedIndex(0);
      try {
        const nextSuggestions = await loadRemoteAddressSuggestions({ query: trimmedValue, localSuggestions, signal: controller.signal });
        if (nextSuggestions !== null) setSuggestions(nextSuggestions);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hasVisibleSuggestions, trimmedValue]);

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
    onChange(event.target.value);
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
