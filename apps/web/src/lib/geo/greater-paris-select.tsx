"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Globe, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLocalGeoAddressSuggestions,
  mergeGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import {
  extractArrondissementFromLabel,
  getArrondissementCityOptions,
  getArrondissementCityCount,
  getArrondissementHelpLabel,
  getArrondissementMunicipalLabel,
  inferArrondissementCityFromLabel,
  parseTerritoryArrondissement,
  type ArrondissementCity,
} from "@/lib/geo/paris-arrondissements";
import type {
  TerritoryLocationLevel,
  TerritoryLocationSelection,
} from "@/lib/user-location-preference";

export type { TerritoryLocationLevel, TerritoryLocationSelection };

const LEVEL_OPTIONS: Array<{
  value: TerritoryLocationLevel;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    value: "country",
    label: "Pays",
    description: "Pour une couverture nationale.",
    placeholder: "France",
  },
  {
    value: "region",
    label: "Région",
    description: "Pour cibler une région administrative.",
    placeholder: "Ex. Bretagne",
  },
  {
    value: "department",
    label: "Département",
    description: "Pour cibler un département.",
    placeholder: "Ex. Rhône",
  },
  {
    value: "commune",
    label: "Commune",
    description: "Pour cibler une ville ou une commune.",
    placeholder: "Ex. Lyon",
  },
  {
    value: "arrondissement",
    label: "Arrondissement",
    description: "Pour les villes qui ont des arrondissements.",
    placeholder: "Ex. Paris 11e, Lyon 2e, Marseille 1er",
  },
];

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildCountrySelection(): TerritoryLocationSelection {
  return {
    country: "France",
    level: "country",
    label: "France",
    subtitle: "Territoire national",
    arrondissement: null,
    arrondissementCity: null,
  };
}

function parseSelectedArrondissementCity(value: unknown): ArrondissementCity | null {
  return value === "Paris" || value === "Lyon" || value === "Marseille"
    ? value
    : null;
}

function buildSelectionFromSuggestion(
  level: TerritoryLocationLevel,
  suggestion: GeoAddressSuggestion,
  arrondissementValue: string,
  arrondissementCity: ArrondissementCity | null,
): TerritoryLocationSelection {
  const parsedFromLabel = extractArrondissementFromLabel(suggestion.label);
  const parsedFromDraft = extractArrondissementFromLabel(arrondissementValue);
  const arrondissement =
    parseTerritoryArrondissement(parsedFromLabel) ??
    parseTerritoryArrondissement(parsedFromDraft) ??
    null;
  const inferredCity =
    inferArrondissementCityFromLabel(suggestion.label) ??
    inferArrondissementCityFromLabel(suggestion.subtitle) ??
    arrondissementCity;

  return {
    country: "France",
    level,
    label: suggestion.label,
    subtitle: suggestion.subtitle || null,
    arrondissement,
    arrondissementCity: inferredCity,
  };
}

function filterSuggestionsForLevel(
  items: GeoAddressSuggestion[],
  level: TerritoryLocationLevel,
): GeoAddressSuggestion[] {
  return level === "arrondissement"
    ? items
        .filter((item) => {
          const label = normalizeText(item.label);
          return Boolean(extractArrondissementFromLabel(item.label)) || label.includes("arrondissement");
        })
        .sort((left, right) => {
          const leftScore = extractArrondissementFromLabel(left.label) ? 1 : 0;
          const rightScore = extractArrondissementFromLabel(right.label) ? 1 : 0;
          return rightScore - leftScore;
        })
    : items;
}

