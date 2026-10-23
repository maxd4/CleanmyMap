"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
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
import type { AgeBand } from "@/lib/minor-consent";
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

function resolveAccountSetupControllerValidation(args: Parameters<typeof resolveAccountSetupValidation>[0]) {
  return resolveAccountSetupValidation(args);
}

type AccountSetupSubmissionProps = {
  user: ReturnType<typeof useUser>["user"];
  saveInFlight: MutableRefObject<boolean>;
  setError: Dispatch<SetStateAction<AppError | null>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setSubmitAttempted: Dispatch<SetStateAction<boolean>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
  isSaving: boolean;
  isDirty: boolean;
  currentStep: AccountSetupStep;
  handleNext: () => void;
  formIsValid: boolean;
  selectedProfile: AppProfile;
  ageBand: AgeBand;
  displayNameMode: DisplayNameMode;
  activeResidence: boolean;
  activeWork: boolean;
  residence: TerritoryLocationSelection | null;
  work: TerritoryLocationSelection | null;
  trimmedFirstName: string;
  trimmedLastName: string;
  completedPersistenceSteps: MutableRefObject<Set<AccountSetupPersistenceStep>>;
  selectedDisplayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  router: ReturnType<typeof useRouter>;
  navigateAfterSetup: () => void;
};

function useAccountSetupSubmission({ user, saveInFlight, setError, setIsSaving, setSubmitAttempted, setIsDirty, isSaving, isDirty, currentStep, handleNext, formIsValid, selectedProfile, ageBand, displayNameMode, activeResidence, activeWork, residence, work, trimmedFirstName, trimmedLastName, completedPersistenceSteps, selectedDisplayMode, setDisplayMode, router, navigateAfterSetup }: AccountSetupSubmissionProps) {
  const handleDefer = () => deferAccountSetup({ user, saveInFlight, setError, setIsSaving, isDirty, completedPersistenceSteps: completedPersistenceSteps.current, confirmDeferral: (message) => typeof window === "undefined" || window.confirm(message), navigateAfterSetup });
  const handleSubmit = (event?: Parameters<typeof submitAccountSetup>[0]["event"]) => submitAccountSetup({ event, isSaving, saveInFlight, setError, setIsSaving, user, currentStep, onAdvance: handleNext, setSubmitAttempted, formIsValid, selectedProfile, ageBand, displayNameMode, activeResidence, activeWork, residence, work, trimmedFirstName, trimmedLastName, completedPersistenceSteps: completedPersistenceSteps.current, setIsDirty, updateActiveProfile, updateAgeBand, saveDisplayMode: () => setDisplayMode(selectedDisplayMode), onRetry: () => void handleSubmit(), onRefresh: () => router.refresh(), navigateAfterSetup });
  return { handleDefer, handleSubmit };
}

export type AccountSetupFormProps = {
  nextPath?: string;
  initialRole?: Role;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  initialHandle?: string | null;
  initialDisplayNameMode?: DisplayNameMode | null;
  initialAgeBand?: AgeBand | null;
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

async function updateAgeBand(ageBand: AgeBand) {
  const response = await fetch("/api/account/age-band", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ageBand }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "La déclaration de tranche d’âge est refusée.");
  }
}

function readDisplayNameMode(metadata: Record<string, unknown> | null | undefined): DisplayNameMode {
  const value = metadata?.["display_name_mode"] ?? metadata?.["displayNameMode"];
  return resolveAccountSetupDisplayNameMode(typeof value === "string" ? value : undefined);
}

