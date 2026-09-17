"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type SetStateAction } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { DisplayMode } from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  clearLocationPreferenceMetadata,
  createLocationPreferencesMetadata,
  createTerritoryLocationSelectionFromLegacyArrondissement,
  extractLocationPreferencesFromMetadata,
  type TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import type { AppProfile, DisplayNameMode } from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { defaultMessageForKind, isAppError, toAppError, type AppError } from "@/lib/errors/app-errors";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { ACCOUNT_SETUP_SCHEMA_VERSION } from "@/lib/auth/account-setup-config";
import { logFailure } from "@/lib/logging/failure-log";
import {
  clearAccountSetupDeferralMetadata,
  createAccountSetupDeferralMetadata,
  persistAccountSetupChanges,
  type AccountSetupPersistenceStep,
} from "@/components/account/account-setup-save";
import {
  getAccountSetupProfileOptions,
  getAccountSetupDeferralConfirmationMessage,
  getAccountSetupDeferralLabel,
  resolveAccountSetupDisplayMode,
  resolveAccountSetupDisplayNameMode,
  resolveAccountSetupProfileSelection,
  shouldHydrateAccountSetupDisplayNameMode,
  shouldHydrateAccountSetupLocations,
  shouldConfirmAccountSetupDeferral,
  shouldShowAccountSetupFieldError,
} from "@/components/account/account-setup-state";
import {
  resolveAccountSetupIdentityNames,
  resolveAccountSetupNameField,
} from "@/components/account/account-setup-identity";

export type AccountSetupFormProps = {
  nextPath?: string;
  initialRole?: Role;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  initialDisplayNameMode?: DisplayNameMode | null;
  initialResidence?: TerritoryLocationSelection | null;
  initialWork?: TerritoryLocationSelection | null;
  /** Legacy props remain accepted while older server callers converge. */
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
  submitMode?: "navigate" | "refresh";
};

type AccountSetupField = "firstName" | "lastName" | "profile" | "location";

async function updateActiveProfile(activeProfile: AppProfile) {
  const response = await fetch("/api/account/active-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeProfile }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Mutation de profil refusée.");
  }
}

function isValidSelection(selection: TerritoryLocationSelection | null): boolean {
  return Boolean(
    selection?.label.trim() &&
      (selection.level !== "arrondissement" || selection.arrondissement != null),
  );
}

function readDisplayNameMode(metadata: Record<string, unknown> | null | undefined): DisplayNameMode {
  const value = metadata?.["display_name_mode"] ?? metadata?.["displayNameMode"];
  return resolveAccountSetupDisplayNameMode(typeof value === "string" ? value : undefined);
}

