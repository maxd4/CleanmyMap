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
  type ParisArrondissement,
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

function getCompactArrondissement(
  suggestion: GeoAddressSuggestion,
): { city: ArrondissementCity; arrondissement: ParisArrondissement } | null {
  const sources = [suggestion.subtitle, suggestion.label];
  for (const source of sources) {
    const match = source.match(/\b(Paris|Lyon|Marseille)\s+(\d{1,2})(?:er|e|ème|eme)?\b/i);
    if (match) {
      const arrondissement = parseTerritoryArrondissement(Number.parseInt(match[2], 10));
      const city = parseSelectedArrondissementCity(match[1]);
      if (city && arrondissement && arrondissement <= getArrondissementCityCount(city)) {
        return { city, arrondissement };
      }
    }
  }

  const postalMatch = suggestion.label.match(/\b(75|69|13)(\d{3})\b/);
  if (postalMatch) {
    const city = postalMatch[1] === "75"
      ? "Paris"
      : postalMatch[1] === "69"
        ? "Lyon"
        : "Marseille";
    const arrondissement = parseTerritoryArrondissement(Number.parseInt(postalMatch[2].slice(1), 10));
    if (arrondissement && arrondissement <= getArrondissementCityCount(city)) {
      return { city, arrondissement };
    }
  }

  return null;
}

