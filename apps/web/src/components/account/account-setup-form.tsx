"use client";

import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { useReverification, useUser } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Info, UserRound } from "lucide-react";
import type { DisplayMode } from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { TerritoryLocationSelection } from "@/lib/user-location-preference";
import {
  clearLocationPreferenceMetadata,
  createLocationPreferencesMetadata,
  extractLocationPreferencesFromMetadata,
} from "@/lib/user-location-preference";
import type { AppProfile, DisplayNameMode } from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";
import {
  AccountSetupDisplayModeGrid,
  AccountSetupLocationFields,
  AccountSetupProfileGrid,
} from "@/components/account/account-setup-sections";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
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
  type AccountSetupUserUpdate,
} from "@/components/account/account-setup-save";
import {
  getAccountSetupProfileOptions,
  getAccountSetupDeferralLabel,
  resolveAccountSetupDisplayMode,
  resolveAccountSetupDisplayNameMode,
  resolveAccountSetupProfileSelection,
  shouldHydrateAccountSetupDisplayNameMode,
  shouldHydrateAccountSetupLocations,
  shouldConfirmAccountSetupDeferral,
  shouldShowAccountSetupFieldError,
} from "@/components/account/account-setup-state";

type AccountSetupFormProps = {
  nextPath?: string;
  initialRole?: Role;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialDisplayNameMode?: DisplayNameMode | null;
  initialResidence?: TerritoryLocationSelection | null;
  initialWork?: TerritoryLocationSelection | null;
  /** Legacy props remain accepted while older server callers converge. */
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
  submitMode?: "navigate" | "refresh";
};

type AccountSetupField = "pseudo" | "firstName" | "lastName" | "profile" | "location";

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

