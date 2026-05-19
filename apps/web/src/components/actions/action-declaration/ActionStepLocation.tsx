"use client";

import { MapPin, Navigation, Crosshair, CheckCircle2, AlertCircle, Loader2, MapPinOff, Pencil, X } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { FormState } from "../action-declaration-form.model";
import type { ActionDrawing } from "@/lib/actions/types";
import type { UpdateFormField } from "./types";
import {
  formatGeometryPointCount,
  summarizeActionDrawingValidation,
} from "../map/actions-map-geometry.utils";

const ActionDrawingMap = dynamic(
  () => import("@/components/actions/action-drawing-map").then((mod) => mod.ActionDrawingMap),
  { ssr: false }
);

interface ActionStepLocationProps {
  form: FormState;
  updateField: UpdateFormField;
  recordType: FormState["recordType"];
  manualDrawing: ActionDrawing | null;
  setManualDrawing: (drawing: ActionDrawing | null) => void;
  routePreviewDrawing: ActionDrawing | null;
  onResetManualDrawing?: () => void;
  gpsStatus: "idle" | "locating" | "success" | "error";
  gpsMessage: string | null;
  onAutofillGps: () => void;
}

// ─── GPS button ───────────────────────────────────────────────────────────────

function GpsButton({
  status,
  message,
  onAutofill,
}: {
  status: ActionStepLocationProps["gpsStatus"];
  message: string | null;
  onAutofill: () => void;
}) {
  const isLocating = status === "locating";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onAutofill}
        disabled={isLocating}
        aria-label="Utiliser ma géolocalisation"
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30",
          isSuccess
            ? "border-emerald-300 bg-[#ECF8EF] text-emerald-800 hover:bg-[#E0F4E6]"
            : isError
              ? "border-rose-200 bg-[#FFF7F8] text-rose-700 hover:bg-[#FFEFF2]"
              : "border-sky-200 bg-[#EFFAF3] text-sky-800 hover:bg-[#EAF7EF] active:scale-[0.98]",
          isLocating && "cursor-not-allowed opacity-70"
        )}
      >
        {isLocating ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isSuccess ? (
          <CheckCircle2 size={16} />
        ) : isError ? (
          <AlertCircle size={16} />
        ) : (
          <Crosshair size={16} />
        )}
        {isLocating
          ? "Localisation en cours…"
          : isSuccess
            ? "Position détectée"
            : isError
              ? "Réessayer la géolocalisation"
              : "Utiliser ma position GPS"}
      </button>

      {message && (
        <p className={cn(
          "text-xs px-1",
          isError ? "text-rose-600" : "text-emerald-900/45"
        )}>
          {isError && "⚠ "}{message}
        </p>
      )}
      {isError && !message && (
        <p className="text-xs text-rose-500 px-1">
          Accès à la position refusé. Activez la géolocalisation dans les paramètres du navigateur.
        </p>
      )}
    </div>
  );
}

// ─── Address input ────────────────────────────────────────────────────────────