function useAccountSetupHydration({ user, isLoaded, resolvedInitialResidence, resolvedInitialWork, initialDisplayNameMode, setResidence, setWork, setResidenceEnabled, setWorkEnabled, setNoneSelected, setDisplayNameMode, hasHydratedLocationsRef, hasHydratedDisplayNameModeRef }: {
  user: ReturnType<typeof useUser>["user"];
  isLoaded: boolean;
  resolvedInitialResidence: TerritoryLocationSelection | null;
  resolvedInitialWork: TerritoryLocationSelection | null;
  initialDisplayNameMode?: DisplayNameMode | null;
  initialAgeBand?: AgeBand | null;
  setResidence: (value: TerritoryLocationSelection | null) => void;
  setWork: (value: TerritoryLocationSelection | null) => void;
  setResidenceEnabled: (value: boolean) => void;
  setWorkEnabled: (value: boolean) => void;
  setNoneSelected: (value: boolean) => void;
  setDisplayNameMode: (value: DisplayNameMode) => void;
  hasHydratedLocationsRef: MutableRefObject<boolean>;
  hasHydratedDisplayNameModeRef: MutableRefObject<boolean>;
}) {
  useEffect(() => {
    if (!isLoaded || !user || !shouldHydrateAccountSetupLocations(Boolean(resolvedInitialResidence), Boolean(resolvedInitialWork), hasHydratedLocationsRef.current)) return;
    const preferences = extractLocationPreferencesFromMetadata(user.unsafeMetadata as Record<string, unknown> | undefined);
    setResidence(preferences.residence);
    setWork(preferences.work);
    setResidenceEnabled(Boolean(preferences.residence));
    setWorkEnabled(Boolean(preferences.work));
    setNoneSelected(!preferences.residence && !preferences.work);
    hasHydratedLocationsRef.current = true;
  }, [hasHydratedLocationsRef, isLoaded, resolvedInitialResidence, resolvedInitialWork, setNoneSelected, setResidence, setResidenceEnabled, setWork, setWorkEnabled, user]);

  useEffect(() => {
    if (!isLoaded || !user || !shouldHydrateAccountSetupDisplayNameMode(initialDisplayNameMode, hasHydratedDisplayNameModeRef.current)) return;
    setDisplayNameMode(readDisplayNameMode(user.unsafeMetadata as Record<string, unknown> | undefined));
    hasHydratedDisplayNameModeRef.current = true;
  }, [hasHydratedDisplayNameModeRef, initialDisplayNameMode, isLoaded, setDisplayNameMode, user]);
}

type AccountSetupValidation = ReturnType<typeof resolveAccountSetupValidation>;