export function useAccountSetupController({
  nextPath,
  initialProfile,
  initialRole = initialProfile,
  clerkReachable,
  initialResidence,
  initialWork,
  initialDisplayNameMode,
  initialArrondissement = null,
  initialLocationType = null,
  submitMode = "navigate",
}: AccountSetupFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { locale, displayMode, setDisplayMode } = useSitePreferences();
  const legacySelection = useMemo(
    () => createTerritoryLocationSelectionFromLegacyArrondissement(initialArrondissement),
    [initialArrondissement],
  );
  const resolvedInitialResidence = initialResidence ??
    (initialLocationType !== "work" ? legacySelection : null);
  const resolvedInitialWork = initialWork ??
    (initialLocationType === "work" ? legacySelection : null);

  const profileOptions = useMemo(
    () => getAccountSetupProfileOptions(initialRole),
    [initialRole],
  );
  const [selectedProfileCandidate, setSelectedProfileCandidate] = useState<AppProfile>(() =>
    resolveAccountSetupProfileSelection(initialProfile, profileOptions),
  );
  const [firstNameOverride, setFirstNameOverride] = useState<string | null>(null);
  const [lastNameOverride, setLastNameOverride] = useState<string | null>(null);
  const [displayNameMode, setDisplayNameMode] = useState<DisplayNameMode>(() =>
    resolveAccountSetupDisplayNameMode(initialDisplayNameMode),
  );
  const [manualDisplayMode, setManualDisplayMode] = useState<DisplayMode | null>(null);
  const [residence, setResidence] = useState<TerritoryLocationSelection | null>(resolvedInitialResidence);
  const [work, setWork] = useState<TerritoryLocationSelection | null>(resolvedInitialWork);
  const [residenceEnabled, setResidenceEnabled] = useState(Boolean(resolvedInitialResidence));
  const [workEnabled, setWorkEnabled] = useState(Boolean(resolvedInitialWork));
  const [noneSelected, setNoneSelected] = useState(!resolvedInitialResidence && !resolvedInitialWork);
  const hasHydratedLocations = useRef(Boolean(resolvedInitialResidence || resolvedInitialWork));
  const hasHydratedDisplayNameMode = useRef(initialDisplayNameMode != null);
  const completedPersistenceSteps = useRef<Set<AccountSetupPersistenceStep>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<AccountSetupField>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const providerIdentityNames = resolveAccountSetupIdentityNames({
    firstName: user?.firstName,
    lastName: user?.lastName,
    externalAccounts: user?.externalAccounts,
  });
  const firstName = resolveAccountSetupNameField(firstNameOverride, providerIdentityNames.firstName);
  const lastName = resolveAccountSetupNameField(lastNameOverride, providerIdentityNames.lastName);
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const selectedProfile = profileOptions.includes(selectedProfileCandidate)
    ? selectedProfileCandidate
    : resolveAccountSetupProfileSelection(selectedProfileCandidate, profileOptions);
  const selectedDisplayMode = resolveAccountSetupDisplayMode(displayMode, manualDisplayMode);

  function markFormDirty() {
    completedPersistenceSteps.current.clear();
    setIsDirty(true);
  }

  function touchField(field: AccountSetupField) {
    setTouchedFields((current) => {
      if (current.has(field)) {
        return current;
      }
      return new Set(current).add(field);
    });
  }

  function shouldShowFieldError(field: AccountSetupField) {
    return shouldShowAccountSetupFieldError(submitAttempted, touchedFields.has(field));
  }

  function handleProfileChange(profile: AppProfile) {
    markFormDirty();
    touchField("profile");
    setSelectedProfileCandidate(profile);
  }

  function handleFirstNameChange(value: string) {
    markFormDirty();
    setFirstNameOverride(value);
  }

  function handleLastNameChange(value: string) {
    markFormDirty();
    setLastNameOverride(value);
  }

  function handleDisplayModeChange(mode: DisplayMode) {
    markFormDirty();
    setManualDisplayMode(mode);
  }

  function updateResidence(value: SetStateAction<TerritoryLocationSelection | null>) {
    markFormDirty();
    touchField("location");
    setResidence(value);
  }

  function updateWork(value: SetStateAction<TerritoryLocationSelection | null>) {
    markFormDirty();
    touchField("location");
    setWork(value);
  }

  function updateResidenceEnabled(value: SetStateAction<boolean>) {
    markFormDirty();
    touchField("location");
    setResidenceEnabled(value);
  }

  function updateWorkEnabled(value: SetStateAction<boolean>) {
    markFormDirty();
    touchField("location");
    setWorkEnabled(value);
  }

  function updateNoneSelected(value: SetStateAction<boolean>) {
    markFormDirty();
    touchField("location");
    setNoneSelected(value);
  }

  function navigateAfterSetup() {
    if (submitMode === "refresh") {
      router.refresh();
      return;
    }

    router.replace(nextPath ?? PROFIL_ROUTE);
    router.refresh();
  }

  useEffect(() => {
    if (
      !isLoaded ||
      !user ||
      !shouldHydrateAccountSetupLocations(
        Boolean(resolvedInitialResidence),
        Boolean(resolvedInitialWork),
        hasHydratedLocations.current,
      )
    ) {
      return;
    }
    const metadata = user.unsafeMetadata as Record<string, unknown> | undefined;
    const preferences = extractLocationPreferencesFromMetadata(metadata);
    setResidence(preferences.residence);
    setWork(preferences.work);
    setResidenceEnabled(Boolean(preferences.residence));
    setWorkEnabled(Boolean(preferences.work));
    setNoneSelected(!preferences.residence && !preferences.work);
    hasHydratedLocations.current = true;
  }, [isLoaded, resolvedInitialResidence, resolvedInitialWork, user]);

  useEffect(() => {
    if (
      !isLoaded ||
      !user ||
      !shouldHydrateAccountSetupDisplayNameMode(
        initialDisplayNameMode,
        hasHydratedDisplayNameMode.current,
      )
    ) {
      return;
    }
    const metadata = user.unsafeMetadata as Record<string, unknown> | undefined;
    setDisplayNameMode(readDisplayNameMode(metadata));
    hasHydratedDisplayNameMode.current = true;
  }, [initialDisplayNameMode, isLoaded, user]);

  const profileIsValid = profileOptions.includes(selectedProfile);
  const firstNameError = !trimmedFirstName ? "Renseignez votre prénom." : null;
  const lastNameError = !trimmedLastName ? "Renseignez votre nom." : null;
  const profileError = !profileIsValid ? "Sélectionnez un profil valide." : null;
  const activeResidence = !noneSelected && residenceEnabled;
  const activeWork = !noneSelected && workEnabled;
  const locationError =
    (activeResidence && !isValidSelection(residence)) ||
    (activeWork && !isValidSelection(work))
      ? "Sélectionnez une ville ou un arrondissement pour chaque lieu activé."
      : null;
  const formIsValid = !firstNameError && !lastNameError && !profileError && !locationError;

  async function handleDefer() {
    setError(null);
    if (!user) {
      setError(toAppError("Compte introuvable, reconnectez-vous.", { kind: "permission", message: "Compte introuvable, reconnectez-vous." }));
      return;
    }
    if (
      shouldConfirmAccountSetupDeferral(isDirty, completedPersistenceSteps.current.size) &&
      typeof window !== "undefined" &&
      !window.confirm(getAccountSetupDeferralConfirmationMessage(completedPersistenceSteps.current.size))
    ) {
      return;
    }

    try {
      setIsSaving(true);
      const metadata = createAccountSetupDeferralMetadata(
        { ...(user.unsafeMetadata ?? {}) },
        ACCOUNT_SETUP_SCHEMA_VERSION,
        new Date().toISOString(),
      );
      await user.updateMetadata({
        unsafeMetadata: {
          profileSetupDeferred: metadata.profileSetupDeferred,
          profileSetupDeferredVersion: metadata.profileSetupDeferredVersion,
          profileSetupDeferredAt: metadata.profileSetupDeferredAt,
        },
      });
      navigateAfterSetup();
    } catch (caughtError) {
      logFailure("AccountSetup", "Deferral failed", caughtError);
      const appError = isAppError(caughtError)
        ? caughtError
        : toAppError(caughtError, { kind: "server", message: "Impossible de différer la configuration. Réessayez." });
      setError(appError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSubmitAttempted(true);
    setError(null);
    if (!user) {
      setError(toAppError("Compte introuvable, reconnectez-vous.", { kind: "permission", message: "Compte introuvable, reconnectez-vous." }));
      return;
    }
    if (!formIsValid) {
      setError(toAppError("Vérifiez les informations obligatoires.", { kind: "validation", message: "Vérifiez les informations obligatoires." }));
      return;
    }

    try {
      setIsSaving(true);
      const metadata = clearLocationPreferenceMetadata({ ...(user.unsafeMetadata ?? {}) });
      const completedMetadata = clearAccountSetupDeferralMetadata(metadata);
      Object.assign(completedMetadata, {
        profileSetupCompleted: true,
        profileSetupVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
        profileSetupSchemaVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
        display_name_mode: displayNameMode,
      });
      Object.assign(
        completedMetadata,
        createLocationPreferencesMetadata({
          residence: activeResidence ? residence : null,
          work: activeWork ? work : null,
        }),
      );

      await persistAccountSetupChanges({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        metadata: completedMetadata,
        initialProfile,
        selectedProfile,
        updateUser: (update) => user.update(update),
        updateActiveProfile,
        saveDisplayMode: () => setDisplayMode(selectedDisplayMode),
        completedSteps: completedPersistenceSteps.current,
      });

      completedPersistenceSteps.current.clear();
      setIsDirty(false);
      navigateAfterSetup();
    } catch (caughtError) {
      logFailure("AccountSetup", "Update failed", caughtError, { profile: selectedProfile });
      const appError = isAppError(caughtError)
        ? caughtError
        : toAppError(caughtError, { kind: "server", message: "Impossible d’enregistrer les préférences. Réessayez." });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void handleSubmit(),
          onRefresh: () => router.refresh(),
        });
      }
      setError(appError);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    user,
    isLoaded,
    clerkReachable,
    locale,
    profileOptions,
    selectedProfile,
    firstName,
    lastName,
    selectedDisplayMode,
    residence,
    work,
    residenceEnabled,
    workEnabled,
    noneSelected,
    isSaving,
    isDirty,
    error,
    firstNameError,
    lastNameError,
    profileError,
    locationError,
    shouldShowFieldError,
    markFormDirty,
    touchField,
    handleFirstNameChange,
    handleLastNameChange,
    handleProfileChange,
    handleDisplayModeChange,
    updateResidence,
    updateWork,
    updateResidenceEnabled,
    updateWorkEnabled,
    updateNoneSelected,
    handleDefer,
    handleSubmit,
    getDeferralLabel: () => getAccountSetupDeferralLabel(isDirty, completedPersistenceSteps.current.size),
  };
}
