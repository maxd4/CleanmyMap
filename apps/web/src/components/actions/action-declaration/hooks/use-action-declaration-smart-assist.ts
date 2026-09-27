import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { ActionVisionEstimate } from "@/lib/actions/types";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import type { FormState } from "../model";
import { estimateWasteKg } from "../utils/action-declaration-form.estimation";
import { resolveWasteSuggestion } from "../utils/action-declaration-form.vision-suggestion";

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
      }),
    [form.durationMinutes, form.placeType, form.volunteersCount],
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
    if (!canRequestGeolocation()) {
      setGpsStatus("error");
      setGpsMessage("La geolocalisation est bloquee sur cette page.");
      return;
    }
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
    heuristicEstimatedWasteKg: fallbackEstimatedWasteKg,
    estimatedWasteKg,
    estimatedWasteKgInterval,
    estimatedWasteKgConfidence,
    wasteSuggestionSource,
    visionEstimate,
    autofillGps,
  };
}