function useTerritorySuggestions(query: string, level: TerritoryLocationLevel) {
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

function levelConfig(level: TerritoryLocationLevel) {
  return (
    LEVEL_OPTIONS.find((option) => option.value === level) ?? LEVEL_OPTIONS[2]
  );
}

export function TerritoryLocationSelector({
  value,
  onChange,
  placeholder = "Rechercher un lieu...",
}: {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder?: string;
}) {
  const [selectedLevel, setSelectedLevel] = useState<TerritoryLocationLevel>(
    value?.level ?? "commune",
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

  const currentConfig = useMemo(() => levelConfig(selectedLevel), [selectedLevel]);
  const { suggestions, isLoading, errorMessage, trimmedQuery } = useTerritorySuggestions(
    searchQuery,
    selectedLevel,
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
      setSelectedLevel(value.level);
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
  }, [value]);

  const selectedSuggestion = value;
  const hasSelection = Boolean(selectedSuggestion);

  const commitSelection = (nextSelection: TerritoryLocationSelection | null) => {
    onChange(nextSelection);
    if (nextSelection) {
      setSelectedLevel(nextSelection.level);
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
    const nextSelection = buildSelectionFromSuggestion(
      selectedLevel,
      suggestion,
      arrondissementValue,
      arrondissementCity,
    );
    commitSelection(nextSelection);
    setIsSearchOpen(false);
  };

  const selectedLevelLabel = useMemo(
    () => levelConfig(selectedLevel).label,
    [selectedLevel],
  );

  const arrondissementCount = useMemo(
    () => getArrondissementCityCount(arrondissementCity),
    [arrondissementCity],
  );

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.62)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-emerald-200/90">
            Territoire
          </p>
          <p className="mt-1 text-sm leading-6 text-violet-100/78">
            Choisis le niveau de territoire à enregistrer, puis sélectionne le lieu voulu.
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white">
          <Globe className="h-5 w-5" />
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <label className="block space-y-2">
          <span className="cmm-text-small font-medium text-white/90">Pays</span>
          <select
            value="France"
            onChange={() => {
              /* France only for now */
            }}
            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 cmm-text-small text-white outline-none focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30"
          >
            <option value="France">France</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="cmm-text-small font-medium text-white/90">
            Niveau de territoire
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {LEVEL_OPTIONS.map((option) => {
              const isSelected = option.value === selectedLevel;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleLevelChange(option.value)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition-all",
                    isSelected
                      ? "border-emerald-300/40 bg-emerald-300/15 shadow-[0_16px_30px_-22px_rgba(16,185,129,0.8)]"
                      : "border-white/10 bg-white/[0.06] hover:border-white/20 hover:bg-white/[0.1]",
                  )}
                >
                  <span className="block text-sm font-semibold text-white">{option.label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-violet-100/68">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {selectedLevel === "country" ? (
        <div className="rounded-[1.35rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50">
          La couverture nationale est active. Tu peux enregistrer la France entière ou
          changer de niveau à tout moment.
        </div>
      ) : selectedLevel === "arrondissement" ? (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <label className="block space-y-2">
              <span className="cmm-text-small font-medium text-white/90">
                Ville
              </span>
              <select
                value={arrondissementCity}
                onChange={(event) => {
                  const nextCity = parseSelectedArrondissementCity(event.target.value) ?? "Paris";
                  setArrondissementCity(nextCity);
                  if (arrondissementValue) {
                    const parsed = parseTerritoryArrondissement(arrondissementValue);
                    if (parsed) {
                      commitSelection({
                        country: "France",
                        level: "arrondissement",
                        label: getArrondissementMunicipalLabel(nextCity, parsed),
                        subtitle: getArrondissementHelpLabel(nextCity, parsed),
                        arrondissement: parsed,
                        arrondissementCity: nextCity,
                      });
                    }
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30"
              >
                {getArrondissementCityOptions().map((city) => (
                  <option key={city.value} value={city.value} className="text-slate-900">
                    {city.label} - {city.description}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="cmm-text-small font-medium text-white/90">
                Arrondissement
              </span>
              <select
                value={arrondissementValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setArrondissementValue(nextValue);
                  const parsed = parseTerritoryArrondissement(nextValue);
                  if (parsed) {
                    commitSelection({
                      country: "France",
                      level: "arrondissement",
                      label: getArrondissementMunicipalLabel(arrondissementCity, parsed),
                      subtitle: getArrondissementHelpLabel(arrondissementCity, parsed),
                      arrondissement: parsed,
                      arrondissementCity,
                    });
                  } else if (value) {
                    onChange({ ...value, arrondissement: null, arrondissementCity });
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30"
              >
                <option value="" className="text-slate-900">
                  Choisir le numéro
                </option>
                {Array.from({ length: arrondissementCount }, (_, index) => index + 1).map(
                  (number) => (
                    <option key={number} value={String(number)} className="text-slate-900">
                      {getArrondissementMunicipalLabel(arrondissementCity, number)}
                      {arrondissementCity === "Marseille"
                        ? ` - ${getArrondissementHelpLabel(arrondissementCity, number)}`
                        : ""}
                    </option>
                  ),
                )}
              </select>
              {arrondissementCity === "Marseille" && arrondissementValue ? (
                <p className="cmm-text-caption text-violet-100/64">
                  {getArrondissementHelpLabel(arrondissementCity, Number(arrondissementValue)) ||
                    "Mairie de secteur"}
                </p>
              ) : null}
            </label>
          </div>

          <p className="cmm-text-caption text-violet-100/64">
            Les villes équipées d&apos;arrondissements sont Paris, Lyon et Marseille.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-100/55">
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
              placeholder={currentConfig.placeholder || placeholder}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.08] py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-violet-100/38 focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30"
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-violet-100/60 transition hover:bg-white/[0.06] hover:text-white"
              title="Afficher les suggestions"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {isSearchOpen ? (
            <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_55%,rgba(88,28,135,0.84)_100%)] shadow-[0_20px_50px_-34px_rgba(15,23,42,0.6)]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/64">
                  Suggestions
                </p>
                {isLoading ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                    Recherche...
                  </p>
                ) : null}
              </div>

              {errorMessage ? (
                <p className="px-4 py-3 text-sm text-rose-200">{errorMessage}</p>
              ) : suggestions.length === 0 ? (
                <p className="px-4 py-4 text-sm text-violet-100/64">
                  {trimmedQuery.length < 2
                    ? "Tape au moins deux caractères pour lancer la recherche."
                    : "Aucune suggestion trouvée."}
                </p>
              ) : (
                <div className="max-h-72 overflow-auto p-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.label}-${suggestion.latitude}-${suggestion.longitude}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handlePickSuggestion(suggestion);
                      }}
                      className="flex w-full items-start gap-3 rounded-[1.1rem] px-3 py-3 text-left transition hover:bg-white/[0.07]"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-violet-100/72">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">
                          {suggestion.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-violet-100/64">
                          {suggestion.subtitle || selectedLevelLabel}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/64">
          Lieu retenu
        </p>
        {hasSelection ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-semibold text-white">{value?.label}</p>
            <p className="text-xs text-violet-100/68">
              {value?.subtitle || selectedLevelLabel}
              {value?.arrondissement ? ` · ${value.arrondissement}e arrondissement` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-violet-100/62">
            Sélectionne un lieu dans les suggestions pour l’enregistrer.
          </p>
        )}
      </div>
    </div>
  );
}

export function GreaterParisLocationSelector(props: {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder?: string;
}) {
  return <TerritoryLocationSelector {...props} />;
}

export function GreaterParisSelect(props: {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder?: string;
}) {
  return <TerritoryLocationSelector {...props} />;
}