function useAccountSetupFieldHandlers({ completedPersistenceSteps, setIsDirty, setTouchedFields, submitAttempted, touchedFields, setSelectedProfileCandidate, setFirstNameOverride, setLastNameOverride, setManualDisplayMode, setDisplayNameMode, setResidence, setWork, setResidenceEnabled, setWorkEnabled, setNoneSelected }: { completedPersistenceSteps: MutableRefObject<Set<AccountSetupPersistenceStep>>; setIsDirty: (value: boolean) => void; setTouchedFields: (value: SetStateAction<Set<AccountSetupField>>) => void; submitAttempted: boolean; touchedFields: Set<AccountSetupField>; setSelectedProfileCandidate: (value: AppProfile) => void; setFirstNameOverride: (value: string | null) => void; setLastNameOverride: (value: string | null) => void; setManualDisplayMode: (value: DisplayMode | null) => void; setDisplayNameMode: (value: DisplayNameMode) => void; setResidence: (value: SetStateAction<TerritoryLocationSelection | null>) => void; setWork: (value: SetStateAction<TerritoryLocationSelection | null>) => void; setResidenceEnabled: (value: SetStateAction<boolean>) => void; setWorkEnabled: (value: SetStateAction<boolean>) => void; setNoneSelected: (value: SetStateAction<boolean>) => void }) {
  function markFormDirty() {
    completedPersistenceSteps.current.clear();
    setIsDirty(true);
  }
  function touchField(field: AccountSetupField) {
    setTouchedFields((current) => current.has(field) ? current : new Set(current).add(field));
  }
  function shouldShowFieldError(field: AccountSetupField) {
    return shouldShowAccountSetupFieldError(submitAttempted, touchedFields.has(field));
  }
  function handleProfileChange(profile: AppProfile) { markFormDirty(); touchField("profile"); setSelectedProfileCandidate(profile); }
  function handleFirstNameChange(value: string) { markFormDirty(); setFirstNameOverride(value); }
  function handleLastNameChange(value: string) { markFormDirty(); setLastNameOverride(value); }
  function handleDisplayModeChange(mode: DisplayMode) { markFormDirty(); setManualDisplayMode(mode); }
  function handleDisplayNameModeChange(mode: DisplayNameMode) { markFormDirty(); setDisplayNameMode(mode); }
  function updateResidence(value: SetStateAction<TerritoryLocationSelection | null>) { markFormDirty(); touchField("location"); setResidence(value); }
  function updateWork(value: SetStateAction<TerritoryLocationSelection | null>) { markFormDirty(); touchField("location"); setWork(value); }
  function updateResidenceEnabled(value: SetStateAction<boolean>) { markFormDirty(); touchField("location"); setResidenceEnabled(value); }
  function updateWorkEnabled(value: SetStateAction<boolean>) { markFormDirty(); touchField("location"); setWorkEnabled(value); }
  function updateNoneSelected(value: SetStateAction<boolean>) { markFormDirty(); touchField("location"); setNoneSelected(value); }
  return { markFormDirty, touchField, shouldShowFieldError, handleProfileChange, handleFirstNameChange, handleLastNameChange, handleDisplayModeChange, handleDisplayNameModeChange, updateResidence, updateWork, updateResidenceEnabled, updateWorkEnabled, updateNoneSelected };
}

function useAccountSetupNavigation({
  router,
  nextPath,
  submitMode,
  isSaving,
  currentStep,
  validation,
  setCurrentStep,
  setSubmitAttempted,
  setError,
}: {
  router: ReturnType<typeof useRouter>;
  nextPath?: string;
  submitMode: "navigate" | "refresh";
  isSaving: boolean;
  currentStep: AccountSetupStep;
  validation: Pick<AccountSetupValidation, "firstNameError" | "lastNameError" | "profileError" | "locationError">;
  setCurrentStep: (step: AccountSetupStep) => void;
  setSubmitAttempted: (attempted: boolean) => void;
  setError: (error: AppError | null) => void;
}) {
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
      firstName: validation.firstNameError,
      lastName: validation.lastNameError,
      profile: validation.profileError,
      location: validation.locationError,
    })) return;
    const nextStep = ACCOUNT_SETUP_STEPS[ACCOUNT_SETUP_STEPS.indexOf(currentStep) + 1];
    if (nextStep) {
      setCurrentStep(nextStep);
      setSubmitAttempted(false);
      setError(null);
    }
  }

  function handlePrevious() {
    if (isSaving) return;
    const previousStep = ACCOUNT_SETUP_STEPS[ACCOUNT_SETUP_STEPS.indexOf(currentStep) - 1];
    if (previousStep) {
      setCurrentStep(previousStep);
      setSubmitAttempted(false);
      setError(null);
    }
  }

  return { navigateAfterSetup, handleNext, handlePrevious };
}