function createLegacySelection(arrondissement: number | null | undefined): TerritoryLocationSelection | null {
  if (!arrondissement || arrondissement <= 0) {
    return null;
  }
  return {
    country: "France",
    level: "arrondissement",
    label: `Paris ${arrondissement === 1 ? "1er" : `${arrondissement}e`}`,
    subtitle: "Compatibilité historique",
    arrondissement: arrondissement as TerritoryLocationSelection["arrondissement"],
    arrondissementCity: "Paris",
  };
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

export function AccountSetupForm({
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
  const updateUserWithReverification = useReverification(
    async (update: AccountSetupUserUpdate) => {
      if (!user) {
        throw new Error("Compte introuvable, reconnectez-vous.");
      }
      return user.update(update);
    },
  );
  const { locale, displayMode, setDisplayMode } = useSitePreferences();
  const legacySelection = useMemo(
    () => createLegacySelection(initialArrondissement),
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
  const [pseudoOverride, setPseudoOverride] = useState<string | null>(null);
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

  const pseudo = pseudoOverride ?? user?.username ?? "";
  const firstName = firstNameOverride ?? user?.firstName ?? "";
  const lastName = lastNameOverride ?? user?.lastName ?? "";
  const trimmedPseudo = pseudo.trim();
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const isPseudonymous = displayNameMode === "pseudo";
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

  function handleDisplayNameModeChange(mode: DisplayNameMode) {
    markFormDirty();
    setDisplayNameMode(mode);
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
  const pseudoError = !trimmedPseudo ? "Renseignez votre pseudo." : null;
  const firstNameError = !isPseudonymous && !trimmedFirstName ? "Renseignez votre prénom." : null;
  const lastNameError = !isPseudonymous && !trimmedLastName ? "Renseignez votre nom." : null;
  const profileError = !profileIsValid ? "Sélectionnez un profil valide." : null;
  const activeResidence = !noneSelected && residenceEnabled;
  const activeWork = !noneSelected && workEnabled;
  const locationError =
    (activeResidence && !isValidSelection(residence)) ||
    (activeWork && !isValidSelection(work))
      ? "Sélectionnez une ville ou un arrondissement pour chaque lieu activé."
      : null;
  const formIsValid = !pseudoError && !firstNameError && !lastNameError && !profileError && !locationError;
  const canSubmit = !isSaving;

  async function handleDefer() {
    setError(null);
    if (!user) {
      setError(toAppError("Compte introuvable, reconnectez-vous.", { kind: "permission", message: "Compte introuvable, reconnectez-vous." }));
      return;
    }
    if (
      shouldConfirmAccountSetupDeferral(isDirty) &&
      typeof window !== "undefined" &&
      !window.confirm("Des modifications ne sont pas enregistrées. Continuer sans les enregistrer ?")
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

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
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
        currentUsername: user.username,
        pseudo: trimmedPseudo,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        displayNameMode,
        metadata: completedMetadata,
        initialProfile,
        selectedProfile,
        updateUser: (update) => user.update(update),
        updateUserWithReverification,
        updateActiveProfile,
        saveDisplayMode: () => setDisplayMode(selectedDisplayMode),
        completedSteps: completedPersistenceSteps.current,
      });

      completedPersistenceSteps.current.clear();
      setIsDirty(false);
      navigateAfterSetup();
    } catch (caughtError) {
      logFailure("AccountSetup", "Update failed", caughtError, { profile: selectedProfile });
      const appError = isReverificationCancelledError(caughtError)
        ? toAppError(
            "Vérification de sécurité annulée. Aucune modification n’a été enregistrée.",
            {
              kind: "permission",
              message:
                "Vérification de sécurité annulée. Aucune modification n’a été enregistrée.",
            },
          )
        : isAppError(caughtError)
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

  if (!isLoaded) {
    if (!clerkReachable) {
      return (
        <SystemStateLayout variant="offline" className="max-w-none">
          <SystemStateIcon variant="offline"><Eye className="h-7 w-7" /></SystemStateIcon>
          <SystemStateMeta variant="offline" label="Connexion">Clerk n’est pas joignable dans cette session.</SystemStateMeta>
          <SystemStateTitle variant="offline">Session Clerk indisponible</SystemStateTitle>
          <SystemStateDescription variant="offline">La configuration initiale nécessite une session Clerk valide. Vérifiez votre connexion puis réessayez.</SystemStateDescription>
          <SystemStateAction>
            <CmmButton href="/sign-in" tone="primary">Se reconnecter</CmmButton>
          </SystemStateAction>
        </SystemStateLayout>
      );
    }
    return <CmmCard variant="outlined" size="sm"><p className="text-slate-600">Chargement du compte…</p></CmmCard>;
  }

  if (!user) {
    return <PermissionErrorState title="Connexion requise" message="Reconnectez-vous pour finaliser votre compte." />;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-full flex-col pb-2 text-white">
      <header className="mb-7 flex items-start gap-4 sm:mb-9">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-300/40 bg-slate-700/25 text-slate-100">
          <UserRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Configurez votre profil</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700/80 sm:text-base">Choisissez votre profil, vos lieux principaux et votre mode d’affichage. Ces préférences restent modifiables dans les paramètres de votre compte.</p>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <CmmCard as="section" variant="outlined" tone="slate" ariaLabel="Identité" className="border-slate-300/30 !bg-slate-900/90 !text-white p-5 shadow-none sm:p-6">
          <div className="mb-5"><h2 id="account-identity-title" className="text-2xl font-bold">Identité</h2><p className="mt-1 text-sm text-slate-200/80">Renseignez l’identité affichée dans CleanMyMap.</p></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CmmField label="Pseudo" required error={shouldShowFieldError("pseudo") ? pseudoError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100">
                <CmmInput value={pseudo} onChange={(event) => { markFormDirty(); setPseudoOverride(event.target.value); }} onBlur={() => touchField("pseudo")} autoComplete="username" placeholder="Vert_Tige" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" />
              </CmmField>
              {!isPseudonymous ? <>
                <CmmField label="Prénom" required error={shouldShowFieldError("firstName") ? firstNameError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100"><CmmInput value={firstName} onChange={(event) => { markFormDirty(); setFirstNameOverride(event.target.value); }} onBlur={() => touchField("firstName")} autoComplete="given-name" placeholder="Marie" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" /></CmmField>
                <CmmField label="Nom" required error={shouldShowFieldError("lastName") ? lastNameError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100"><CmmInput value={lastName} onChange={(event) => { markFormDirty(); setLastNameOverride(event.target.value); }} onBlur={() => touchField("lastName")} autoComplete="family-name" placeholder="Curie" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" /></CmmField>
              </> : null}
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-semibold text-white">
              <input type="checkbox" checked={isPseudonymous} onChange={(event) => handleDisplayNameModeChange(event.target.checked ? "pseudo" : "full_name")} className="mt-0.5 h-5 w-5 rounded border-slate-300/50 accent-violet-500" />
              <span>Je reste pseudonyme<span className="mt-1 block text-sm font-normal text-slate-200/80">Seul votre pseudo sera affiché</span></span>
            </label>
        </CmmCard>

        <CmmCard as="section" variant="outlined" tone="slate" ariaLabel="Profil / parcours" className="border-slate-300/30 !bg-slate-900/90 !text-white p-5 shadow-none sm:p-6">
            <div className="mb-5"><h2 id="account-profile-title" className="text-2xl font-bold">Profil / parcours</h2><p className="mt-1 text-sm text-slate-200/80">Ce choix définit votre parcours, jamais vos permissions.</p></div>
            <AccountSetupProfileGrid options={profileOptions} selectedProfile={selectedProfile} locale={locale} onChange={handleProfileChange} onBlur={() => touchField("profile")} error={shouldShowFieldError("profile") ? profileError : null} />
        </CmmCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <CmmCard as="section" variant="outlined" tone="slate" ariaLabel="Vos zones principales" className="border-slate-300/30 !bg-slate-900/90 !text-white p-5 shadow-none sm:p-6">
            <div className="mb-5"><h2 id="account-location-title" className="text-2xl font-bold">Vos zones principales</h2><p className="mt-1 text-sm text-slate-200/80">Indiquez une ville ou un arrondissement pour chaque zone. Aucune adresse précise n’est demandée.</p></div>
            <AccountSetupLocationFields residence={residence} work={work} residenceEnabled={residenceEnabled} workEnabled={workEnabled} noneSelected={noneSelected} setResidence={updateResidence} setWork={updateWork} setResidenceEnabled={updateResidenceEnabled} setWorkEnabled={updateWorkEnabled} setNoneSelected={updateNoneSelected} error={shouldShowFieldError("location") ? locationError : null} />
          </CmmCard>

          <CmmCard as="section" variant="outlined" tone="slate" ariaLabel="Mode d’affichage" className="border-slate-300/30 !bg-slate-900/90 !text-white p-5 shadow-none sm:p-6">
            <div className="mb-5"><div className="flex items-center gap-2"><div><h2 id="account-display-mode-title" className="text-2xl font-bold">Mode d’affichage</h2><p className="mt-1 text-sm text-slate-200/80">Le mode change uniquement la présentation : fonctionnalités et données restent identiques.</p></div><a href="/methodologie#modes-affichage" aria-label="Comprendre les modes d’affichage" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300/60 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"><Info className="h-4 w-4" aria-hidden="true" /></a></div></div>
            <AccountSetupDisplayModeGrid selectedMode={selectedDisplayMode} locale={locale} onChange={handleDisplayModeChange} ariaLabelledBy="account-display-mode-title" />
          </CmmCard>
        </div>
        </div>

      {error ? <div className="mt-4"><ErrorMessage kind={error.kind} title="Les réglages n’ont pas pu être enregistrés" message={error.message} actions={<CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleSubmit()}>Réessayer</CmmButton>} /></div> : null}
      <footer className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-300/30 bg-slate-900/90 px-4 py-4 shadow-none sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="max-w-xl space-y-2">
          <h2 className="text-lg font-bold text-white">Actions de validation</h2>
          <p className="text-sm text-slate-200/85">Vous pourrez modifier ces préférences à tout moment dans les paramètres de votre compte.</p>
          <Link
            href="/compte/evolution"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-sm font-bold text-slate-200 underline decoration-slate-300/70 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
          >
            Vous représentez une collectivité&nbsp;?
          </Link>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
          <CmmButton type="button" tone="secondary" size="lg" disabled={isSaving} onClick={() => void handleDefer()}>
            {getAccountSetupDeferralLabel(isDirty)}
          </CmmButton>
          <CmmButton type="submit" tone="primary" size="lg" disabled={!canSubmit} loading={isSaving}>{isSaving ? "Enregistrement…" : "Valider et continuer"}</CmmButton>
        </div>
      </footer>
    </form>
  );
}
