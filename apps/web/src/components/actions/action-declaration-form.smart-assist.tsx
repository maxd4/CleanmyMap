import type { Dispatch, SetStateAction } from"react";
import { useMemo, useState } from"react";
import { estimateWasteKg } from"./action-declaration-form.estimation";
import type { ActionVisionEstimate } from"@/lib/actions/types";
import type { FormState } from"./action-declaration-form.model";
import {
 resolveWasteSuggestion,
} from"./action-declaration-form.vision-suggestion";

type SetFormState = Dispatch<SetStateAction<FormState>>;

export type GpsStatus ="idle" |"locating" |"success" |"error";

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
 if (typeof navigator ==="undefined" || !navigator.geolocation) {
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
 <div className="flex items-center gap-2">
 <button
 type="button"
 className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 cmm-text-small font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
 onClick={onAutofillGps}
 disabled={gpsStatus ==="locating"}
 >
 {gpsStatus ==="locating" ?"Recherche..." :"Ma position"}
 </button>
 {gpsMessage && (
 <span
 className={`cmm-text-caption ${
 gpsStatus ==="error"
 ?"text-rose-700"
 : gpsStatus ==="success"
 ?"text-emerald-700"
 :"cmm-text-muted"
 }`}
 >
 {gpsMessage}
 </span>
 )}
 </div>
 );
}

export function ActionDeclarationWasteAssist({
 estimatedWasteKg,
 estimatedWasteKgInterval,
 suggestionLabel ="Suggestion",
}: {
 estimatedWasteKg: number;
 estimatedWasteKgInterval: [number, number] | null;
 suggestionLabel?: string;
}) {
 return (
 <div className="rounded-lg bg-slate-100 px-3 py-2 cmm-text-caption cmm-text-secondary">
 <span className="font-semibold">{suggestionLabel}:</span> {estimatedWasteKg.toFixed(1)} kg
 {estimatedWasteKgInterval && (
 <span className="ml-1 cmm-text-muted">
 ({estimatedWasteKgInterval[0].toFixed(1)}-{estimatedWasteKgInterval[1].toFixed(1)})
 </span>
 )}
 </div>
 );
}
