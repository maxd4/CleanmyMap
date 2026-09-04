"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Briefcase,
  Building2,
  Check,
  FlaskConical,
  House,
  Landmark,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GreaterParisSelect, type TerritoryLocationSelection } from "@/lib/geo/greater-paris-select";
import { getProfileLabel, type AppProfile } from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

export const PROFILE_ICONS: Record<AppProfile, LucideIcon> = {
  benevole: UserRound,
  coordinateur: UsersRound,
  scientifique: FlaskConical,
  entreprise: Briefcase,
  elu: Landmark,
  admin: ShieldCheck,
  max: Building2,
};

type ProfileGridProps = {
  options: AppProfile[];
  selectedProfile: AppProfile;
  locale: Locale;
  onChange: (profile: AppProfile) => void;
  error?: string | null;
};

export function AccountSetupProfileGrid({
  options,
  selectedProfile,
  locale,
  onChange,
  error,
}: ProfileGridProps) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Profil CleanMyMap"
        className="grid grid-cols-1 gap-3 sm:grid-cols-6"
      >
        {options.map((profile, index) => {
          const isSelected = selectedProfile === profile;
          const Icon = PROFILE_ICONS[profile];
          const isFiveCardSecondRow = options.length === 5 && index === 3;
          return (
            <button
              key={profile}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(profile)}
              className={cn(
                "group relative flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:col-span-2",
                isFiveCardSecondRow && "sm:col-start-2",
                options.length === 6 && index === 3 && "sm:col-start-1",
                isSelected
                  ? "border-violet-300 bg-white text-violet-700 shadow-[0_10px_28px_-18px_rgba(124,58,237,0.9)]"
                  : "border-emerald-100/40 bg-emerald-950/20 text-white hover:border-violet-200/70 hover:bg-emerald-950/35",
              )}
            >
              {isSelected ? (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl border",
                  isSelected
                    ? "border-violet-200 bg-violet-50 text-violet-600"
                    : "border-emerald-100/30 bg-emerald-950/25 text-emerald-50",
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-tight sm:text-base">
                {getProfileLabel(profile, locale)}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-violet-100">{error}</p> : null}
    </div>
  );
}

type LocationChoice = "residence" | "work";

type LocationFieldsProps = {
  residence: TerritoryLocationSelection | null;
  work: TerritoryLocationSelection | null;
  residenceEnabled: boolean;
  workEnabled: boolean;
  noneSelected: boolean;
  setResidence: Dispatch<SetStateAction<TerritoryLocationSelection | null>>;
  setWork: Dispatch<SetStateAction<TerritoryLocationSelection | null>>;
  setResidenceEnabled: Dispatch<SetStateAction<boolean>>;
  setWorkEnabled: Dispatch<SetStateAction<boolean>>;
  setNoneSelected: Dispatch<SetStateAction<boolean>>;
  error?: string | null;
};

const LOCATION_CHOICES: Array<{
  value: LocationChoice;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "residence", label: "Renseigner mon domicile", icon: House },
  { value: "work", label: "Renseigner mon lieu de travail", icon: Briefcase },
];

export function AccountSetupLocationFields({
  residence,
  work,
  residenceEnabled,
  workEnabled,
  noneSelected,
  setResidence,
  setWork,
  setResidenceEnabled,
  setWorkEnabled,
  setNoneSelected,
  error,
}: LocationFieldsProps) {
  const toggleLocation = (choice: LocationChoice) => {
    setNoneSelected(false);
    if (choice === "residence") {
      setResidenceEnabled((current) => !current);
      return;
    }
    setWorkEnabled((current) => !current);
  };

  const residenceActive = !noneSelected && residenceEnabled;
  const workActive = !noneSelected && workEnabled;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {LOCATION_CHOICES.map(({ value, label, icon: Icon }) => {
          const selected = value === "residence" ? residenceActive : workActive;
          return (
            <label
              key={value}
              className={cn(
                "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-colors focus-within:ring-2 focus-within:ring-violet-300",
                selected
                  ? "border-violet-300 bg-white text-violet-700"
                  : "border-emerald-100/40 bg-emerald-950/20 text-white hover:border-violet-200/70",
              )}
            >
              <input
                type="checkbox"
              checked={selected}
                onChange={() => toggleLocation(value)}
                className="sr-only"
                aria-label={label}
              />
              {selected ? (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <Icon className="h-8 w-8" aria-hidden="true" />
              <span className="text-sm font-bold leading-5">{label}</span>
            </label>
          );
        })}
        <label
          className={cn(
            "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-colors focus-within:ring-2 focus-within:ring-violet-300",
            noneSelected
              ? "border-violet-300 bg-white text-violet-700"
              : "border-emerald-100/40 bg-emerald-950/20 text-white hover:border-violet-200/70",
          )}
        >
          <input
            type="checkbox"
            checked={noneSelected}
            onChange={() => {
              setNoneSelected(true);
              setResidenceEnabled(false);
              setWorkEnabled(false);
              setResidence(null);
              setWork(null);
            }}
            className="sr-only"
            aria-label="Aucune de ces informations"
          />
          {noneSelected ? (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
          <span className="text-3xl leading-none" aria-hidden="true">∅</span>
          <span className="text-sm font-bold leading-5">Aucune de ces informations</span>
        </label>
      </div>

      {residenceActive ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-white">Domicile — Ville / arrondissement</span>
          <GreaterParisSelect
            value={residence}
            onChange={setResidence}
            placeholder="Rechercher une ville ou un arrondissement..."
            appearance="dark"
          />
        </label>
      ) : null}
      {workActive ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-white">Travail — Ville / arrondissement</span>
          <GreaterParisSelect
            value={work}
            onChange={setWork}
            placeholder="Rechercher une ville ou un arrondissement..."
            appearance="dark"
          />
        </label>
      ) : null}
      {error ? <p className="text-sm font-medium text-violet-100">{error}</p> : null}
    </div>
  );
}
