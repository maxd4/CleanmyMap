"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import {
  buildCompactSelectionFromSuggestion,
  buildCountrySelection,
  buildSelectionFromSuggestion,
  parseSelectedArrondissementCity,
} from "@/lib/geo/greater-paris-location";
import {
  inferArrondissementCityFromLabel,
  type ArrondissementCity,
} from "@/lib/geo/paris-arrondissements";
import type {
  TerritoryLocationLevel,
  TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import { getTerritoryLevelConfig } from "./greater-paris-select-controls";
import { TerritoryLocationShell } from "./greater-paris-select-shell";
import { useTerritorySuggestions } from "./use-greater-paris-suggestions";

export type { TerritoryLocationSelection };

function TerritoryLocationSelector({
  value,
  onChange,
  placeholder = "Rechercher un lieu...",
  appearance = "dark",
  compact = false,
}: {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder?: string;
  appearance?: "dark" | "light";
  compact?: boolean;
}) {
  const [selectedLevel, setSelectedLevel] = useState<TerritoryLocationLevel>(
    compact ? "commune" : value?.level ?? "commune",
  );
  const [searchQuery, setSearchQuery] = useState(value?.label ?? "");
  const [arrondissementCity, setArrondissementCity] = useState<ArrondissementCity>(
    parseSelectedArrondissementCity(value?.arrondissementCity) ??
      inferArrondissementCityFromLabel(value?.label ?? "") ??
      "Paris",
  );
  const [arrondissementValue, setArrondissementValue] = useState(
    value?.arrondissement ? String(value.arrondissement) : "",
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentConfig = useMemo(() => getTerritoryLevelConfig(selectedLevel), [selectedLevel]);
  const { suggestions, isLoading, errorMessage, trimmedQuery } = useTerritorySuggestions(
    searchQuery,
    compact ? "commune" : selectedLevel,
  );

  useEffect(() => {
    if (!value) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setSelectedLevel(compact ? "commune" : value.level);
      setSearchQuery(value.label);
      setArrondissementCity(
        parseSelectedArrondissementCity(value.arrondissementCity) ??
          inferArrondissementCityFromLabel(value.label) ??
          "Paris",
      );
      setArrondissementValue(value.arrondissement ? String(value.arrondissement) : "");
    });

    return () => {
      cancelled = true;
    };
  }, [compact, value]);

  const commitSelection = (nextSelection: TerritoryLocationSelection | null) => {
    onChange(nextSelection);
    if (nextSelection) {
      setSelectedLevel(compact ? "commune" : nextSelection.level);
      setSearchQuery(nextSelection.label);
      setArrondissementCity(
        parseSelectedArrondissementCity(nextSelection.arrondissementCity) ??
          inferArrondissementCityFromLabel(nextSelection.label) ??
          "Paris",
      );
      setArrondissementValue(
        nextSelection.arrondissement ? String(nextSelection.arrondissement) : "",
      );
    }
  };

  const handleLevelChange = (nextLevel: TerritoryLocationLevel) => {
    setSelectedLevel(nextLevel);
    setSearchQuery("");
    setArrondissementValue("");
    setIsSearchOpen(false);

    if (nextLevel === "country") {
      commitSelection(buildCountrySelection());
      return;
    }

    if (nextLevel === "arrondissement") {
      setArrondissementCity((current) => current ?? "Paris");
    }

    onChange(null);
  };

  const handlePickSuggestion = (suggestion: GeoAddressSuggestion) => {
    const nextSelection = compact
      ? buildCompactSelectionFromSuggestion(suggestion)
      : buildSelectionFromSuggestion(
          selectedLevel,
          suggestion,
          arrondissementValue,
          arrondissementCity,
        );
    commitSelection(nextSelection);
    setIsSearchOpen(false);
  };

  const isLight = appearance === "light";
  const controlClassName = isLight
    ? "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
    : "w-full rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 cmm-text-small text-white outline-none focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30";

  return (
    <TerritoryLocationShell
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      compact={compact}
      isLight={isLight}
      selectedLevel={selectedLevel}
      onLevelChange={handleLevelChange}
      currentConfig={currentConfig}
      controlClassName={controlClassName}
      arrondissementCity={arrondissementCity}
      arrondissementValue={arrondissementValue}
      setArrondissementCity={setArrondissementCity}
      setArrondissementValue={setArrondissementValue}
      commitSelection={commitSelection}
      isSearchOpen={isSearchOpen}
      setIsSearchOpen={setIsSearchOpen}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      suggestions={suggestions}
      isLoading={isLoading}
      errorMessage={errorMessage}
      trimmedQuery={trimmedQuery}
      onPickSuggestion={handlePickSuggestion}
    />
  );
}

export function GreaterParisSelect(props: {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder?: string;
  appearance?: "dark" | "light";
  compact?: boolean;
}) {
  return <TerritoryLocationSelector {...props} />;
}
