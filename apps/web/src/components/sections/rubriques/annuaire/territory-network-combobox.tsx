"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, LocateFixed, MapPin, Search, X } from "lucide-react";
import {
  TERRITORY_GROUP_LABELS_EN,
  TERRITORY_GROUP_LABELS_FR,
  type TerritoryEntry,
} from "@/lib/partners/territory-network-catalog";
import { TERRITORY_GROUP_ORDER } from "@/lib/partners/territory-network-catalog.data";
import {
  searchTerritories,
  type RankedTerritoriesResult,
} from "@/lib/partners/territory-network-ranking";

interface TerritoryNetworkComboboxProps {
  fr: boolean;
  selectedTerritory: TerritoryEntry;
  ranked: RankedTerritoriesResult;
  gpsAvailable: boolean;
  gpsLoading: boolean;
  gpsError: string | null;
  onSelectTerritory: (territory: TerritoryEntry) => void;
  onRequestGps: () => void;
}

const OIF_STATUS_LABELS_FR = {
  membre: "OIF membre",
  associe: "OIF associé",
  observateur: "OIF observateur",
} as const;

function formatOptionSecondaryLabel(entry: TerritoryEntry, fr: boolean): string | null {
  if (entry.group !== "francophonie") {
    return null;
  }
  const status = entry.oifStatus
    ? fr
      ? OIF_STATUS_LABELS_FR[entry.oifStatus]
      : `OIF ${entry.oifStatus}`
    : null;
  const parts = [entry.countryNameFr, status].filter(Boolean);
  return parts.join(" · ");
}

