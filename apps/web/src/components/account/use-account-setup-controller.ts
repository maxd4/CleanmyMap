"use client";

import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { DisplayMode } from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  createTerritoryLocationSelectionFromLegacyArrondissement,
  extractLocationPreferencesFromMetadata,
  type TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import { resolveAccountDisplayName, type AppProfile, type DisplayNameMode } from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";
import type { AppError } from "@/lib/errors/app-errors";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import {
  type AccountSetupPersistenceStep,
} from "@/components/account/account-setup-save";
import {
  getAccountSetupProfileOptions,
  getAccountSetupDeferralLabel,
  isAccountSetupStepValid,
  resolveAccountSetupValidation,
  resolveAccountSetupDisplayMode,
  resolveAccountSetupDisplayNameMode,
  resolveAccountSetupProfileSelection,
  shouldHydrateAccountSetupDisplayNameMode,
  shouldHydrateAccountSetupLocations,
  shouldShowAccountSetupFieldError,
  type AccountSetupStep,
} from "@/components/account/account-setup-state";
import {
  resolveAccountSetupIdentityNames,
  resolveAccountSetupNameField,
} from "@/components/account/account-setup-identity";
export type { AccountSetupStep } from "@/components/account/account-setup-state";
import {
  deferAccountSetup,
  submitAccountSetup,
} from "@/components/account/account-setup-controller-actions";

export type AccountSetupFormProps = {
  nextPath?: string;
  initialRole?: Role;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  initialHandle?: string | null;
  initialDisplayNameMode?: DisplayNameMode | null;
  initialResidence?: TerritoryLocationSelection | null;
  initialWork?: TerritoryLocationSelection | null;
  /** Legacy props remain accepted while older server callers converge. */
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
  submitMode?: "navigate" | "refresh";
};

type AccountSetupField = "firstName" | "lastName" | "profile" | "location";

const ACCOUNT_SETUP_STEPS: readonly AccountSetupStep[] = [
  "identity",
  "usage",
  "location",
];

async function updateActiveProfile(activeProfile: AppProfile) {
  const response = await fetch("/api/account/active-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeRole: activeProfile }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Mutation de profil refusée.");
  }
}

function readDisplayNameMode(metadata: Record<string, unknown> | null | undefined): DisplayNameMode {
  const value = metadata?.["display_name_mode"] ?? metadata?.["displayNameMode"];
  return resolveAccountSetupDisplayNameMode(typeof value === "string" ? value : undefined);
}

export function useAccountSetupController({
  nextPath,
  initialProfile,
  initialHandle,
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
  const [currentStep, setCurrentStep] = useState<AccountSetupStep>("identity");
  const hasHydratedLocations = useRef(Boolean(resolvedInitialResidence || resolvedInitialWork));
  const hasHydratedDisplayNameMode = useRef(initialDisplayNameMode != null);
  const completedPersistenceSteps = useRef<Set<AccountSetupPersistenceStep>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<AccountSetupField>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const saveInFlight = useRef(false);

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
  const publicDisplayName = resolveAccountDisplayName({
    firstName: trimmedFirstName,
    lastName: trimmedLastName,
    username: initialHandle,
    userId: user?.id ?? "compte",
    mode: displayNameMode,
  });

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

  function handleDisplayNameModeChange(mode: DisplayNameMode) {
    markFormDirty();
    setDisplayNameMode(mode);
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

  function handleNext() {
    if (isSaving) return;
    setSubmitAttempted(true);
    if (!isAccountSetupStepValid(currentStep, {
      firstName: firstNameError,
      lastName: lastNameError,
      profile: profileError,
      location: locationError,
    })) return;
    const stepIndex = ACCOUNT_SETUP_STEPS.indexOf(currentStep);
    const nextStep = ACCOUNT_SETUP_STEPS[stepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep);
      setSubmitAttempted(false);
      setError(null);
    }
  }

  function handlePrevious() {
    if (isSaving) return;
    const stepIndex = ACCOUNT_SETUP_STEPS.indexOf(currentStep);
    const previousStep = ACCOUNT_SETUP_STEPS[stepIndex - 1];
    if (previousStep) {
      setCurrentStep(previousStep);
      setSubmitAttempted(false);
      setError(null);
    }
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

  const {
    firstNameError,
    lastNameError,
    profileError,
    activeResidence,
    activeWork,
    locationError,
    formIsValid,
  } = resolveAccountSetupValidation({
    firstName,
    lastName,
    selectedProfile,
    profileOptions,
    noneSelected,
    residence,
    work,
    residenceEnabled,
    workEnabled,
  });

  const handleDefer = () => deferAccountSetup({
    user,
    saveInFlight,
    setError,
    setIsSaving,
    isDirty,
    completedPersistenceSteps: completedPersistenceSteps.current,
    confirmDeferral: (message) => typeof window === "undefined" || window.confirm(message),
    navigateAfterSetup,
  });

  const handleSubmit = (event?: Parameters<typeof submitAccountSetup>[0]["event"]) => submitAccountSetup({
    event,
    isSaving,
    saveInFlight,
    setError,
    setIsSaving,
    user,
    currentStep,
    onAdvance: handleNext,
    setSubmitAttempted,
    formIsValid,
    selectedProfile,
    displayNameMode,
    activeResidence,
    activeWork,
    residence,
    work,
    trimmedFirstName,
    trimmedLastName,
    completedPersistenceSteps: completedPersistenceSteps.current,
    setIsDirty,
    updateActiveProfile,
    saveDisplayMode: () => setDisplayMode(selectedDisplayMode),
    onRetry: () => void handleSubmit(),
    onRefresh: () => router.refresh(),
    navigateAfterSetup,
  });

  return {
    user,
    isLoaded,
    clerkReachable,
    locale,
    profileOptions,
    selectedProfile,
    currentStep,
    displayNameMode,
    publicDisplayName,
    publicHandle: initialHandle?.trim() || null,
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
    handleDisplayNameModeChange,
    updateResidence,
    updateWork,
    updateResidenceEnabled,
    updateWorkEnabled,
    updateNoneSelected,
    handleDefer,
    handleSubmit,
    handleNext,
    handlePrevious,
    getDeferralLabel: () => getAccountSetupDeferralLabel(isDirty, completedPersistenceSteps.current.size),
  };
}
