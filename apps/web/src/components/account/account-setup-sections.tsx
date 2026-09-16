"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Briefcase,
  Building2,
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
import { AccountSetupChoiceCard } from "@/components/account/account-setup-primitives";
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
          <AccountSetupChoiceCard
            key={mode}
            selected={selected}
            icon={Eye}
            label={DISPLAY_MODE_LABELS[mode]}
            description={DISPLAY_MODE_DESCRIPTIONS[mode][locale]}
            input={{
              id: `account-setup-display-mode-${mode}`,
              type: "radio",
              name: "account-setup-display-mode",
              value: mode,
              checked: selected,
              onChange: () => onChange(mode),
            }}
          />
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
            <AccountSetupChoiceCard
              key={profile}
              selected={isSelected}
              icon={Icon}
              iconContainer
              label={getProfileLabel(profile, locale)}
              description={getProfileSubtitle(profile, locale)}
              input={{
                type: "radio",
                name: "account-setup-profile",
                value: profile,
                checked: isSelected,
                onChange: () => onChange(profile),
                onBlur,
              }}
              className="group"
            />
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
            <AccountSetupChoiceCard
              key={value}
              selected={selected}
              icon={Icon}
              label={label}
              input={{
                type: "checkbox",
                checked: selected,
                onChange: () => toggleLocation(value),
                "aria-label": label,
              }}
            />
          );
        })}
        <AccountSetupChoiceCard
          selected={noneSelected}
          icon={<span className="text-3xl leading-none" aria-hidden="true">∅</span>}
          label="Ne pas renseigner de lieu"
          input={{
            type: "checkbox",
            checked: noneSelected,
            onChange: () => {
              setNoneSelected(true);
              setResidenceEnabled(false);
              setWorkEnabled(false);
              setResidence(null);
              setWork(null);
            },
            "aria-label": "Ne pas renseigner de lieu",
          }}
        />
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
