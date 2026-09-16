import {
  getSwitchableProfiles,
  normalizeDisplayNameMode,
  type AppProfile,
  type DisplayNameMode,
} from "@/lib/profiles";
import type { DisplayMode } from "@/lib/ui/preferences";
import type { Role } from "@/lib/domain-language";

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

export function getAccountSetupDeferralLabel(isDirty: boolean): string {
  return isDirty ? "Plus tard, sans enregistrer" : "Configurer plus tard";
}

export function shouldConfirmAccountSetupDeferral(isDirty: boolean): boolean {
  return isDirty;
}

export function shouldShowAccountSetupFieldError(
  submitAttempted: boolean,
  touched: boolean,
): boolean {
  return submitAttempted || touched;
}
