"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, WifiOff } from "lucide-react";
import type { Locale } from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  GreaterParisSelect,
  type TerritoryLocationSelection,
} from "@/lib/geo/greater-paris-select";
import {
  createTerritoryLocationMetadata,
  extractTerritoryLocationPreferenceFromMetadata,
} from "@/lib/user-location-preference";
import { getProfileLabel, getProfileSubtitle, getSwitchableProfiles, type AppProfile } from "@/lib/profiles";
import { InlineFieldError } from "@/components/ui/inline-field-error";
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
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { defaultMessageForKind, isAppError, toAppError, type AppError } from "@/lib/errors/app-errors";
import { cn } from "@/lib/utils";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { ACCOUNT_SETUP_SCHEMA_VERSION } from "@/lib/auth/account-setup-config";
import { logFailure } from "@/lib/logging/failure-log";

function createInitialTerritorySelection(
  initialArrondissement: number | null | undefined,
): TerritoryLocationSelection | null {
  if (!initialArrondissement || initialArrondissement <= 0) {
    return null;
  }

  return {
    country: "France",
    level: "arrondissement",
    label: `Paris ${initialArrondissement === 1 ? "1er" : `${initialArrondissement}e`}`,
    subtitle: "Compatibilité historique",
    arrondissement: initialArrondissement as TerritoryLocationSelection["arrondissement"],
    arrondissementCity: "Paris",
  };
}

type AccountSetupFormProps = {
  nextPath?: string;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
  submitMode?: "navigate" | "refresh";
};

async function updateProfileRole(profile: AppProfile) {
  const response = await fetch("/api/account/profile-role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Mutation de rôle refusée.");
  }
}

