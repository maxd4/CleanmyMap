"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  PARIS_ARRONDISSEMENTS,
  getParisArrondissementLabel,
  parseParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import {
  extractUserLocationPreferenceFromMetadata,
  type UserLocationType,
} from "@/lib/user-location-preference";

type UserLocationOnboardingFormProps = {
  nextPath: string;
};

export function UserLocationOnboardingForm({
  nextPath,
}: UserLocationOnboardingFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const currentPreference = extractUserLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
  const [locationType, setLocationType] = useState<UserLocationType>(
    currentPreference?.locationType ?? "residence",
  );
  const [arrondissement, setArrondissement] = useState<number>(
    currentPreference?.arrondissement ?? 0,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedArrondissement = parseParisArrondissement(arrondissement);
    if (!parsedArrondissement) {
      setErrorMessage("Selectionnez un arrondissement parisien.");
      return;
    }
    if (!user) {
      setErrorMessage("Compte introuvable, reconnectez-vous.");
      return;
    }

    try {
      setIsSaving(true);
      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata ?? {}),
          parisArrondissement: parsedArrondissement,
          parisLocationType: locationType,
        },
      });
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      console.error("User location preference update failed", error);
      setErrorMessage("Impossible d'enregistrer le lieu. Reessayez.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Chargement du compte...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Votre zone prioritaire a Paris
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Indiquez votre lieu principal pour prioriser les associations et
          commercants proches dans les rubriques.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">
          Ce lieu correspond a :
        </legend>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="locationType"
            value="residence"
            checked={locationType === "residence"}
            onChange={() => setLocationType("residence")}
          />
          Mon arrondissement de residence
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="locationType"
            value="work"
            checked={locationType === "work"}
            onChange={() => setLocationType("work")}
          />
          Mon arrondissement de travail
        </label>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">
          Arrondissement
        </span>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          value={arrondissement}
          onChange={(event) => setArrondissement(Number(event.target.value))}
        >
          <option value={0}>Selectionner un arrondissement</option>
          {PARIS_ARRONDISSEMENTS.map((item) => (
            <option key={item.value} value={item.value}>
              {getParisArrondissementLabel(item.value)}
            </option>
          ))}
        </select>
      </label>

      {errorMessage ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isSaving ? "Enregistrement..." : "Valider et continuer"}
      </button>
    </form>
  );
}