function useResolvedInitialLocations(initialArrondissement: AccountSetupFormProps["initialArrondissement"], initialLocationType: AccountSetupFormProps["initialLocationType"], initialResidence: TerritoryLocationSelection | null | undefined, initialWork: TerritoryLocationSelection | null | undefined) {
  const legacySelection = useMemo(() => createTerritoryLocationSelectionFromLegacyArrondissement(initialArrondissement), [initialArrondissement]);
  return {
    resolvedInitialResidence: initialResidence ?? (initialLocationType !== "work" ? legacySelection : null),
    resolvedInitialWork: initialWork ?? (initialLocationType === "work" ? legacySelection : null),
  };
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
  initialAgeBand,
  initialArrondissement = null,
  initialLocationType = null,
  submitMode = "navigate",
}: AccountSetupFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { locale, displayMode, setDisplayMode } = useSitePreferences();
  const { resolvedInitialResidence, resolvedInitialWork } = useResolvedInitialLocations(initialArrondissement, initialLocationType, initialResidence, initialWork);

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
  const [ageBand, setAgeBand] = useState<AgeBand>(initialAgeBand ?? "unknown");
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

  useAccountSetupHydration({ user, isLoaded, resolvedInitialResidence, resolvedInitialWork, initialDisplayNameMode, setResidence, setWork, setResidenceEnabled, setWorkEnabled, setNoneSelected, setDisplayNameMode, hasHydratedLocationsRef: hasHydratedLocations, hasHydratedDisplayNameModeRef: hasHydratedDisplayNameMode });

  const { markFormDirty, touchField, shouldShowFieldError, handleProfileChange, handleFirstNameChange, handleLastNameChange, handleDisplayModeChange, handleDisplayNameModeChange, updateResidence, updateWork, updateResidenceEnabled, updateWorkEnabled, updateNoneSelected } = useAccountSetupFieldHandlers({ completedPersistenceSteps, setIsDirty, setTouchedFields, submitAttempted, touchedFields, setSelectedProfileCandidate, setFirstNameOverride, setLastNameOverride, setManualDisplayMode, setDisplayNameMode, setResidence, setWork, setResidenceEnabled, setWorkEnabled, setNoneSelected });

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

  const { firstNameError, lastNameError, profileError, activeResidence, activeWork, locationError, formIsValid } = resolveAccountSetupControllerValidation({ firstName, lastName, selectedProfile, profileOptions, noneSelected, residence, work, residenceEnabled, workEnabled });

  const { navigateAfterSetup, handleNext, handlePrevious } = useAccountSetupNavigation({
    router,
    nextPath,
    submitMode,
    isSaving,
    currentStep,
    validation: { firstNameError, lastNameError, profileError, locationError },
    setCurrentStep,
    setSubmitAttempted,
    setError,
  });

  const handleAgeBandChange = (nextAgeBand: AgeBand) => {
    completedPersistenceSteps.current.clear();
    setIsDirty(true);
    setAgeBand(nextAgeBand);
  };
  const { handleDefer, handleSubmit } = useAccountSetupSubmission({ user, saveInFlight, setError, setIsSaving, setSubmitAttempted, setIsDirty, isSaving, isDirty, currentStep, handleNext, formIsValid, selectedProfile, ageBand, displayNameMode, activeResidence, activeWork, residence, work, trimmedFirstName, trimmedLastName, completedPersistenceSteps, selectedDisplayMode, setDisplayMode, router, navigateAfterSetup });
  const getDeferralLabel = useCallback(() => getAccountSetupDeferralLabel(isDirty, completedPersistenceSteps.current.size), [isDirty]);

  // The controller exposes event handlers that close over persistence refs.
  // Keep this construction explicit so the React refs lint rule does not
  // interpret the generic result helper as a render-time ref read.
  const controllerResult = { user, isLoaded, clerkReachable, locale, profileOptions, selectedProfile, ageBand, currentStep, displayNameMode, publicDisplayName, publicHandle: initialHandle?.trim() || null, firstName, lastName, selectedDisplayMode, residence, work, residenceEnabled, workEnabled, noneSelected, isSaving, isDirty, error, firstNameError, lastNameError, profileError, locationError, shouldShowFieldError, markFormDirty, touchField, handleFirstNameChange, handleLastNameChange, handleProfileChange, handleDisplayModeChange, handleDisplayNameModeChange, handleAgeBandChange, updateResidence, updateWork, updateResidenceEnabled, updateWorkEnabled, updateNoneSelected, handleDefer, handleSubmit, handleNext, handlePrevious };
  return { ...controllerResult, getDeferralLabel };
}
