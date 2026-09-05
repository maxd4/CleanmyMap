"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReverification, useUser } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Eye, Info, UserRound } from "lucide-react";
import {
  DISPLAY_MODE_DESCRIPTIONS,
  DISPLAY_MODES,
  type DisplayMode,
} from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { TerritoryLocationSelection } from "@/lib/user-location-preference";
import {
  clearLocationPreferenceMetadata,
  createLocationPreferencesMetadata,
  extractLocationPreferencesFromMetadata,
} from "@/lib/user-location-preference";
import {
  getSwitchableProfiles,
  normalizeDisplayNameMode,
  type AppProfile,
  type DisplayNameMode,
} from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";
import { AccountSetupLocationFields, AccountSetupProfileGrid } from "@/components/account/account-setup-sections";
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
  persistAccountSetupChanges,
  type AccountSetupUserUpdate,
} from "@/components/account/account-setup-save";

type AccountSetupFormProps = {
  nextPath?: string;
  initialRole?: Role;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialResidence?: TerritoryLocationSelection | null;
  initialWork?: TerritoryLocationSelection | null;
  /** Legacy props remain accepted while older server callers converge. */
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
  submitMode?: "navigate" | "refresh";
};

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

const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  exhaustif: "Exhaustif",
  minimaliste: "Minimaliste",
  sobre: "Sobre",
};

function readDisplayNameMode(metadata: Record<string, unknown> | null | undefined): DisplayNameMode {
  const value = metadata?.["display_name_mode"] ?? metadata?.["displayNameMode"];
  return normalizeDisplayNameMode(typeof value === "string" ? value : undefined);
}

