"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeoAddressSuggestion } from "@/lib/geo/address-suggestions";
import { buildCompactSelectionFromSuggestion } from "@/lib/geo/greater-paris-location";

function getSuggestionDisplay(
  suggestion: GeoAddressSuggestion,
  compact: boolean,
): { label: string; subtitle: string | null } {
  if (!compact) {
    return { label: suggestion.label, subtitle: suggestion.subtitle || null };
  }

  const selection = buildCompactSelectionFromSuggestion(suggestion);
  const detail = suggestion.subtitle.split("·")[1]?.trim() || null;
  return {
    label: selection.label,
    subtitle: selection.arrondissementCity ? selection.subtitle : detail,
  };
}

function SuggestionOption({
  suggestion,
  compact,
  isLight,
  selectedLevelLabel,
  onPick,
}: {
  suggestion: GeoAddressSuggestion;
  compact: boolean;
  isLight: boolean;
  selectedLevelLabel: string;
  onPick: () => void;
}) {
  const display = getSuggestionDisplay(suggestion, compact);

  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onPick();
      }}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
        isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.07]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          isLight
            ? "border-slate-200 bg-slate-50 text-emerald-700"
            : "border-white/10 bg-white/[0.06] text-violet-100/72",
        )}
      >
        <MapPin className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-semibold",
            isLight ? "text-slate-800" : "text-white",
          )}
        >
          {display.label}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-xs",
            isLight ? "text-slate-500" : "text-violet-100/64",
          )}
        >
          {display.subtitle ?? selectedLevelLabel}
        </span>
      </span>
    </button>
  );
}

export function TerritorySuggestionList({
  isOpen,
  suggestions,
  isLoading,
  errorMessage,
  trimmedQuery,
  compact,
  isLight,
  selectedLevelLabel,
  onPick,
}: {
  isOpen: boolean;
  suggestions: GeoAddressSuggestion[];
  isLoading: boolean;
  errorMessage: string | null;
  trimmedQuery: string;
  compact: boolean;
  isLight: boolean;
  selectedLevelLabel: string;
  onPick: (suggestion: GeoAddressSuggestion) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        isLight
          ? "border-slate-200 bg-white shadow-sm"
          : "border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_55%,rgba(88,28,135,0.84)_100%)] shadow-[0_20px_50px_-34px_rgba(15,23,42,0.6)]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-2",
          isLight ? "border-slate-200" : "border-white/10",
        )}
      >
        <p
          className={cn(
            "cmm-text-caption font-bold uppercase tracking-[0.22em]",
            isLight ? "text-slate-500" : "text-violet-100/64",
          )}
        >
          Suggestions
        </p>
        {isLoading ? (
          <p
            className={cn(
              "cmm-text-caption font-semibold uppercase tracking-[0.18em]",
              isLight ? "text-emerald-700" : "text-emerald-200/80",
            )}
          >
            Recherche...
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
      ) : suggestions.length === 0 ? (
        <p
          className={cn(
            "px-4 py-4 text-sm",
            isLight ? "text-slate-500" : "text-violet-100/64",
          )}
        >
          {trimmedQuery.length < 2
            ? "Tape au moins deux caractères pour lancer la recherche."
            : "Aucune suggestion trouvée."}
        </p>
      ) : (
        <div className="max-h-72 overflow-auto p-2">
          {suggestions.map((suggestion) => (
            <SuggestionOption
              key={`${suggestion.label}-${suggestion.latitude}-${suggestion.longitude}`}
              suggestion={suggestion}
              compact={compact}
              isLight={isLight}
              selectedLevelLabel={selectedLevelLabel}
              onPick={() => onPick(suggestion)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
