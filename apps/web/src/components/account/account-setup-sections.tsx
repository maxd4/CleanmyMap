"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Briefcase,
  Building2,
  Check,
  Eye,
  FlaskConical,
  House,
  Landmark,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GreaterParisSelect, type TerritoryLocationSelection } from "@/lib/geo/greater-paris-select";
import { getProfileLabel, getProfileSubtitle, type AppProfile } from "@/lib/profiles";
import { DISPLAY_MODE_DESCRIPTIONS, DISPLAY_MODES, type DisplayMode, type Locale } from "@/lib/ui/preferences";
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

const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  exhaustif: "Exhaustif",
  minimaliste: "Minimaliste",
  sobre: "Sobre",
};

type DisplayModeGridProps = {
  selectedMode: DisplayMode;
  locale: Locale;
  onChange: (mode: DisplayMode) => void;
  ariaLabelledBy: string;
};

export function AccountSetupDisplayModeGrid({
  selectedMode,
  locale,
  onChange,
  ariaLabelledBy,
}: DisplayModeGridProps) {
  return (
    <div role="radiogroup" aria-labelledby={ariaLabelledBy} className="grid gap-3 sm:grid-cols-3">
      {DISPLAY_MODES.map((mode) => {
        const selected = selectedMode === mode;
        return (
          <label
            key={mode}
            htmlFor={`account-setup-display-mode-${mode}`}
            className={`cmm-account-setup-choice relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-300 focus-within:ring-offset-2 ${selected ? "border-violet-300 bg-white text-violet-700 shadow-sm" : "border-slate-300/35 bg-slate-800/75 text-white hover:border-slate-200/70 hover:bg-slate-700/80"}`}
          >
            <input
              id={`account-setup-display-mode-${mode}`}
              type="radio"
              name="account-setup-display-mode"
              value={mode}
              checked={selected}
              onChange={() => onChange(mode)}
              className="sr-only"
            />
            {selected ? (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : null}
            <Eye className="cmm-account-setup-choice-glyph" aria-hidden="true" />
            <span className="text-sm font-bold">{DISPLAY_MODE_LABELS[mode]}</span>
            <span className="text-xs leading-4 opacity-80">{DISPLAY_MODE_DESCRIPTIONS[mode][locale]}</span>
          </label>
        );
      })}
    </div>
  );
}

type ProfileGridProps = {
  options: AppProfile[];
  selectedProfile: AppProfile;
  locale: Locale;
  onChange: (profile: AppProfile) => void;
  onBlur?: () => void;
  error?: string | null;
};

export function AccountSetupProfileGrid({
  options,
  selectedProfile,
  locale,
  onChange,
  onBlur,
  error,
}: ProfileGridProps) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Profil CleanMyMap"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {options.map((profile) => {
          const isSelected = selectedProfile === profile;
          const Icon = PROFILE_ICONS[profile];
          return (
            <label
              key={profile}
              className={cn(
                "cmm-account-setup-choice group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-300 focus-within:ring-offset-2",
                isSelected
                  ? "border-violet-300 bg-white text-violet-700 shadow-sm"
                  : "border-slate-300/35 bg-slate-800/75 text-white hover:border-slate-200/70 hover:bg-slate-700/80",
              )}
            >
              <input
                type="radio"
                name="account-setup-profile"
                value={profile}
                checked={isSelected}
                onChange={() => onChange(profile)}
                onBlur={onBlur}
                className="sr-only"
              />
              {isSelected ? (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <span
                className={cn(
                  "cmm-account-setup-choice-icon flex items-center justify-center rounded-2xl border",
                  isSelected
                    ? "border-violet-200 bg-violet-50 text-violet-600"
                    : "border-slate-300/30 bg-slate-700/40 text-slate-100",
                )}
              >
                <Icon className="cmm-account-setup-choice-glyph" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-tight sm:text-base">
                {getProfileLabel(profile, locale)}
              </span>
              <span className="text-xs leading-4 opacity-80">
                {getProfileSubtitle(profile, locale)}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-rose-100">{error}</p> : null}
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
  { value: "residence", label: "Ville de résidence", icon: House },
  { value: "work", label: "Ville de travail", icon: Briefcase },
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
                "cmm-account-setup-choice relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-300 focus-within:ring-offset-2",
                selected
                  ? "border-violet-300 bg-white text-violet-700"
                  : "border-slate-300/35 bg-slate-800/75 text-white hover:border-slate-200/70 hover:bg-slate-700/80",
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
              <Icon className="cmm-account-setup-choice-glyph" aria-hidden="true" />
              <span className="text-sm font-bold leading-5">{label}</span>
            </label>
          );
        })}
        <label
          className={cn(
            "cmm-account-setup-choice relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-300 focus-within:ring-offset-2",
            noneSelected
              ? "border-violet-300 bg-white text-violet-700"
              : "border-slate-300/35 bg-slate-800/75 text-white hover:border-slate-200/70 hover:bg-slate-700/80",
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
            aria-label="Ne pas renseigner de lieu"
          />
          {noneSelected ? (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
          <span className="text-3xl leading-none" aria-hidden="true">∅</span>
          <span className="text-sm font-bold leading-5">Ne pas renseigner de lieu</span>
        </label>
      </div>

      {residenceActive ? (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Ville de résidence</h3>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white">Ville ou arrondissement</span>
            <GreaterParisSelect
              value={residence}
              onChange={setResidence}
              placeholder="Rechercher une ville ou un arrondissement..."
              appearance="dark"
              compact
            />
          </label>
        </div>
      ) : null}
      {workActive ? (
        <div className={cn("space-y-2", residenceActive && "border-t border-white/10 pt-4")}>
          <h3 className="text-lg font-bold text-white">Ville de travail</h3>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white">Ville ou arrondissement</span>
            <GreaterParisSelect
              value={work}
              onChange={setWork}
              placeholder="Rechercher une ville ou un arrondissement..."
              appearance="dark"
              compact
            />
          </label>
        </div>
      ) : null}
      {error ? <p className="text-sm font-medium text-rose-100">{error}</p> : null}
    </div>
  );
}
