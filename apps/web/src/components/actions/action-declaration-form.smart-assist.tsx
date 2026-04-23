import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { estimateWasteKg } from "./action-declaration-form.estimation";
import type { ActionVisionEstimate } from "@/lib/actions/types";
import type { FormState } from "./action-declaration-form.model";
import { getWasteWeightSuspicion } from "./action-declaration-form.suspicion";
import {
  resolveWasteSuggestion,
  type WasteSuggestionSource,
} from "./action-declaration-form.vision-suggestion";

type SetFormState = Dispatch<SetStateAction<FormState>>;

export type GpsStatus = "idle" | "locating" | "success" | "error";

type UseSmartAssistParams = {
  form: FormState;
  setForm: SetFormState;
  visionEstimate: ActionVisionEstimate | null;
};

export function useActionDeclarationSmartAssist({
  form,
  setForm,
  visionEstimate,
}: UseSmartAssistParams) {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const fallbackEstimatedWasteKg = useMemo(
    () =>
      estimateWasteKg({
        volunteersCount: form.volunteersCount,
        durationMinutes: form.durationMinutes,
        placeType: form.placeType,
        wasteMegotsKg: form.wasteMegotsKg,
      }),
    [
      form.durationMinutes,
      form.placeType,
      form.volunteersCount,
      form.wasteMegotsKg,
    ],
  );
  const wasteSuggestion = resolveWasteSuggestion({
    heuristicEstimateKg: fallbackEstimatedWasteKg,
    visionEstimate,
  });
  const estimatedWasteKg = wasteSuggestion.estimatedWasteKg;
  const estimatedWasteKgInterval = wasteSuggestion.estimatedWasteKgInterval;
  const estimatedWasteKgConfidence = wasteSuggestion.estimatedWasteKgConfidence;
  const wasteSuggestionSource = wasteSuggestion.source;

  function autofillGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("error");
      setGpsMessage("Geolocalisation non disponible sur cet appareil.");
      return;
    }
    setGpsStatus("locating");
    setGpsMessage("Recherche de votre position en cours...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setForm((prev) => ({
          ...prev,
          latitude: String(latitude),
          longitude: String(longitude),
          locationLabel:
            prev.locationLabel.trim().length > 0
              ? prev.locationLabel
              : `Position GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
        }));
        setGpsStatus("success");
        setGpsMessage("Coordonnees GPS pre-remplies.");
      },
      (error) => {
        setGpsStatus("error");
        if (error.code === error.PERMISSION_DENIED) {
          setGpsMessage("Autorisez la geolocalisation pour pre-remplir le GPS.");
          return;
        }
        setGpsMessage("Impossible de recuperer votre position GPS.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 120000,
      },
    );
  }

  return {
    gpsStatus,
    gpsMessage,
    estimatedWasteKg,
    estimatedWasteKgInterval,
    estimatedWasteKgConfidence,
    wasteSuggestionSource,
    visionEstimate,
    autofillGps,
  };
}

export function ActionDeclarationLocationAssist({
  gpsStatus,
  gpsMessage,
  onAutofillGps,
}: {
  gpsStatus: GpsStatus;
  gpsMessage: string | null;
  onAutofillGps: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onAutofillGps}
        disabled={gpsStatus === "locating"}
      >
        {gpsStatus === "locating"
          ? "Recherche..."
          : "Utiliser ma position"}
      </button>
      <span
        className={`text-xs ${
          gpsStatus === "error"
            ? "text-rose-700"
            : gpsStatus === "success"
              ? "text-emerald-700"
              : "text-slate-500"
        }`}
      >
        {gpsMessage ?? "Aide utile pour pre-remplir le depart."}
      </span>
    </div>
  );
}

export function ActionDeclarationWasteAssist({
  estimatedWasteKg,
  estimatedWasteKgInterval,
  estimatedWasteKgConfidence,
  wasteSuggestionSource,
  currentWasteKg,
  visionEstimate,
  suggestionLabel = "Valeur conseillée",
}: {
  estimatedWasteKg: number;
  estimatedWasteKgInterval: [number, number] | null;
  estimatedWasteKgConfidence: number | null;
  wasteSuggestionSource: WasteSuggestionSource;
  currentWasteKg?: string;
  visionEstimate?: ActionVisionEstimate | null;
  suggestionLabel?: string;
}) {
  const suspicion = getWasteWeightSuspicion(
    currentWasteKg ?? "",
    visionEstimate ?? null,
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold uppercase tracking-wide text-slate-500">
          {suggestionLabel}
        </p>
        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          {wasteSuggestionSource === "vision"
            ? "Source vision"
            : "Fallback heuristique"}
        </span>
        {suspicion.isSuspect ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
            Écart suspect
          </span>
        ) : null}
      </div>
      <p className="mt-1">
        {estimatedWasteKg.toFixed(1)} kg
        {estimatedWasteKgInterval ? (
          <>
            {" "}
            ({estimatedWasteKgInterval[0].toFixed(1)} -{" "}
            {estimatedWasteKgInterval[1].toFixed(1)} kg)
          </>
        ) : null}
        {estimatedWasteKgConfidence !== null ? (
          <> - confiance {(estimatedWasteKgConfidence * 100).toFixed(0)} %</>
        ) : null}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">
        La valeur reste a saisir et corriger a la main.
      </p>
      {suspicion.message ? (
        <p className="mt-1 text-[10px] font-semibold text-amber-700">
          {suspicion.message}
        </p>
      ) : null}
    </div>
  );
}
