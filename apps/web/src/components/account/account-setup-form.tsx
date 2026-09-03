"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Eye,
  FlaskConical,
  House,
  Landmark,
  LogIn,
  ShieldCheck,
  UserRound,
  UsersRound,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmSelect } from "@/components/ui/cmm-field";
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

const PROFILE_ICONS: Record<AppProfile, LucideIcon> = {
  benevole: UserRound,
  coordinateur: UsersRound,
  scientifique: FlaskConical,
  entreprise: Briefcase,
  elu: Landmark,
  admin: ShieldCheck,
  max: Building2,
};

const PROFILE_DETAILS: Record<AppProfile, Record<Locale, string>> = {
  benevole: {
    fr: "Vous participez à des actions de nettoyage, signalez des déchets et contribuez à améliorer votre environnement.",
    en: "You take part in clean-up actions, report waste and help improve your environment.",
  },
  coordinateur: {
    fr: "Vous organisez des actions collectives et accompagnez les équipes dans leur réalisation.",
    en: "You organize collective actions and support teams as they carry them out.",
  },
  scientifique: {
    fr: "Vous collectez, analysez et mettez en perspective les données issues des actions de terrain.",
    en: "You collect, analyze and contextualize data from field actions.",
  },
  entreprise: {
    fr: "Vous soutenez des actions locales et valorisez l’engagement environnemental de votre entreprise.",
    en: "You support local actions and highlight your company's environmental commitment.",
  },
  elu: {
    fr: "Vous suivez les actions menées sur votre territoire et facilitez la coordination locale.",
    en: "You follow actions in your territory and help coordinate local efforts.",
  },
  admin: {
    fr: "Vous coordonnez la modération, la qualité des données et l’accompagnement des utilisateurs.",
    en: "You coordinate moderation, data quality and user support.",
  },
  max: {
    fr: "Vous supervisez la plateforme et arbitrez les décisions qui nécessitent un accès propriétaire.",
    en: "You supervise the platform and arbitrate decisions requiring owner access.",
  },
};

