"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherLocation, WeatherLocationSuggestion } from "./weather-types";

type WeatherLocationPickerProps = {
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: WeatherLocationSuggestion[];
  isLoading: boolean;
  errorMessage?: string | null;
  selectedLocation: WeatherLocation;
  onSelectLocation: (location: WeatherLocationSuggestion) => void;
  label?: string;
  helperText?: string;
  emptyMessage?: string;
  currentLocationLabel?: string;
};

export function WeatherLocationPicker({
  query,
  onQueryChange,
  suggestions,
  isLoading,
  errorMessage,
  selectedLocation,
  onSelectLocation,
  label = "Lieu",
  helperText = "Saisis une commune, une ville ou un lieu précis",
  emptyMessage = "Aucune ville trouvée. Essaie une autre commune ou une autre ville.",
  currentLocationLabel,
}: WeatherLocationPickerProps) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const blurTimerRef = useRef<number | null>(null);
  const trimmedQuery = query.trim();
  const canShowSuggestions = isOpen && trimmedQuery.length >= 3;

  useEffect(
    () => () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    },
    [],
  );

  const selectSuggestion = (location: WeatherLocationSuggestion) => {
    onSelectLocation(location);
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!canShowSuggestions || suggestions.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current === 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      const suggestion = suggestions[highlightedIndex];
      if (suggestion) {
        event.preventDefault();
        selectSuggestion(suggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-emerald-700">
            {label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {helperText}
          </p>
        </div>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
          <Search size={18} />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <MapPin size={15} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              if (blurTimerRef.current !== null) {
                window.clearTimeout(blurTimerRef.current);
              }
              blurTimerRef.current = window.setTimeout(() => {
                setIsOpen(false);
              }, 120);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            placeholder="Ex. Lyon, Marseille, Nantes..."
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={canShowSuggestions}
            aria-controls={listboxId}
            className="h-12 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
          />
          {isLoading ? (
            <Loader2
              size={15}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-600"
            />
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-[1.35rem] border border-emerald-200/70 bg-emerald-50/70 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-800/80">
                {currentLocationLabel ?? "Lieu retenu"}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-emerald-950">{selectedLocation.label}</p>
              <p className="mt-0.5 truncate text-xs text-emerald-900/70">{selectedLocation.subtitle}</p>
            </div>
            <span className="mt-0.5 inline-flex shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
              GPS
            </span>
          </div>
        </div>

        {canShowSuggestions ? (
          <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Suggestions de lieux
            </div>
            <div id={listboxId} role="listbox" className="max-h-72 overflow-auto p-1.5">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => {
                  const isActive = index === highlightedIndex;

                  return (
                    <button
                      key={`${suggestion.label}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[1.1rem] px-3 py-3 text-left transition",
                        isActive ? "bg-emerald-50 text-emerald-950" : "hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                          isActive
                            ? "border-emerald-200 bg-white text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500",
                        )}
                      >
                        <MapPin size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {suggestion.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {suggestion.subtitle || "Lieu géocodé"}
                        </span>
                      </span>
                      {isActive ? (
                        <Check size={15} className="mt-1 shrink-0 text-emerald-600" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-sm text-slate-500">{emptyMessage}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
