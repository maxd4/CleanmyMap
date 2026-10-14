import {
  getSwitchableProfiles,
  normalizeDisplayNameMode,
  type AppProfile,
  type DisplayNameMode,
} from "@/lib/profiles";
import type { DisplayMode } from "@/lib/ui/preferences";
import type { Role } from "@/lib/domain-language";
import type { TerritoryLocationSelection } from "@/lib/user-location-preference";

export type AccountSetupStep = "identity" | "usage" | "location";

export function isAccountSetupStepValid(
  step: AccountSetupStep,
  errors: { firstName: string | null; lastName: string | null; profile: string | null; location: string | null },
): boolean {
  if (step === "identity") {
    return !errors.firstName && !errors.lastName;
  }
  if (step === "usage") {
    return !errors.profile;
  }
  return !errors.location;
}

function isValidSelection(selection: TerritoryLocationSelection | null): boolean {
  return Boolean(
    selection?.label.trim() &&
      (selection.level !== "arrondissement" || selection.arrondissement != null),
  );
}

export function resolveAccountSetupValidation({
  firstName,
  lastName,
  selectedProfile,
  profileOptions,
  noneSelected,
  residence,
  work,
  residenceEnabled,
  workEnabled,
}: {
  firstName: string;
  lastName: string;
  selectedProfile: AppProfile;
  profileOptions: readonly AppProfile[];
  noneSelected: boolean;
  residence: TerritoryLocationSelection | null;
  work: TerritoryLocationSelection | null;
  residenceEnabled: boolean;
  workEnabled: boolean;
}) {
  const firstNameError = !firstName.trim() ? "Renseignez votre prénom." : null;
  const lastNameError = !lastName.trim() ? "Renseignez votre nom." : null;
  const profileError = !profileOptions.includes(selectedProfile)
    ? "Sélectionnez un profil valide."
    : null;
  const activeResidence = !noneSelected && residenceEnabled;
  const activeWork = !noneSelected && workEnabled;
  const locationError =
    (activeResidence && !isValidSelection(residence)) ||
    (activeWork && !isValidSelection(work))
      ? "Sélectionnez une ville ou un arrondissement pour chaque lieu activé."
      : null;

  return {
    firstNameError,
    lastNameError,
    profileError,
    activeResidence,
    activeWork,
    locationError,
    formIsValid: !firstNameError && !lastNameError && !profileError && !locationError,
  };
}

export function getAccountSetupProfileOptions(initialRole: Role): AppProfile[] {
  return getSwitchableProfiles(initialRole);
}

export function resolveAccountSetupProfileSelection(
  initialProfile: AppProfile,
  profileOptions: readonly AppProfile[],
): AppProfile {
  const selectedProfile = profileOptions.includes(initialProfile)
    ? initialProfile
    : profileOptions[0];

  if (!selectedProfile) {
    throw new Error("Account setup requires at least one switchable profile.");
  }

  return selectedProfile;
}

export function resolveAccountSetupDisplayNameMode(
  initialDisplayNameMode: string | null | undefined,
): DisplayNameMode {
  return normalizeDisplayNameMode(initialDisplayNameMode);
}

export function shouldHydrateAccountSetupDisplayNameMode(
  initialDisplayNameMode: DisplayNameMode | null | undefined,
  hasHydratedDisplayNameMode: boolean,
): boolean {
  return initialDisplayNameMode == null && !hasHydratedDisplayNameMode;
}

export function shouldHydrateAccountSetupLocations(
  hasInitialResidence: boolean,
  hasInitialWork: boolean,
  hasHydratedLocations: boolean,
): boolean {
  return !hasHydratedLocations && !hasInitialResidence && !hasInitialWork;
}

export function resolveAccountSetupDisplayMode(
  providerDisplayMode: DisplayMode,
  manualSelection: DisplayMode | null,
): DisplayMode {
  return manualSelection ?? providerDisplayMode;
}

export function getAccountSetupDeferralLabel(
  isDirty: boolean,
  completedPersistenceStepCount = 0,
): string {
  if (completedPersistenceStepCount > 0) {
    return "Quitter, modifications conservées";
  }
  return isDirty ? "Plus tard, sans enregistrer" : "Configurer plus tard";
}

export function shouldConfirmAccountSetupDeferral(
  isDirty: boolean,
  completedPersistenceStepCount = 0,
): boolean {
  return isDirty || completedPersistenceStepCount > 0;
}

export function getAccountSetupDeferralConfirmationMessage(
  completedPersistenceStepCount = 0,
): string {
  return completedPersistenceStepCount > 0
    ? "Certaines modifications ont déjà été enregistrées. Quitter ne les annulera pas."
    : "Des modifications ne sont pas enregistrées. Continuer sans les enregistrer ?";
}

export function shouldShowAccountSetupFieldError(
  submitAttempted: boolean,
  touched: boolean,
): boolean {
  return submitAttempted || touched;
}
