import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { estimateWasteKg } from "./action-declaration-form.estimation";
import type { FormState } from "./action-declaration-form.model";
import { toRequiredNumber } from "./action-declaration-form.model";

type SetFormState = Dispatch<SetStateAction<FormState>>;

export type GpsStatus = "idle" | "locating" | "success" | "error";

type UseSmartAssistParams = {
  form: FormState;
  setForm: SetFormState;
  prefillApplied: boolean;
  isWasteManuallyEdited: boolean;
  hasAppliedInitialEstimate: boolean;
  setHasAppliedInitialEstimate: Dispatch<SetStateAction<boolean>>;
};

export function useActionDeclarationSmartAssist({
  form,
  setForm,
  prefillApplied,
  isWasteManuallyEdited,
  hasAppliedInitialEstimate,
  setHasAppliedInitialEstimate,
}: UseSmartAssistParams) {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const estimatedWasteKg = useMemo(
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

  function applyEstimatedWaste() {
    setForm((prev) => ({ ...prev, wasteKg: estimatedWasteKg.toFixed(1) }));
  }

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

  useEffect(() => {
    if (!prefillApplied || hasAppliedInitialEstimate || isWasteManuallyEdited) {
      return;
    }
    const currentWaste = toRequiredNumber(form.wasteKg, 0);
    if (currentWaste > 0) {
      setHasAppliedInitialEstimate(true);
      return;
    }
    setForm((prev) => ({ ...prev, wasteKg: estimatedWasteKg.toFixed(1) }));
    setHasAppliedInitialEstimate(true);
  }, [
    estimatedWasteKg,
    form.wasteKg,
    hasAppliedInitialEstimate,
    isWasteManuallyEdited,
    prefillApplied,
    setForm,
    setHasAppliedInitialEstimate,
  ]);

  return {
    gpsStatus,
    gpsMessage,
    estimatedWasteKg,
    applyEstimatedWaste,
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
          ? "Geolocalisation..."
          : "Utiliser ma position GPS"}
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
        {gpsMessage ?? "Option recommandee pour fiabiliser la localisation."}
      </span>
    </div>
  );
}

export function ActionDeclarationWasteAssist({
  estimatedWasteKg,
  onApplyEstimatedWaste,
}: {
  estimatedWasteKg: number;
  onApplyEstimatedWaste: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        onClick={onApplyEstimatedWaste}
      >
        Estimer automatiquement
      </button>
      <span className="text-xs text-slate-500">
        Estimation actuelle: {estimatedWasteKg.toFixed(1)} kg
      </span>
    </div>
  );
}
