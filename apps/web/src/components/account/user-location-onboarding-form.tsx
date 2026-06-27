"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ui/error-message";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import {
  defaultMessageForKind,
  isAppError,
  toAppError,
  type AppError,
} from "@/lib/errors/app-errors";
import { logFailure } from "@/lib/logging/failure-log";
import {
  GreaterParisSelect,
  type TerritoryLocationSelection,
} from "@/lib/geo/greater-paris-select";
import {
  createTerritoryLocationMetadata,
  extractTerritoryLocationPreferenceFromMetadata,
  extractUserLocationPreferenceFromMetadata,
  type UserLocationType,
} from "@/lib/user-location-preference";

type UserLocationOnboardingFormProps = {
  nextPath: string;
};

function createInitialTerritorySelection(
  arrondissement: number | null | undefined,
): TerritoryLocationSelection | null {
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

export function UserLocationOnboardingForm({
  nextPath,
}: UserLocationOnboardingFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const currentPreference = extractUserLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
  const territoryPreference = extractTerritoryLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
  const [locationType, setLocationType] = useState<UserLocationType>(
    territoryPreference?.locationType ?? currentPreference?.locationType ?? "residence",
  );
  const [territorySelection, setTerritorySelection] =
    useState<TerritoryLocationSelection | null>(
      territoryPreference ??
        createInitialTerritorySelection(currentPreference?.arrondissement ?? null),
    );
  const hasHydratedTerritorySelection = useRef(
    Boolean(territoryPreference || currentPreference?.arrondissement),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const territoryIsValid =
    Boolean(territorySelection?.label.trim()) &&
    (territorySelection?.level !== "arrondissement" ||
      territorySelection.arrondissement != null);

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
      setLocationType(existingSelection.locationType);
    }
    hasHydratedTerritorySelection.current = true;
  }, [isLoaded, territorySelection, user]);

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

    if (!territoryIsValid || !territorySelection) {
      setError(
        toAppError(
          "Sélectionnez un territoire (pays, région, département, commune ou arrondissement).",
          {
            kind: "validation",
            message:
              "Sélectionnez un territoire (pays, région, département, commune ou arrondissement).",
          },
        ),
      );
      return;
    }

    const metadata: Record<string, unknown> = {
      ...(user.unsafeMetadata ?? {}),
    };

    Object.assign(
      metadata,
      createTerritoryLocationMetadata(territorySelection, locationType),
    );

    try {
      setIsSaving(true);
      await user.update({ unsafeMetadata: metadata });
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      logFailure("UserLocation", "Preference update failed", error, {
        nextPath,
      });
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: "Impossible d'enregistrer le lieu. Réessayez.",
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="cmm-text-small cmm-text-secondary">Chargement du compte...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <PermissionErrorState
        title="Connexion requise"
        message="Reconnectez-vous pour définir votre zone prioritaire."
      />
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-lg font-semibold cmm-text-primary">
          Votre territoire prioritaire
        </h1>
        <p className="mt-2 cmm-text-small cmm-text-secondary">
          Indiquez votre lieu principal pour prioriser les associations et les
          commerçant·e·s proches dans les rubriques.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="cmm-text-small font-medium cmm-text-primary">
          Ce territoire correspond à :
        </legend>
        <label className="flex items-center gap-2 cmm-text-small cmm-text-secondary">
          <input
            type="radio"
            name="locationType"
            value="residence"
            checked={locationType === "residence"}
            onChange={() => setLocationType("residence")}
          />
          Ma zone de résidence
        </label>
        <label className="flex items-center gap-2 cmm-text-small cmm-text-secondary">
          <input
            type="radio"
            name="locationType"
            value="work"
            checked={locationType === "work"}
            onChange={() => setLocationType("work")}
          />
          Ma zone de travail
        </label>
      </fieldset>

      <label className="block space-y-2">
        <span className="cmm-text-small font-medium cmm-text-primary">
          Pays, région, département, commune ou arrondissement
        </span>
        <GreaterParisSelect
          value={territorySelection}
          onChange={setTerritorySelection}
          placeholder="Rechercher un territoire..."
        />
        {!territoryIsValid ? (
          <InlineFieldError message="Sélectionnez un territoire (pays, région, département, commune ou arrondissement)." />
        ) : null}
      </label>

      {error ? (
        error.kind === "permission" ? (
          <PermissionErrorState title="Connexion requise" message={error.message} />
        ) : (
          <ErrorMessage
            kind={error.kind}
            title="Le lieu n'a pas pu être enregistré"
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

      <button
        type="submit"
        disabled={isSaving || !territoryIsValid}
        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 cmm-text-small font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isSaving ? "Enregistrement..." : "Valider et continuer"}
      </button>
    </form>
  );
}