export function AccountSetupForm({
  nextPath,
  initialProfile,
  clerkReachable,
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
  const [isTerritorySkipped, setIsTerritorySkipped] = useState(false);
  const hasHydratedTerritorySelection = useRef(Boolean(initialArrondissement));
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }
    if (isTerritorySkipped || territorySelection) {
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
  }, [isLoaded, isTerritorySkipped, territorySelection, user]);

  const isProfileValid =
    profileOptions.includes(selectedProfile) || selectedProfile === initialProfile;
  const territoryIsValid =
    isTerritorySkipped ||
    (Boolean(territorySelection?.label.trim()) &&
      (territorySelection?.level !== "arrondissement" ||
        territorySelection.arrondissement != null));
  const profileError = !isProfileValid
    ? "Sélectionnez un rôle valide."
    : null;
  const territoryError = !territoryIsValid
    ? "Sélectionnez un territoire (pays, région, département, commune ou arrondissement)."
    : null;
  const canSubmit = !profileError && !territoryError && !isSaving;
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
    if (!territoryIsValid || (!isTerritorySkipped && !territorySelection)) {
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

      if (!isTerritorySkipped && territorySelection) {
        Object.assign(
          metadata,
          createTerritoryLocationMetadata(territorySelection, locationType),
        );
      }

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
          <SystemStateMeta variant="offline" label="Connexion">
            Clerk n&apos;est pas joignable dans cette session.
          </SystemStateMeta>
          <SystemStateTitle variant="offline">
            Session Clerk indisponible
          </SystemStateTitle>
          <SystemStateDescription variant="offline">
            La configuration initiale nécessite une session Clerk valide.
            Vérifiez votre connexion puis réessayez.
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
      <CmmCard variant="outlined" size="sm" className="max-w-none">
        <p className="cmm-text-small text-slate-600">Chargement du compte...</p>
      </CmmCard>
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
      className="flex min-h-0 flex-1 flex-col text-slate-900"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-7 px-5 py-5 sm:px-8 sm:py-7">
          <header className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 id="account-completion-modal-title" className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Mettre à jour votre compte
              </h2>
              <p id="account-completion-modal-description" className="cmm-text-small text-slate-600">
                Une information supplémentaire est nécessaire pour continuer.
              </p>
            </div>
          </header>

          <section aria-labelledby="account-role-title" className="space-y-3">
            <div>
              <h3 id="account-role-title" className="text-sm font-bold text-slate-950">
                1. Quel est votre rôle ?
              </h3>
              <p className="mt-1 cmm-text-caption text-slate-500">
                Cela nous aide à vous proposer l&apos;expérience la plus adaptée.
              </p>
            </div>

            <div role="radiogroup" aria-labelledby="account-role-title" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {profileOptions.map((profile) => {
                const isSelected = selectedProfile === profile;
                const isPromotionOnlyProfile = profile === "admin";
                const Icon = PROFILE_ICONS[profile];
                return (
                  <button
                    key={profile}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={isPromotionOnlyProfile}
                    disabled={isPromotionOnlyProfile}
                    onClick={() => {
                      if (!isPromotionOnlyProfile) {
                        setSelectedProfile(profile);
                      }
                    }}
                    className={cn(
                      "group flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center transition-colors",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                        : isPromotionOnlyProfile
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-75"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", isSelected ? "bg-emerald-100 text-emerald-700" : isPromotionOnlyProfile ? "bg-slate-100 text-slate-400" : "bg-slate-50 text-emerald-600")}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold leading-tight">
                      {getProfileLabel(profile, selectedLocale)}
                    </span>
                    <span className="line-clamp-2 text-[11px] leading-4 text-slate-500">
                      {isPromotionOnlyProfile
                        ? "Rôle acquis par promotion"
                        : getProfileSubtitle(profile, selectedLocale)}
                    </span>
                  </button>
                );
              })}
            </div>

            {profileError ? <InlineFieldError message={profileError} /> : null}

            <CmmCard tone="emerald" variant="outlined" size="sm" className="flex items-start gap-3 border-emerald-200 bg-emerald-50/70 p-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="cmm-text-caption font-bold text-emerald-700">
                  Rôle sélectionné : {getProfileLabel(selectedProfile, selectedLocale)}
                </p>
                <p className="mt-1 cmm-text-small text-slate-600">
                  {PROFILE_DETAILS[selectedProfile][selectedLocale]}
                </p>
              </div>
            </CmmCard>
          </section>

          <div className="grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:divide-x lg:divide-slate-200">
            <section aria-labelledby="account-territory-title" className="space-y-4 lg:pr-7">
              <div>
                <h3 id="account-territory-title" className="text-sm font-bold text-slate-950">
                  2. Quel est votre territoire d&apos;action principal ?
                </h3>
                <p className="mt-1 cmm-text-caption text-slate-500">
                  Choisissez votre lieu de résidence ou d&apos;activité principale.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Type de territoire">
                {([
                  ["residence", "Résidence", House],
                  ["work", "Travail", Briefcase],
                ] as const).map(([value, label, Icon]) => {
                  const isSelected = locationType === value;
                  return (
                    <label key={value} className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 cmm-text-small transition-colors", isSelected ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300")}>
                      <input
                        type="radio"
                        name="locationType"
                        value={value}
                        checked={isSelected}
                        onChange={() => setLocationType(value)}
                        className="accent-emerald-600"
                      />
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </label>
                  );
                })}
              </div>

              <label className="block space-y-2">
                <span className="cmm-text-small font-medium text-slate-800">
                  Pays, région, département, commune ou arrondissement
                </span>
                <GreaterParisSelect
                  value={territorySelection}
                  onChange={(selection) => {
                    setTerritorySelection(selection);
                    setIsTerritorySkipped(false);
                  }}
                  placeholder="Rechercher une commune, une région..."
                  appearance="light"
                />
                {territoryError ? <InlineFieldError message={territoryError} /> : null}
              </label>
              <div className="space-y-2">
                <p className="cmm-text-caption text-slate-500">
                  Cette information sert à vous présenter les actions proches de chez vous.
                </p>
                <CmmButton
                  type="button"
                  tone={isTerritorySkipped ? "primary" : "secondary"}
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => {
                    setTerritorySelection(null);
                    setIsTerritorySkipped(true);
                    hasHydratedTerritorySelection.current = true;
                  }}
                  className="justify-start px-0 text-left"
                >
                  Je ne veux pas renseigner ces informations
                </CmmButton>
                {isTerritorySkipped ? (
                  <p className="cmm-text-caption text-emerald-700">
                    Vous pourrez renseigner votre territoire plus tard dans les paramètres de votre compte.
                  </p>
                ) : null}
              </div>
            </section>

            <div className="grid content-start gap-7 lg:pl-7">
              <section aria-labelledby="account-language-title" className="space-y-3">
                <div>
                  <h3 id="account-language-title" className="text-sm font-bold text-slate-950">
                    3. Langue
                  </h3>
                  <p className="mt-1 cmm-text-caption text-slate-500">
                    Choisissez votre langue de préférence.
                  </p>
                </div>
                <CmmField label="Langue" className="[&_.cmm-field-label]:text-slate-800 [&_.cmm-field-hint]:text-slate-500">
                  <CmmSelect
                    value={selectedLocale}
                    onChange={(event) => setSelectedLocale(event.target.value === "en" ? "en" : "fr")}
                    className="w-full bg-white text-slate-900"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </CmmSelect>
                </CmmField>
              </section>

              <section aria-labelledby="account-display-mode-title" className="space-y-3">
                <div>
                  <h3 id="account-display-mode-title" className="text-sm font-bold text-slate-950">
                    4. Mode d&apos;affichage initial
                  </h3>
                  <p className="mt-1 cmm-text-caption text-slate-500">
                    Vous pourrez le modifier à tout moment dans Réglages.
                  </p>
                </div>
                <CmmCard tone="emerald" variant="outlined" size="sm" className="flex items-start gap-3 border-emerald-200 bg-emerald-50/70 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="cmm-text-small font-semibold text-slate-900">Exhaustif</p>
                    <p className="cmm-text-caption text-slate-600">
                      Toutes les informations et options sont activées par défaut.
                    </p>
                  </div>
                </CmmCard>
              </section>
            </div>
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
                  <CmmButton type="button" tone="secondary" size="sm" onClick={() => window.location.reload()}>
                    Réessayer
                  </CmmButton>
                }
              />
            )
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="cmm-text-caption max-w-md text-slate-500">
          Vos préférences restent modifiables à tout moment dans les paramètres de votre compte.
        </p>
        <CmmButton type="submit" tone="primary" size="md" disabled={!canSubmit} loading={isSaving}>
          {isSaving ? "Enregistrement..." : "Valider et continuer"}
        </CmmButton>
      </div>
    </form>
  );
}