function buildCompactSelectionFromSuggestion(
  suggestion: GeoAddressSuggestion,
): TerritoryLocationSelection {
  const arrondissement = getCompactArrondissement(suggestion);
  const inferredCity =
    arrondissement?.city ??
    inferArrondissementCityFromLabel(suggestion.subtitle) ??
    inferArrondissementCityFromLabel(suggestion.label);
  const subtitleCity = suggestion.subtitle
    .split("·")[0]
    ?.split(",")[0]
    ?.trim();
  const labelCity = suggestion.label
    .split(",")
    .at(-1)
    ?.replace(/\b\d{5}\b/, "")
    .trim();
  const label = arrondissement
    ? getArrondissementMunicipalLabel(arrondissement.city, arrondissement.arrondissement)
    : subtitleCity || labelCity || suggestion.label;

  return {
    country: "France",
    level: arrondissement ? "arrondissement" : "commune",
    label,
    subtitle: inferredCity ?? null,
    arrondissement: arrondissement?.arrondissement ?? null,
    arrondissementCity: inferredCity,
  };
}

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

  const currentConfig = useMemo(() => levelConfig(selectedLevel), [selectedLevel]);
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

  const selectedSuggestion = value;
  const hasSelection = Boolean(selectedSuggestion);

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

  const selectedLevelLabel = useMemo(
    () => levelConfig(selectedLevel).label,
    [selectedLevel],
  );

  const arrondissementCount = useMemo(
    () => getArrondissementCityCount(arrondissementCity),
    [arrondissementCity],
  );

  const isLight = appearance === "light";
  const controlClassName = isLight
    ? "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
    : "w-full rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 cmm-text-small text-white outline-none focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30";

  return (
    <div className={cn(
      compact
        ? "relative"
        : cn(
            "space-y-3 rounded-xl border p-3",
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-white/10 bg-white/[0.05] shadow-[0_18px_50px_-38px_rgba(15,23,42,0.62)] backdrop-blur-xl",
          ),
    )}>
      {!compact ? <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("cmm-text-caption font-bold uppercase tracking-[0.14em]", isLight ? "text-emerald-700" : "text-emerald-200/90")}>
            Territoire
          </p>
          <p className={cn("mt-1 text-sm leading-6", isLight ? "text-slate-600" : "text-violet-100/78")}>
            Choisis le niveau de territoire à enregistrer, puis sélectionne le lieu voulu.
          </p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", isLight ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-white/10 bg-white/[0.08] text-white")}>
          <Globe className="h-5 w-5" />
        </span>
      </div> : null}

      {!compact ? <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <label className="block space-y-2">
            <span className={cn("cmm-text-small font-medium", isLight ? "text-slate-800" : "text-white")}>Pays</span>
            <select
            value="France"
            onChange={() => {
              /* France only for now */
            }}
              className={controlClassName}
          >
            <option value="France">France</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className={cn("cmm-text-small font-medium", isLight ? "text-slate-800" : "text-white")}>
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
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? isLight
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-emerald-300/40 bg-emerald-300/15 shadow-[0_16px_30px_-22px_rgba(16,185,129,0.8)]"
                      : isLight
                        ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                        : "border-white/10 bg-white/[0.06] hover:border-white/20 hover:bg-white/[0.1]",
                  )}
                >
                  <span className={cn("block text-sm font-semibold", isLight ? "text-slate-800" : "text-white")}>{option.label}</span>
                  <span className={cn("mt-1 block text-[11px] leading-4", isLight ? "text-slate-500" : "text-violet-100/68")}>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div> : null}

      {!compact && selectedLevel === "country" ? (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", isLight ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-50")}>
          La couverture nationale est active. Tu peux enregistrer la France entière ou
          changer de niveau à tout moment.
        </div>
      ) : !compact && selectedLevel === "arrondissement" ? (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <label className="block space-y-2">
              <span className={cn("cmm-text-small font-medium", isLight ? "text-slate-800" : "text-white")}>
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
                className={controlClassName}
              >
                {getArrondissementCityOptions().map((city) => (
                  <option key={city.value} value={city.value} className="text-slate-900">
                    {city.label} - {city.description}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className={cn("cmm-text-small font-medium", isLight ? "text-slate-800" : "text-white")}>
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
                className={controlClassName}
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
              <p className={cn("cmm-text-caption", isLight ? "text-slate-500" : "text-violet-100/64")}>
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
            <div className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2", isLight ? "text-slate-400" : "text-violet-100/55")}>
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
              className={cn("absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors", isLight ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "text-violet-100/60 hover:bg-white/[0.06] hover:text-white")}
              title="Afficher les suggestions"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {isSearchOpen ? (
            <div className={cn("overflow-hidden rounded-xl border", isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_55%,rgba(88,28,135,0.84)_100%)] shadow-[0_20px_50px_-34px_rgba(15,23,42,0.6)]")}>
              <div className={cn("flex items-center justify-between border-b px-4 py-2", isLight ? "border-slate-200" : "border-white/10")}>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.22em]", isLight ? "text-slate-500" : "text-violet-100/64")}>
                  Suggestions
                </p>
                {isLoading ? (
                    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", isLight ? "text-emerald-700" : "text-emerald-200/80")}>
                    Recherche...
                  </p>
                ) : null}
              </div>

              {errorMessage ? (
                <p className="px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
              ) : suggestions.length === 0 ? (
                <p className={cn("px-4 py-4 text-sm", isLight ? "text-slate-500" : "text-violet-100/64")}>
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
                      onPick={() => handlePickSuggestion(suggestion)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!compact ? <div className={cn("rounded-xl border px-4 py-3", isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.06]")}>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.22em]", isLight ? "text-slate-500" : "text-violet-100/64")}>
          Lieu retenu
        </p>
        {hasSelection ? (
          <div className="mt-2 space-y-1">
            <p className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>{value?.label}</p>
            <p className={cn("text-xs", isLight ? "text-slate-500" : "text-violet-100/68")}>
              {value?.subtitle || selectedLevelLabel}
              {value?.arrondissement ? ` · ${value.arrondissement}e arrondissement` : ""}
            </p>
          </div>
        ) : (
            <p className={cn("mt-2 text-sm", isLight ? "text-slate-500" : "text-violet-100/62")}>
            Sélectionne un lieu dans les suggestions pour l’enregistrer.
          </p>
        )}
      </div> : null}
    </div>
  );
}

export function GreaterParisLocationSelector(props: {
  value: TerritoryLocationSelection | null;
  onChange: (value: TerritoryLocationSelection | null) => void;
  placeholder?: string;
  appearance?: "dark" | "light";
  compact?: boolean;
}) {
  return <TerritoryLocationSelector {...props} />;
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