export function TerritoryNetworkCombobox({
  fr,
  selectedTerritory,
  ranked,
  gpsAvailable,
  gpsLoading,
  gpsError,
  onSelectTerritory,
  onRequestGps,
}: TerritoryNetworkComboboxProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const isSearching = query.trim().length > 0;

  const { flatOptions, sections } = useMemo(() => {
    const groupLabels = fr ? TERRITORY_GROUP_LABELS_FR : TERRITORY_GROUP_LABELS_EN;
    if (isSearching) {
      const matched = searchTerritories(query, [
        ...ranked.suggestions,
        ...ranked.remaining,
      ]);
      const groupedSections = TERRITORY_GROUP_ORDER.map((groupKey) => ({
        key: groupKey,
        label: groupLabels[groupKey],
        items: matched.filter((item) => item.group === groupKey),
      })).filter((section) => section.items.length > 0);
      const orderedFlat = groupedSections.flatMap((section) => section.items);
      return { flatOptions: orderedFlat, sections: groupedSections };
    }

    const suggestionSection = {
      key: "suggestions",
      label: fr ? "Suggestions contextuelles" : "Suggested territories",
      items: [...ranked.suggestions],
    };
    const groupedSections = TERRITORY_GROUP_ORDER.map((groupKey) => ({
      key: groupKey,
      label: groupLabels[groupKey],
      items: ranked.remaining.filter((item) => item.group === groupKey),
    })).filter((section) => section.items.length > 0);

    const allSections = [suggestionSection, ...groupedSections];
    return {
      flatOptions: allSections.flatMap((section) => section.items),
      sections: allSections,
    };
  }, [fr, isSearching, query, ranked.remaining, ranked.suggestions]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const clampedActiveIndex =
    flatOptions.length > 0 ? Math.min(activeIndex, flatOptions.length - 1) : -1;
  const activeOption =
    clampedActiveIndex >= 0 ? flatOptions[clampedActiveIndex] : undefined;

  function commitSelection(entry: TerritoryEntry) {
    onSelectTerritory(entry);
    setQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else if (flatOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatOptions.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(Math.max(0, flatOptions.length - 1));
      } else if (flatOptions.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatOptions.length) % flatOptions.length);
      }
    } else if (event.key === "Home" && isOpen && flatOptions.length > 0) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && isOpen && flatOptions.length > 0) {
      event.preventDefault();
      setActiveIndex(flatOptions.length - 1);
    } else if (event.key === "Enter" && isOpen && activeOption) {
      event.preventDefault();
      commitSelection(activeOption);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  }

  const displayName = fr ? selectedTerritory.nameFr : selectedTerritory.nameEn;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-white/15 bg-slate-900/75 p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={inputId}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-300"
          >
            <MapPin size={13} aria-hidden="true" />
            <span>{fr ? "Choisir un territoire" : "Choose a territory"}</span>
          </label>
          <div className="relative mt-1.5 flex items-center">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 text-slate-400"
            />
            <input
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                isOpen && activeOption ? `${listboxId}-${activeOption.id}` : undefined
              }
              aria-label={fr ? "Choisir un territoire" : "Choose a territory"}
              value={isOpen ? query : `${selectedTerritory.code} — ${displayName}`}
              placeholder={
                fr
                  ? "Rechercher par nom, code INSEE/ISO ou pays..."
                  : "Search by name, INSEE/ISO code or country..."
              }
              onFocus={() => {
                setIsOpen(true);
                setActiveIndex(0);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsOpen(true);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border border-white/15 bg-slate-950/85 py-2 pl-9 pr-16 text-xs font-semibold text-white placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            />
            {isOpen && query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(0);
                }}
                aria-label={fr ? "Effacer la recherche" : "Clear search"}
                className="absolute right-8 rounded p-1 text-slate-400 hover:text-white"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={
                isOpen
                  ? fr
                    ? "Fermer la liste des territoires"
                    : "Close territory list"
                  : fr
                    ? "Ouvrir la liste des territoires"
                    : "Open territory list"
              }
              className="absolute right-2 rounded p-1 text-slate-300 hover:text-white"
            >
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={isOpen ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </button>
          </div>
        </div>

        {gpsAvailable ? (
          <button
            type="button"
            onClick={onRequestGps}
            disabled={gpsLoading}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-200 transition-colors hover:bg-violet-500/25 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
          >
            <LocateFixed size={13} aria-hidden="true" />
            <span>
              {gpsLoading
                ? fr
                  ? "Localisation..."
                  : "Locating..."
                : fr
                  ? "Me localiser"
                  : "Use my location"}
            </span>
          </button>
        ) : null}
      </div>

      {ranked.isGeodesicApproximation ? (
        <p className="mt-1.5 text-xs text-slate-400">
          {fr
            ? "Proximité calculée par approximation géodésique sur point représentatif."
            : "Proximity ranked by geodesic approximation on representative points."}
        </p>
      ) : null}
      {gpsError ? (
        <p role="status" className="mt-1.5 text-xs text-amber-300">
          {gpsError}
        </p>
      ) : null}

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={fr ? "Territoires disponibles" : "Available territories"}
          className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl"
        >
          {sections.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">
              {fr
                ? "Aucun territoire correspondant."
                : "No matching territory."}
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.key} className="mb-1.5 last:mb-0">
                <p className="px-2.5 py-1 text-xs font-black uppercase tracking-wider text-violet-300">
                  {section.label}
                </p>
                {section.items.map((entry) => {
                  const flatIdx = flatOptions.findIndex((item) => item.id === entry.id);
                  const isActive = flatIdx === clampedActiveIndex;
                  const isSelected = entry.id === selectedTerritory.id;
                  const secondary = formatOptionSecondaryLabel(entry, fr);
                  return (
                    <button
                      key={entry.id}
                      id={`${listboxId}-${entry.id}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commitSelection(entry)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isActive
                          ? "bg-violet-500/25 text-white"
                          : isSelected
                            ? "bg-white/10 text-violet-200"
                            : "text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="mr-2 font-mono font-bold text-violet-300">
                          {entry.code}
                        </span>
                        <span className="font-semibold">
                          {fr ? entry.nameFr : entry.nameEn}
                        </span>
                      </span>
                      {secondary ? (
                        <span className="shrink-0 text-xs text-slate-400">
                          {secondary}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
