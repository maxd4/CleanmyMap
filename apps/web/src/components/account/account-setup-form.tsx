"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { parseParisArrondissement } from "@/lib/geo/paris-arrondissements";
import { GreaterParisSelect } from "@/lib/geo/greater-paris-select";
import {
  createGreaterParisMetadata,
  createGreaterParisMetadataFromZoneName,
  extractGreaterParisLocationPreferenceFromMetadata,
} from "@/lib/user-location-preference";
import { getProfileLabel, getSwitchableProfiles, type AppProfile } from "@/lib/profiles";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { defaultMessageForKind, isAppError, toAppError, type AppError } from "@/lib/errors/app-errors";

type AccountSetupFormProps = {
  nextPath: string;
  initialProfile: AppProfile;
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
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
  initialArrondissement = null,
  initialLocationType = null,
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
  const [arrondissement, setArrondissement] = useState<number>(
    initialArrondissement ?? 0,
  );
  const [selectedZone, setSelectedZone] = useState<string>(
    initialArrondissement
      ? `${initialArrondissement}e arrondissement`
      : "",
  );
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [acceptExhaustiveMode, setAcceptExhaustiveMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const isProfileValid =
    profileOptions.includes(selectedProfile) || selectedProfile === initialProfile;
  const zoneIsValid = Boolean(
    selectedZone || parseParisArrondissement(arrondissement),
  );
  const profileError = !isProfileValid
    ? "Sélectionnez un rôle valide."
    : null;
  const zoneError = !zoneIsValid
    ? "Sélectionnez une zone (arrondissement ou commune)."
    : null;
  const displayModeError = acceptExhaustiveMode
    ? null
    : "Confirmez le mode exhaustif pour continuer.";
  const canSubmit = !profileError && !zoneError && !displayModeError && !isSaving;
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
    if (!zoneIsValid) {
      setError(
        toAppError("Sélectionnez une zone (arrondissement ou commune).", {
          kind: "validation",
          message: "Sélectionnez une zone (arrondissement ou commune).",
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

    try {
      setIsSaving(true);
      if (selectedProfile !== initialProfile) {
        await updateProfileRole(selectedProfile);
      }

      setLocale(selectedLocale);
      setDisplayMode("exhaustif");

      const existingPref = extractGreaterParisLocationPreferenceFromMetadata(
        user.unsafeMetadata as Record<string, unknown> | undefined,
      );

      const metadata: Record<string, unknown> = {
        ...(user.unsafeMetadata ?? {}),
        profileSetupCompleted: true,
      };

      const parsedArr = parseParisArrondissement(arrondissement);
      const zoneMetadata =
        selectedZone && existingPref
          ? createGreaterParisMetadata(
              selectedZone,
              existingPref.department,
              existingPref.areaType,
              locationType,
            )
          : selectedZone
          ? createGreaterParisMetadataFromZoneName(selectedZone, locationType)
          : null;

      if (zoneMetadata) {
        Object.assign(metadata, zoneMetadata);
      } else if (parsedArr) {
        metadata["parisArrondissement"] = parsedArr;
        metadata["parisLocationType"] = locationType;
      } else {
        setError(
          toAppError("Sélectionnez une zone (arrondissement ou commune).", {
            kind: "validation",
            message: "Sélectionnez une zone (arrondissement ou commune).",
          }),
        );
        return;
      }

      await user.update({ unsafeMetadata: metadata });

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      console.error("Account setup update failed", error);
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
    return (
      <div className="rounded-2xl border border-indigo-200/60 bg-white/82 p-6 shadow-sm backdrop-blur-xl">
        <p className="cmm-text-small cmm-text-secondary">Chargement du compte...</p>
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
      className="space-y-5 rounded-[1.75rem] border border-indigo-200/60 bg-white/90 p-6 shadow-[0_18px_50px_-40px_rgba(79,70,229,0.35)] backdrop-blur-xl"
    >
      <div className="space-y-2">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-indigo-700">
          Configuration initiale
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">
          Finalisez votre compte
        </h1>
        <p className="cmm-text-small cmm-text-secondary">
          Choisissez votre rôle, votre lieu principal, votre langue et votre mode
          d&apos;affichage. Ces réglages restent modifiables plus tard dans
          &quot;Réglages&quot; du ruban.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block space-y-2">
          <span className="cmm-text-small font-medium cmm-text-primary">Rôle</span>
          <select
            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-indigo-500 focus:outline-none"
            value={selectedProfile}
            onChange={(event) =>
              setSelectedProfile(event.target.value as AppProfile)
            }
          >
            {profileOptions.map((profile) => (
              <option key={profile} value={profile}>
                {getProfileLabel(profile, selectedLocale)}
              </option>
            ))}
          </select>
          {profileError ? <InlineFieldError message={profileError} /> : null}
        </label>

        <label className="block space-y-2">
          <span className="cmm-text-small font-medium cmm-text-primary">
            Langue
          </span>
          <select
            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-indigo-500 focus:outline-none"
            value={selectedLocale}
            onChange={(event) =>
              setSelectedLocale(event.target.value === "en" ? "en" : "fr")
            }
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>

        <fieldset className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 lg:col-span-2">
          <legend className="cmm-text-small font-medium cmm-text-primary">
            Mode d&apos;affichage
          </legend>
          <label className="flex items-start gap-3 rounded-2xl border border-indigo-200/60 bg-white/85 p-4">
            <input
              type="checkbox"
              checked={acceptExhaustiveMode}
              onChange={(event) => setAcceptExhaustiveMode(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="block">
              <span className="block cmm-text-small font-medium cmm-text-primary">
                {selectedLocale === "fr" ? "Mode Exhaustif" : "Exhaustive mode"}
              </span>
              <span className="mt-1 block cmm-text-small cmm-text-secondary">
                {selectedLocale === "fr"
                  ? "Les modes Sobre et Minimaliste sont en préparation."
                  : "Calm and Minimalist modes are still in preparation."}
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-indigo-100 bg-white/70 p-4">
          <legend className="cmm-text-small font-medium cmm-text-primary">
            Lieu principal
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 cmm-text-small cmm-text-secondary">
              <input
                type="radio"
                name="locationType"
                value="residence"
                checked={locationType === "residence"}
                onChange={() => setLocationType("residence")}
              />
              Résidence
            </label>
            <label className="flex items-center gap-2 cmm-text-small cmm-text-secondary">
              <input
                type="radio"
                name="locationType"
                value="work"
                checked={locationType === "work"}
                onChange={() => setLocationType("work")}
              />
              Travail
            </label>
          </div>

          <label className="block space-y-2">
            <span className="cmm-text-small font-medium cmm-text-primary">
              Zone (arrondissement ou commune)
            </span>
          <GreaterParisSelect
            value={selectedZone || (arrondissement ? `${arrondissement}e arrondissement` : "")}
            onChange={(value) => {
              const nextZone = value.trim();
              setSelectedZone(nextZone);
              const arrNum = parseInt(nextZone.replace(/er|e|ème|eme/g, "").replace("arrondissement", "").trim(), 10);
              if (!isNaN(arrNum) && arrNum >= 1 && arrNum <= 20) {
                setArrondissement(arrNum);
              } else {
                setArrondissement(0);
              }
            }}
            placeholder="Sélectionnez une zone..."
          />
          {zoneError ? <InlineFieldError message={zoneError} /> : null}
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
                className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
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
          className="inline-flex items-center rounded-xl border border-[color:var(--cmm-button-primary-border)] bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-start)_0%,var(--cmm-button-primary-bg-end)_100%)] px-5 py-3 cmm-text-small font-semibold text-[color:var(--cmm-button-primary-text)] hover:border-[color:var(--cmm-button-primary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-hover-start)_0%,var(--cmm-button-primary-bg-hover-end)_100%)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSaving ? "Enregistrement..." : "Valider et continuer"}
        </button>
        <p className="cmm-text-caption cmm-text-muted">
          Les modifications restent accessibles plus tard dans le ruban.
        </p>
      </div>
    </form>
  );
}