function AddressInput({
  id,
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  optional,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-900/55">
        {label}
        {optional && (
          <span className="rounded-full bg-[#ECF8EF] px-1.5 py-0.5 text-[10px] text-emerald-900/45">
            optionnel
          </span>
        )}
      </span>
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-900/30">
          <Icon size={15} />
        </div>
        <input
          id={id}
          type="text"
          placeholder={placeholder}
          className="w-full h-11 pl-9 pr-4 rounded-xl border border-emerald-200/70 bg-[#F3FBF6] text-sm font-medium text-emerald-950 placeholder:text-emerald-700/35 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn("h-1 w-5 rounded-full", color)} />
      <h3 className="text-xs font-bold text-emerald-900/60 uppercase tracking-[0.18em]">{children}</h3>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ActionStepLocation({
  form,
  updateField,
  recordType,
  manualDrawing,
  setManualDrawing,
  routePreviewDrawing,
  onResetManualDrawing,
  gpsStatus,
  gpsMessage,
  onAutofillGps,
}: ActionStepLocationProps) {
  const isCleanPlaceMode = recordType === "clean_place";

  const manualSummary = summarizeActionDrawingValidation(manualDrawing);
  const previewSummary = summarizeActionDrawingValidation(routePreviewDrawing);
  const displayedDrawing = manualSummary.normalized ?? previewSummary.normalized;
  const activeSummary = manualSummary.normalized ? manualSummary : previewSummary;
  const isManual = Boolean(manualSummary.normalized);
  const hasDrawing = Boolean(displayedDrawing);

  const statusTone = isManual
    ? manualSummary.tone
    : hasDrawing
      ? previewSummary.tone
      : "neutral";

  const statusStyles = {
    success: "border-emerald-200/70 bg-[#ECF8EF] text-emerald-700",
    warning: "border-amber-200 bg-[#FFF8E8] text-amber-700",
    error: "border-rose-200 bg-[#FFF7F8] text-rose-700",
    neutral: "border-emerald-200/70 bg-[#F3FBF6] text-emerald-800/70",
  } as const;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Ligne 1 : Adresses + GPS + localisation ─────────────────────── */}
      <div className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] space-y-4">
        <SectionTitle color="bg-sky-500">
          {isCleanPlaceMode ? "Géolocalisation du lieu" : "Localisation de collecte"}
        </SectionTitle>

        <p className="text-xs text-emerald-900/45 -mt-2">
          {isCleanPlaceMode
            ? "Indiquez l'adresse du lieu propre ou utilisez votre position GPS."
            : "Indiquez l'adresse du lieu ou utilisez votre position GPS."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AddressInput
            id="departure"
            icon={MapPin}
            label={isCleanPlaceMode ? "Adresse du lieu" : "Départ"}
            placeholder={isCleanPlaceMode ? "Ex : Square des Batignolles" : "Ex : Rue de Rivoli, Paris"}
            value={form.departureLocationLabel}
            onChange={(v) => updateField("departureLocationLabel", v)}
          />
          <AddressInput
            id="arrival"
            icon={Navigation}
            label={isCleanPlaceMode ? "Complément" : "Arrivée"}
            placeholder={isCleanPlaceMode ? "Précision (optionnel)" : "Ex : Place de la République"}
            value={form.arrivalLocationLabel}
            onChange={(v) => updateField("arrivalLocationLabel", v)}
            optional
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <GpsButton status={gpsStatus} message={gpsMessage} onAutofill={onAutofillGps} />

          {!isCleanPlaceMode && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3">
              <div>
                <p className="text-xs font-medium text-emerald-700">Souple par défaut</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-900">Réglage appliqué</p>
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Actif
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Ligne 2a : Carte (desktop/tablette uniquement) ───────────────── */}
      <div className="hidden md:block rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle color="bg-slate-700">
            {isCleanPlaceMode ? "Point géographique" : "Aperçu de localisation"}
          </SectionTitle>
          <p className="text-[10px] text-emerald-900/45">
            {isCleanPlaceMode
              ? "Situez le lieu sur la carte"
              : "Situez le lieu sur la carte ou renseignez une adresse"}
          </p>
        </div>

        {/* Carte */}
        <div className="relative h-[420px] rounded-xl overflow-hidden border border-emerald-200/70 bg-[#EFFAF3]">
          <ActionDrawingMap
            drawing={displayedDrawing}
            onDrawingChange={setManualDrawing}
            readOnly={false}
            isCleanPlace={isCleanPlaceMode}
          />

          {/* Overlay si aucun repère */}
          {!hasDrawing && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F3FBF6]/72 backdrop-blur-[2px]">
              <div className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-5 py-4 text-center shadow-sm">
                <Pencil size={20} className="mx-auto mb-2 text-emerald-700/45" />
                <p className="text-sm font-semibold text-emerald-950">Aucun repère</p>
                <p className="mt-1 text-xs text-emerald-900/45">
                  Saisissez une adresse ou utilisez le GPS pour placer le lieu
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Résumé localisation */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-[#ECF8EF] px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold",
              statusStyles[statusTone]
            )}>
              {isManual ? "Repère manuel" : hasDrawing ? "Aperçu automatique" : "Aucun repère"}
            </span>
            {hasDrawing && (
              <span className="text-xs text-emerald-900/55">
                {formatGeometryPointCount(activeSummary.pointCount)}
              </span>
            )}
          </div>

          {isManual && onResetManualDrawing && (
            <button
              type="button"
              onClick={onResetManualDrawing}
              aria-label="Effacer le repère manuel"
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-[#FFF7F8] px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-[#FFEFF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30"
            >
              <X size={13} />
              Effacer
            </button>
          )}

          {!hasDrawing && (
            <span className="text-xs text-emerald-900/45">
              Saisissez un lieu, utilisez le GPS ou placez un repère sur la carte
            </span>
          )}
        </div>
      </div>

      {/* ── Ligne 2b : Zone texte mobile (remplace la carte) ────────────── */}
      <div className="md:hidden rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] space-y-3">
        <div className="flex items-center gap-2">
          <MapPinOff size={15} className="text-emerald-700/45" />
          <SectionTitle color="bg-emerald-500">Précisions de localisation</SectionTitle>
        </div>
        <p className="text-xs text-emerald-900/45 -mt-2">
          Décrivez les rues ou zones concernées. Un admin pourra compléter la localisation depuis ces informations.
        </p>
        <textarea
          rows={5}
          placeholder="Ex : Départ rue de Rivoli, passage par les quais, retour par le boulevard Saint-Germain…"
          className="w-full rounded-xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950 placeholder:text-emerald-700/35 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 resize-none"
          value={form.routeAdjustmentMessage}
          onChange={(e) => updateField("routeAdjustmentMessage", e.target.value)}
        />
      </div>

      {/* ── Précisions localisation (desktop aussi) ─────────────────────── */}
      <div className="hidden md:block rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] space-y-3">
        <SectionTitle color="bg-emerald-500">Précisions de localisation</SectionTitle>
        <p className="text-xs text-emerald-900/45 -mt-2">
          Optionnel — décrivez les rues ou zones si la localisation est imprécise.
        </p>
        <textarea
          rows={3}
          placeholder="Ex : Départ rue de Rivoli, passage par les quais, retour par le boulevard Saint-Germain…"
          className="w-full rounded-xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950 placeholder:text-emerald-700/35 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 resize-none"
          value={form.routeAdjustmentMessage}
          onChange={(e) => updateField("routeAdjustmentMessage", e.target.value)}
        />
      </div>

    </div>
  );
}