export function AccountSetupForm({
  nextPath,
  initialProfile,
  initialRole = initialProfile,
  clerkReachable,
  initialResidence,
  initialWork,
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
    () =>
      getSwitchableProfiles(initialRole).filter(
        (profile) => profile !== "max" &&
          (profile !== "admin" || initialRole === "admin" || initialRole === "max"),
      ),
    [initialRole],
  );
  const [selectedProfile, setSelectedProfile] = useState<AppProfile>(initialProfile);
  const [pseudoOverride, setPseudoOverride] = useState<string | null>(null);
  const [firstNameOverride, setFirstNameOverride] = useState<string | null>(null);
  const [lastNameOverride, setLastNameOverride] = useState<string | null>(null);
  const [displayNameMode, setDisplayNameMode] = useState<DisplayNameMode>("full_name");
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DisplayMode>(displayMode);
  const [residence, setResidence] = useState<TerritoryLocationSelection | null>(resolvedInitialResidence);
  const [work, setWork] = useState<TerritoryLocationSelection | null>(resolvedInitialWork);
  const [residenceEnabled, setResidenceEnabled] = useState(Boolean(resolvedInitialResidence));
  const [workEnabled, setWorkEnabled] = useState(Boolean(resolvedInitialWork));
  const [noneSelected, setNoneSelected] = useState(!resolvedInitialResidence && !resolvedInitialWork);
  const hasHydratedUserState = useRef(Boolean(resolvedInitialResidence || resolvedInitialWork));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const pseudo = pseudoOverride ?? user?.username ?? "";
  const firstName = firstNameOverride ?? user?.firstName ?? "";
  const lastName = lastNameOverride ?? user?.lastName ?? "";
  const trimmedPseudo = pseudo.trim();
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const isPseudonymous = displayNameMode === "pseudo";

  useEffect(() => {
    if (!isLoaded || !user || hasHydratedUserState.current) {
      return;
    }
    const metadata = user.unsafeMetadata as Record<string, unknown> | undefined;
    const preferences = extractLocationPreferencesFromMetadata(metadata);
    setDisplayNameMode(readDisplayNameMode(metadata));
    setResidence(preferences.residence);
    setWork(preferences.work);
    setResidenceEnabled(Boolean(preferences.residence));
    setWorkEnabled(Boolean(preferences.work));
    setNoneSelected(!preferences.residence && !preferences.work);
    hasHydratedUserState.current = true;
  }, [isLoaded, user]);

  const profileIsValid = profileOptions.includes(selectedProfile) || selectedProfile === initialProfile;
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
  const canSubmit = !pseudoError && !firstNameError && !lastNameError && !profileError && !locationError && !isSaving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!user) {
      setError(toAppError("Compte introuvable, reconnectez-vous.", { kind: "permission", message: "Compte introuvable, reconnectez-vous." }));
      return;
    }
    if (!canSubmit) {
      setError(toAppError("Vérifiez les informations obligatoires.", { kind: "validation", message: "Vérifiez les informations obligatoires." }));
      return;
    }

    try {
      setIsSaving(true);
      const metadata = clearLocationPreferenceMetadata({ ...(user.unsafeMetadata ?? {}) });
      Object.assign(metadata, {
        profileSetupCompleted: true,
        profileSetupVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
        profileSetupSchemaVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
        display_name_mode: displayNameMode,
      });
      Object.assign(
        metadata,
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
        metadata,
        initialProfile,
        selectedProfile,
        updateUser: (update) => user.update(update),
        updateUserWithReverification,
        updateActiveProfile,
        saveDisplayMode: () => setDisplayMode(selectedDisplayMode),
      });

      if (submitMode === "refresh") {
        router.refresh();
      } else {
        router.replace(nextPath ?? PROFIL_ROUTE);
        router.refresh();
      }
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
        notifyNetworkToast({ message: appError.message || defaultMessageForKind("network"), onRetry: () => window.location.reload(), onRefresh: () => window.location.reload() });
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
    <form onSubmit={(event) => void handleSubmit(event)} className="mx-auto flex min-h-full w-full max-w-7xl flex-col pb-2 text-white">
      <header className="mb-7 flex items-start gap-4 sm:mb-9">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/50 bg-violet-300/20 text-violet-50 shadow-[0_0_24px_-8px_rgba(139,92,246,0.9)]">
          <UserRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">Complétez votre profil en une seule étape</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-950/80 sm:text-base">Choisissez votre profil, vos lieux principaux et votre mode d’affichage. Ces préférences restent modifiables dans les paramètres de votre compte.</p>
        </div>
      </header>

      <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="space-y-4">
          <CmmCard as="section" variant="outlined" tone="emerald" ariaLabel="Qui êtes-vous ?" className="border-emerald-100/45 !bg-emerald-950/60 !text-white p-6 shadow-[0_24px_55px_-42px_rgba(6,78,59,0.9)] sm:p-7">
            <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400 text-lg font-black text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)]">1</span><div><h2 id="account-identity-title" className="text-2xl font-bold">Qui êtes-vous&nbsp;?</h2><p className="mt-1 text-sm text-emerald-50/80">Renseignez l’identité affichée dans CleanMyMap.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CmmField label="Pseudo" required error={pseudoError} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-violet-100 [&_.cmm-field-error]:!text-violet-100">
                <CmmInput value={pseudo} onChange={(event) => setPseudoOverride(event.target.value)} autoComplete="username" placeholder="Vert_Tige" className="!min-h-14 w-full !border-emerald-100/45 !bg-emerald-950/45 !text-white placeholder:!text-emerald-50/65" />
              </CmmField>
              {!isPseudonymous ? <>
                <CmmField label="Prénom" required error={firstNameError} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-violet-100 [&_.cmm-field-error]:!text-violet-100"><CmmInput value={firstName} onChange={(event) => setFirstNameOverride(event.target.value)} autoComplete="given-name" placeholder="Marie" className="!min-h-14 w-full !border-emerald-100/45 !bg-emerald-950/45 !text-white placeholder:!text-emerald-50/65" /></CmmField>
                <CmmField label="Nom" required error={lastNameError} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-violet-100 [&_.cmm-field-error]:!text-violet-100"><CmmInput value={lastName} onChange={(event) => setLastNameOverride(event.target.value)} autoComplete="family-name" placeholder="Curie" className="!min-h-14 w-full !border-emerald-100/45 !bg-emerald-950/45 !text-white placeholder:!text-emerald-50/65" /></CmmField>
              </> : null}
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-semibold text-white">
              <input type="checkbox" checked={isPseudonymous} onChange={(event) => setDisplayNameMode(event.target.checked ? "pseudo" : "full_name")} className="mt-0.5 h-5 w-5 rounded border-emerald-100/50 accent-violet-500" />
              <span>Je reste pseudonyme<span className="mt-1 block text-sm font-normal text-emerald-50/80">Seul votre pseudo sera affiché</span></span>
            </label>
          </CmmCard>

          <CmmCard as="section" variant="outlined" tone="emerald" ariaLabel="Quel profil vous correspond le mieux ?" className="border-emerald-100/45 !bg-emerald-950/60 !text-white p-6 shadow-[0_24px_55px_-42px_rgba(6,78,59,0.9)] sm:p-7">
            <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400 text-lg font-black text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)]">2</span><div><h2 id="account-profile-title" className="text-2xl font-bold">Quel profil vous correspond le mieux&nbsp;?</h2><p className="mt-1 text-sm text-emerald-50/80">Ce choix modifie votre parcours, jamais vos permissions.</p></div></div>
            <AccountSetupProfileGrid options={profileOptions} selectedProfile={selectedProfile} locale={locale} onChange={setSelectedProfile} error={profileError} />
          </CmmCard>
        </div>

        <div className="space-y-4">
          <CmmCard as="section" variant="outlined" tone="emerald" ariaLabel="Où agissez-vous principalement ?" className="border-emerald-100/45 !bg-emerald-950/60 !text-white p-6 shadow-[0_24px_55px_-42px_rgba(6,78,59,0.9)] sm:p-7">
            <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400 text-lg font-black text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)]">3</span><div><h2 id="account-location-title" className="text-2xl font-bold">Où agissez-vous principalement&nbsp;?</h2><p className="mt-1 text-sm text-emerald-50/80">Renseignez votre domicile et votre lieu de travail, séparément.</p></div></div>
            <AccountSetupLocationFields residence={residence} work={work} residenceEnabled={residenceEnabled} workEnabled={workEnabled} noneSelected={noneSelected} setResidence={setResidence} setWork={setWork} setResidenceEnabled={setResidenceEnabled} setWorkEnabled={setWorkEnabled} setNoneSelected={setNoneSelected} error={locationError} />
          </CmmCard>

          <CmmCard as="section" variant="outlined" tone="emerald" ariaLabel="Mode d’affichage initial" className="border-emerald-100/45 !bg-emerald-950/60 !text-white p-6 shadow-[0_24px_55px_-42px_rgba(6,78,59,0.9)] sm:p-7">
            <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400 text-lg font-black text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)]">4</span><div className="flex items-center gap-2"><div><h2 id="account-display-mode-title" className="text-2xl font-bold">Mode d’affichage initial</h2><p className="mt-1 text-sm text-emerald-50/80">Le mode change la présentation, jamais les fonctionnalités, permissions ou données.</p></div><a href="/methodologie#modes-affichage" aria-label="Comprendre les modes d’affichage" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-200/80 text-sm font-black text-violet-100 transition hover:bg-violet-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"><Info className="h-4 w-4" aria-hidden="true" /></a></div></div>
            <div role="radiogroup" aria-labelledby="account-display-mode-title" className="grid gap-3 sm:grid-cols-3">
              {DISPLAY_MODES.map((mode) => {
                const selected = selectedDisplayMode === mode;
                const label = DISPLAY_MODE_LABELS[mode];
                const description = DISPLAY_MODE_DESCRIPTIONS[mode][locale];
                return <button key={mode} type="button" role="radio" aria-checked={selected} onClick={() => setSelectedDisplayMode(mode)} className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${selected ? "border-violet-300 bg-white text-violet-700 shadow-[0_10px_28px_-18px_rgba(124,58,237,0.9)]" : "border-emerald-100/40 bg-emerald-950/45 text-white hover:border-violet-200/70 hover:bg-emerald-950/60"}`}>
                  {selected ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white"><Check className="h-4 w-4" aria-hidden="true" /></span> : null}
                  <Eye className="h-7 w-7" aria-hidden="true" />
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-xs leading-4 opacity-80">{description}</span>
                </button>;
              })}
            </div>
          </CmmCard>
        </div>
      </div>

      {error ? <div className="mt-4"><ErrorMessage kind={error.kind} title="Les réglages n’ont pas pu être enregistrés" message={error.message} actions={<CmmButton type="button" tone="secondary" size="sm" onClick={() => window.location.reload()}>Réessayer</CmmButton>} /></div> : null}
      <footer className="sticky bottom-0 z-10 mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-100/35 bg-emerald-950/65 px-4 py-4 shadow-[0_-16px_35px_-30px_rgba(6,78,59,0.9)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="max-w-xl space-y-2">
          <p className="text-sm text-emerald-50/85">Vous pourrez modifier ces préférences à tout moment dans les paramètres de votre compte.</p>
          <Link
            href="/compte/evolution"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-sm font-bold text-violet-100 underline decoration-violet-200/70 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
          >
            Vous représentez une collectivité&nbsp;?
          </Link>
        </div>
        <CmmButton type="submit" tone="primary" size="lg" disabled={!canSubmit} loading={isSaving} className="!border-violet-300 !bg-violet-500 !bg-none !text-white hover:!bg-violet-600">{isSaving ? "Enregistrement…" : "Valider et continuer"}</CmmButton>
      </footer>
    </form>
  );
}
