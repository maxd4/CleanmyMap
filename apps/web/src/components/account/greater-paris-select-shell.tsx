"use client";

import { ChevronDown, Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import type { ArrondissementCity } from "@/lib/geo/paris-arrondissements";
import type {
  TerritoryLocationLevel,
  TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import {
  TerritoryLevelControl,
  TerritoryLevelDetails,
} from "./greater-paris-select-controls";
import { TerritorySuggestionList } from "./greater-paris-select-suggestions";

type TerritoryLevelConfig = {
  label: string;
  placeholder: string;
};

type ShellProps = {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder: string;
  compact: boolean;
  isLight: boolean;
  selectedLevel: TerritoryLocationLevel;
  onLevelChange: (level: TerritoryLocationLevel) => void;
  currentConfig: TerritoryLevelConfig;
  controlClassName: string;
  arrondissementCity: ArrondissementCity;
  arrondissementValue: string;
  setArrondissementCity: (city: ArrondissementCity) => void;
  setArrondissementValue: (value: string) => void;
  commitSelection: (selection: TerritoryLocationSelection | null) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: GeoAddressSuggestion[];
  isLoading: boolean;
  errorMessage: string | null;
  trimmedQuery: string;
  onPickSuggestion: (suggestion: GeoAddressSuggestion) => void;
};

function TerritoryShellHeader({ isLight }: { isLight: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p
          className={cn(
            "cmm-text-caption font-bold uppercase tracking-[0.14em]",
            isLight ? "text-emerald-700" : "text-emerald-200/90",
          )}
        >
          Territoire
        </p>
        <p
          className={cn(
            "mt-1 text-sm leading-6",
            isLight ? "text-slate-600" : "text-violet-100/78",
          )}
        >
          Choisis le niveau de territoire à enregistrer, puis sélectionne le lieu voulu.
        </p>
      </div>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isLight
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-white/10 bg-white/[0.08] text-white",
        )}
      >
        <Globe className="h-5 w-5" />
      </span>
    </div>
  );
}

function TerritorySearchField({
  compact,
  placeholder,
  isLight,
  currentConfig,
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  suggestions,
  isLoading,
  errorMessage,
  trimmedQuery,
  selectedLevelLabel,
  onPickSuggestion,
}: Pick<
  ShellProps,
  | "compact"
  | "placeholder"
  | "isLight"
  | "currentConfig"
  | "searchQuery"
  | "setSearchQuery"
  | "isSearchOpen"
  | "setIsSearchOpen"
  | "suggestions"
  | "isLoading"
  | "errorMessage"
  | "trimmedQuery"
  | "onPickSuggestion"
> & { selectedLevelLabel: string }) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2",
            isLight ? "text-slate-400" : "text-violet-100/55",
          )}
        >
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          placeholder={compact ? placeholder : currentConfig.placeholder || placeholder}
          className={cn(
            "w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm outline-none focus:ring-2",
            isLight
              ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
              : "border-white/10 bg-white/[0.08] text-white placeholder:text-violet-100/38 focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-emerald-300/30",
          )}
        />
        <button
          type="button"
          onClick={() => setIsSearchOpen((current) => !current)}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors",
            isLight
              ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              : "text-violet-100/60 hover:bg-white/[0.06] hover:text-white",
          )}
          title="Afficher les suggestions"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <TerritorySuggestionList
        isOpen={isSearchOpen}
        suggestions={suggestions}
        isLoading={isLoading}
        errorMessage={errorMessage}
        trimmedQuery={trimmedQuery}
        compact={compact}
        isLight={isLight}
        selectedLevelLabel={selectedLevelLabel}
        onPick={onPickSuggestion}
      />
    </div>
  );
}

function TerritorySelectionSummary({
  value,
  isLight,
  selectedLevelLabel,
}: Pick<ShellProps, "value" | "isLight"> & { selectedLevelLabel: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.06]",
      )}
    >
      <p
        className={cn(
          "cmm-text-caption font-bold uppercase tracking-[0.22em]",
          isLight ? "text-slate-500" : "text-violet-100/64",
        )}
      >
        Lieu retenu
      </p>
      {value ? (
        <div className="mt-2 space-y-1">
          <p
            className={cn(
              "text-sm font-semibold",
              isLight ? "text-slate-900" : "text-white",
            )}
          >
            {value.label}
          </p>
          <p
            className={cn(
              "text-xs",
              isLight ? "text-slate-500" : "text-violet-100/68",
            )}
          >
            {value.subtitle || selectedLevelLabel}
            {value.arrondissement ? ` · ${value.arrondissement}e arrondissement` : ""}
          </p>
        </div>
      ) : (
        <p
          className={cn(
            "mt-2 text-sm",
            isLight ? "text-slate-500" : "text-violet-100/62",
          )}
        >
          Sélectionne un lieu dans les suggestions pour l’enregistrer.
        </p>
      )}
    </div>
  );
}

export function TerritoryLocationShell(props: ShellProps) {
  const {
    value,
    onChange,
    placeholder,
    compact,
    isLight,
    selectedLevel,
    onLevelChange,
    currentConfig,
    controlClassName,
    arrondissementCity,
    arrondissementValue,
    setArrondissementCity,
    setArrondissementValue,
    commitSelection,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    suggestions,
    isLoading,
    errorMessage,
    trimmedQuery,
    onPickSuggestion,
  } = props;
  const selectedLevelLabel = currentConfig.label;

  return (
    <div
      className={cn(
        compact
          ? "relative"
          : cn(
              "space-y-3 rounded-xl border p-3",
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-white/10 bg-white/[0.05] shadow-[0_18px_50px_-38px_rgba(15,23,42,0.62)] backdrop-blur-xl",
            ),
      )}
    >
      {!compact ? <TerritoryShellHeader isLight={isLight} /> : null}
      {!compact ? (
        <TerritoryLevelControl
          selectedLevel={selectedLevel}
          onLevelChange={onLevelChange}
          isLight={isLight}
          controlClassName={controlClassName}
        />
      ) : null}
      {!compact && selectedLevel === "country" ? (
        <TerritoryLevelDetails
          mode="country"
          isLight={isLight}
          controlClassName={controlClassName}
          arrondissementCity={arrondissementCity}
          arrondissementValue={arrondissementValue}
          value={value}
          setArrondissementCity={setArrondissementCity}
          setArrondissementValue={setArrondissementValue}
          commitSelection={commitSelection}
          onChange={onChange}
        />
      ) : !compact && selectedLevel === "arrondissement" ? (
        <TerritoryLevelDetails
          mode="arrondissement"
          isLight={isLight}
          controlClassName={controlClassName}
          arrondissementCity={arrondissementCity}
          arrondissementValue={arrondissementValue}
          value={value}
          setArrondissementCity={setArrondissementCity}
          setArrondissementValue={setArrondissementValue}
          commitSelection={commitSelection}
          onChange={onChange}
        />
      ) : (
        <TerritorySearchField
          compact={compact}
          placeholder={placeholder}
          isLight={isLight}
          currentConfig={currentConfig}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          suggestions={suggestions}
          isLoading={isLoading}
          errorMessage={errorMessage}
          trimmedQuery={trimmedQuery}
          selectedLevelLabel={selectedLevelLabel}
          onPickSuggestion={onPickSuggestion}
        />
      )}
      {!compact ? (
        <TerritorySelectionSummary
          value={value}
          isLight={isLight}
          selectedLevelLabel={selectedLevelLabel}
        />
      ) : null}
    </div>
  );
}