export function AccountSetupForm({
  nextPath,
  initialProfile,
  clerkReachable,
  isLocalHost,
  initialArrondissement = null,
  initialLocationType = null,
  submitMode = "navigate",
}: AccountSetupFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { locale, setLocale, setDisplayMode } = useSitePreferences();

  const profileOptions = useMemo(
    () => getSwitchableProfiles(initialProfile),
    [initialProfile],
  );

  const [selectedProfile, setSelectedProfile] = useState<AppProfile>(initialProfile);
  const [locationType, setLocationType] = useState<"residence" | "work">(
    initialLocationType ?? "residence",
  );
  const [territorySelection, setTerritorySelection] = useState<TerritoryLocationSelection | null>(
    createInitialTerritorySelection(initialArrondissement),
  );
  const hasHydratedTerritorySelection = useRef(Boolean(initialArrondissement));
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [acceptExhaustiveMode, setAcceptExhaustiveMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }
    if (territorySelection) {
      hasHydratedTerritorySelection.current = true;
      return;
    }
    if (hasHydratedTerritorySelection.current) {
      return;
    }

    const existingSelection = extractTerritoryLocationPreferenceFromMetadata(
      user.unsafeMetadata as Record<string, unknown> | undefined,
    );
    if (existingSelection) {
      setTerritorySelection(existingSelection);
    }
    hasHydratedTerritorySelection.current = true;
  }, [isLoaded, territorySelection, user]);

  const isProfileValid =
    profileOptions.includes(selectedProfile) || selectedProfile === initialProfile;
  const territoryIsValid =
    Boolean(territorySelection?.label.trim()) &&
    (territorySelection?.level !== "arrondissement" ||
      territorySelection.arrondissement != null);
  const profileError = !isProfileValid
    ? "Sélectionnez un rôle valide."
    : null;
  const territoryError = !territoryIsValid
    ? "Sélectionnez un territoire (pays, région, département, commune ou arrondissement)."
    : null;
  const displayModeError = acceptExhaustiveMode
    ? null
    : "Confirmez le mode exhaustif pour continuer.";
  const canSubmit = !profileError && !territoryError && !displayModeError && !isSaving;
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError(
        toAppError("Compte introuvable, reconnectez-vous.", {
          kind: "permission",
          message: "Compte introuvable, reconnectez-vous.",
        }),
      );
      return;
    }
    if (!isProfileValid) {
      setError(
        toAppError("Sélectionnez un rôle valide.", {
          kind: "validation",
          message: "Sélectionnez un rôle valide.",
        }),
      );
      return;
    }
    if (!acceptExhaustiveMode) {
      setError(
        toAppError("Confirmez le mode exhaustif pour continuer.", {
          kind: "validation",
          message: "Confirmez le mode exhaustif pour continuer.",
        }),
      );
      return;
    }
    if (!territoryIsValid || !territorySelection) {
      setError(
        toAppError("Sélectionnez un territoire (pays, région, département, commune ou arrondissement).", {
          kind: "validation",
          message: "Sélectionnez un territoire (pays, région, département, commune ou arrondissement).",
        }),
      );
      return;
    }

    try {
      setIsSaving(true);
      if (selectedProfile !== initialProfile) {
        await updateProfileRole(selectedProfile);
      }

      setLocale(selectedLocale);
      setDisplayMode("exhaustif");

      const metadata: Record<string, unknown> = {
        ...(user.unsafeMetadata ?? {}),
        profileSetupCompleted: true,
        profileSetupVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
        profileSetupSchemaVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
      };

      Object.assign(
        metadata,
        createTerritoryLocationMetadata(territorySelection, locationType),
      );

      await user.update({ unsafeMetadata: metadata });

      if (submitMode === "refresh") {
        router.refresh();
      } else {
        router.replace(nextPath ?? PROFIL_ROUTE);
        router.refresh();
      }
    } catch (error) {
      logFailure("AccountSetup", "Update failed", error, {
        profile: selectedProfile,
      });
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: "Impossible d'enregistrer les préférences. Réessayez.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => window.location.reload(),
          onRefresh: () => window.location.reload(),
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
          <SystemStateIcon variant="offline">
            <WifiOff className="h-7 w-7" />
          </SystemStateIcon>
          <SystemStateMeta variant="offline" label="Contexte local">
            {clerkReachable
              ? "Clerk n'a pas terminé son chargement sur localhost."
              : "Clerk n'est pas joignable dans cette session locale."}
          </SystemStateMeta>
          <SystemStateTitle variant="offline">
            Session Clerk indisponible
          </SystemStateTitle>
          <SystemStateDescription variant="offline">
            La configuration initiale nécessite une session Clerk valide. Sur
            ce poste local, utilisez le domaine autorisé ou activez le
            contournement de développement pour poursuivre.
          </SystemStateDescription>
          <SystemStateAction>
            <CmmButton href="/" tone="secondary">
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </CmmButton>
            <CmmButton href="/sign-in" tone="primary">
              <LogIn className="h-4 w-4" />
              Se reconnecter
            </CmmButton>
          </SystemStateAction>
        </SystemStateLayout>
      );
    }

    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <p className="cmm-text-small text-violet-100/80">
          {isLocalHost
            ? "Chargement du compte local..."
            : "Chargement du compte..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <PermissionErrorState
        title="Connexion requise"
        message="Reconnectez-vous pour finaliser votre compte."
      />
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-5 rounded-[2.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_48%,rgba(88,28,135,0.86)_100%)] p-6 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.6)] backdrop-blur-2xl"
    >
      <div className="space-y-2">
        <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-emerald-200/90">
          Configuration initiale
        </p>
        <h1 className="text-2xl font-black text-white">
          Finalisez votre compte
        </h1>
        <p className="cmm-text-small text-violet-100/78">
          Choisissez votre rôle, votre lieu principal, votre langue et votre mode
          d&apos;affichage. Ces réglages restent modifiables plus tard dans
          &quot;Réglages&quot; du ruban.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="cmm-text-small font-medium text-white/90">Rôle</span>
            <p className="cmm-text-caption text-violet-100/65">
              {selectedLocale === "fr"
                ? "Choisis le rôle le plus proche de ton usage actuel."
                : "Choose the role closest to your current use case."}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profileOptions.map((profile) => {
              const isSelected = selectedProfile === profile;
              return (
                <button
                  key={profile}
                  type="button"
                  onClick={() => setSelectedProfile(profile)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                    isSelected
                      ? "border-emerald-300/50 bg-emerald-300/15 shadow-[0_18px_32px_-24px_rgba(16,185,129,0.7)]"
                      : "border-white/10 bg-white/[0.06] hover:border-white/20 hover:bg-white/[0.09]",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-black uppercase tracking-[0.08em] text-white/80">
                    i
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {getProfileLabel(profile, selectedLocale)}
                      </span>
                      {isSelected ? (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                          {selectedLocale === "fr" ? "Sélectionné" : "Selected"}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-violet-100/72">
                      {getProfileSubtitle(profile, selectedLocale)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {profileError ? <InlineFieldError message={profileError} /> : null}

          <p className="max-w-3xl text-[11px] leading-5 text-violet-100/70">
            {selectedLocale === "fr"
              ? "Tu peux changer de rôle à tout moment depuis le badge de profil puis le menu « Changer de rôle ». Pour demander une promotion vers Elu ou Administration, utilise le formulaire de la rubrique « Retours & Qualité » (collaboration)."
              : "You can change your role at any time from your profile badge and the \"Switch role\" menu. To request a promotion to Elected or Administration, use the form in the \"Feedback & Quality\" section (collaboration)."}
          </p>
        </div>

        <label className="block space-y-2">
          <span className="cmm-text-small font-medium text-white/90">
            Langue
          </span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 cmm-text-small text-white shadow-none outline-none placeholder:text-violet-100/40 focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30"
            value={selectedLocale}
            onChange={(event) =>
              setSelectedLocale(event.target.value === "en" ? "en" : "fr")
            }
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>

        <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:col-span-2">
          <legend className="cmm-text-small font-medium text-white/90">
            Mode d&apos;affichage
          </legend>
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <input
              type="checkbox"
              checked={acceptExhaustiveMode}
              onChange={(event) => setAcceptExhaustiveMode(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 accent-emerald-400 focus:ring-emerald-300"
            />
            <span className="block">
              <span className="block cmm-text-small font-medium text-white">
                {selectedLocale === "fr" ? "Mode Exhaustif" : "Exhaustive mode"}
              </span>
              <span className="mt-1 block cmm-text-small text-violet-100/70">
                {selectedLocale === "fr"
                  ? "Les modes Sobre et Minimaliste sont en préparation."
                  : "Calm and Minimalist modes are still in preparation."}
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <legend className="cmm-text-small font-medium text-white/90">
            Territoire principal
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 cmm-text-small text-violet-100/76">
              <input
                type="radio"
                name="locationType"
                value="residence"
                checked={locationType === "residence"}
                onChange={() => setLocationType("residence")}
                className="accent-emerald-400"
              />
              Résidence
            </label>
            <label className="flex items-center gap-2 cmm-text-small text-violet-100/76">
              <input
                type="radio"
                name="locationType"
                value="work"
                checked={locationType === "work"}
                onChange={() => setLocationType("work")}
                className="accent-emerald-400"
              />
              Travail
            </label>
          </div>

          <label className="block space-y-2">
            <span className="cmm-text-small font-medium text-white/90">
              Pays, région, département, commune ou arrondissement
            </span>
            <GreaterParisSelect
              value={territorySelection}
              onChange={setTerritorySelection}
              placeholder="Rechercher un territoire..."
            />
            {territoryError ? <InlineFieldError message={territoryError} /> : null}
          </label>
        </fieldset>
      </div>

      {error ? (
        error.kind === "permission" ? (
          <PermissionErrorState
            title="Connexion requise"
            message={error.message}
          />
        ) : (
          <ErrorMessage
            kind={error.kind}
            title="Les réglages n'ont pas pu être enregistrés"
            message={error.message}
            actions={
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(79,70,229,0.92)_54%,rgba(109,40,217,0.9)_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.6)] transition-all hover:border-emerald-300/30"
              >
                Réessayer
              </button>
            }
          />
        )
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(79,70,229,0.92)_54%,rgba(109,40,217,0.9)_100%)] px-5 py-3 cmm-text-small font-semibold text-white shadow-[0_18px_34px_-18px_rgba(15,23,42,0.55)] transition-all hover:border-emerald-300/30 hover:shadow-[0_22px_40px_-20px_rgba(79,70,229,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Enregistrement..." : "Valider et continuer"}
        </button>
        <p className="cmm-text-caption text-violet-100/65">
          Les modifications restent accessibles plus tard dans le ruban.
        </p>
      </div>
    </form>
  );
}
