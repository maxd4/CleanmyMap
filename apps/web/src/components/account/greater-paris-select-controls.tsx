"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  getArrondissementCityCount,
  getArrondissementCityOptions,
  getArrondissementHelpLabel,
  getArrondissementMunicipalLabel,
  parseTerritoryArrondissement,
  type ArrondissementCity,
} from "@/lib/geo/paris-arrondissements";
import { parseSelectedArrondissementCity } from "@/lib/geo/greater-paris-location";
import type {
  TerritoryLocationLevel,
  TerritoryLocationSelection,
} from "@/lib/user-location-preference";

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
  {
    value: "locality",
    label: "Localité",
    description: "Pour une ville, municipalité ou localité.",
    placeholder: "Ex. Montréal, Dakar, Bruxelles",
  },
  {
    value: "administrative_area",
    label: "Autre niveau",
    description: "Pour un niveau administratif propre au pays.",
    placeholder: "Ex. canton, province, district",
  },
];

export function getTerritoryLevelConfig(level: TerritoryLocationLevel) {
  return LEVEL_OPTIONS.find((option) => option.value === level) ?? {
    value: level,
    label: level.replace(/_/g, " "),
    description: "Pour cibler un niveau administratif propre au pays.",
    placeholder: "Rechercher un territoire",
  };
}

export function TerritoryLevelControl({
  selectedLevel,
  onLevelChange,
  countryCode,
  onCountryCodeChange,
  isLight,
  controlClassName,
}: {
  selectedLevel: TerritoryLocationLevel;
  onLevelChange: (level: TerritoryLocationLevel) => void;
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  isLight: boolean;
  controlClassName: string;
}) {
  const countryCodeListId = useId();
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(12rem,0.7fr)_1.4fr]">
      <label className="block space-y-2">
        <span
          className={cn(
            "cmm-text-small font-medium",
            isLight ? "text-slate-800" : "text-white",
          )}
        >
          Code pays ISO 3166-1
        </span>
        <input
          list={countryCodeListId}
          inputMode="text"
          autoCapitalize="characters"
          maxLength={2}
          value={countryCode}
          onChange={(event) => onCountryCodeChange(event.target.value.toUpperCase())}
          className={controlClassName}
          aria-label="Code pays ISO 3166-1 alpha-2"
        />
        <datalist id={countryCodeListId}>
          <option value="FR">France</option>
          <option value="BE">Belgique</option>
          <option value="CA">Canada</option>
          <option value="CH">Suisse</option>
          <option value="LU">Luxembourg</option>
          <option value="SN">Sénégal</option>
        </datalist>
      </label>

      <fieldset className="space-y-2">
        <legend
          className={cn(
            "cmm-text-small font-medium",
            isLight ? "text-slate-800" : "text-white",
          )}
        >
          Niveau de territoire
        </legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {LEVEL_OPTIONS.map((option) => {
            const isSelected = option.value === selectedLevel;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onLevelChange(option.value)}
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
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    isLight ? "text-slate-800" : "text-white",
                  )}
                >
                  {option.label}
                </span>
                <span
                  className={cn(
                    "cmm-text-caption mt-1 block leading-4",
                    isLight ? "text-slate-500" : "text-violet-100/68",
                  )}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function TerritoryLevelDetails({
  mode,
  isLight,
  controlClassName,
  arrondissementCity,
  arrondissementValue,
  value,
  setArrondissementCity,
  setArrondissementValue,
  commitSelection,
  onChange,
}: {
  mode: "country" | "arrondissement";
  isLight: boolean;
  controlClassName: string;
  arrondissementCity: ArrondissementCity;
  arrondissementValue: string;
  value: TerritoryLocationSelection | null;
  setArrondissementCity: (city: ArrondissementCity) => void;
  setArrondissementValue: (value: string) => void;
  commitSelection: (selection: TerritoryLocationSelection | null) => void;
  onChange: (value: TerritoryLocationSelection | null) => void;
}) {
  if (mode === "country") {
    return (
      <div
        className={cn(
          "rounded-xl border px-4 py-3 text-sm",
          isLight
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",
        )}
      >
        La couverture nationale est active. Tu peux enregistrer la France entière ou
        changer de niveau à tout moment.
      </div>
    );
  }

  const arrondissementCount = getArrondissementCityCount(arrondissementCity);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <label className="block space-y-2">
          <span
            className={cn(
              "cmm-text-small font-medium",
              isLight ? "text-slate-800" : "text-white",
            )}
          >
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
                    country: "FR",
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
          <span
            className={cn(
              "cmm-text-small font-medium",
              isLight ? "text-slate-800" : "text-white",
            )}
          >
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
                  country: "FR",
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
            <p
              className={cn(
                "cmm-text-caption",
                isLight ? "text-slate-500" : "text-violet-100/64",
              )}
            >
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
  );
}
