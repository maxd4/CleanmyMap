"use client";


import { MapPin, Navigation, Route, Map as MapIcon, Crosshair, HelpCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
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
  manualDrawing: ActionDrawing | null;
  setManualDrawing: (drawing: ActionDrawing | null) => void;
  routePreviewDrawing: ActionDrawing | null;
  onResetManualDrawing?: () => void;
  gpsStatus: "idle" | "locating" | "success" | "error";
  gpsMessage: string | null;
  onAutofillGps: () => void;
}

export function ActionStepLocation({
  form,
  updateField,
  manualDrawing,
  setManualDrawing,
  routePreviewDrawing,
  onResetManualDrawing,
  gpsStatus,
  gpsMessage,
  onAutofillGps,
}: ActionStepLocationProps) {
  const manualDrawingSummary = summarizeActionDrawingValidation(manualDrawing);
  const routePreviewSummary = summarizeActionDrawingValidation(routePreviewDrawing);
  const displayedDrawing =
    manualDrawingSummary.normalized ?? routePreviewSummary.normalized;
  const displayedDrawingSummary = manualDrawingSummary.normalized
    ? manualDrawingSummary
    : routePreviewSummary;
  const isUsingManualDrawing = Boolean(manualDrawingSummary.normalized);
  const statusStyles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100",
    error:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100",
    neutral:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200",
  } as const;

  const statusLabel = isUsingManualDrawing
    ? "Tracé manuel validé"
    : displayedDrawing
      ? "Aperçu automatique"
      : "Aucun tracé";
  const statusMessage = isUsingManualDrawing
    ? manualDrawingSummary.message
    : displayedDrawing
      ? `${routePreviewSummary.message} Dessine un tracé manuel pour verrouiller la zone.`
      : "Ajoute un départ ou un tracé pour obtenir un aperçu plus précis.";
  const statusTone = isUsingManualDrawing
    ? manualDrawingSummary.tone
    : displayedDrawing
      ? routePreviewSummary.tone
      : "neutral";
  const pointCountLabel = displayedDrawing
    ? formatGeometryPointCount(displayedDrawingSummary.pointCount)
    : "Aucun point";

  
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Address Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.5)]" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Itinéraire de collecte</h3>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-sky-500">
                <MapPin size={20} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                placeholder="Départ (ex: Rue de Rivoli)"
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold text-slate-900"
                value={form.departureLocationLabel}
                onChange={(e) => updateField("departureLocationLabel", e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                <Navigation size={20} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                placeholder="Arrivée (laissez vide si identique au départ)"
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold text-slate-900"
                value={form.arrivalLocationLabel}
                onChange={(e) => updateField("arrivalLocationLabel", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <CmmButton 
                tone={gpsStatus === "success" ? "primary" : "secondary"} 
                variant="default" 
                size="sm" 
                className="h-12 rounded-xl flex-1 font-black uppercase tracking-widest text-[10px]"
                onClick={onAutofillGps}
              >
                <Crosshair size={14} className={cn("mr-2", gpsStatus === "locating" && "animate-spin")} />
                {gpsStatus === "locating" ? "Localisation..." : "Utiliser ma géolocalisation"}
              </CmmButton>
              
              <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-slate-100 border border-slate-200">
                <Route size={14} className="text-slate-400" />
                <select 
                  className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-700"
                  value={form.routeStyle}
                  onChange={(e) =>
                    updateField("routeStyle", e.target.value as FormState["routeStyle"])
                  }
                >
                  <option value="direct">Direct</option>
                  <option value="flexible">Souple</option>
                </select>
              </div>
            </div>
            
            {gpsMessage && (
              <p className="px-4 text-[10px] font-bold text-sky-700 italic">
                * {gpsMessage}
              </p>
            )}
          </div>
        </div>

        {/* 2. Interactive Map */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-8 rounded-full bg-slate-900 shadow-[0_0_12px_rgba(15,23,42,0.3)]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Tracé Géographique</h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 tracking-widest uppercase">
              <HelpCircle size={12} />
              Dessinez votre parcours sur la carte Paris + proche banlieue
            </div>
          </div>

          <div className="relative h-[340px] rounded-[2.5rem] bg-slate-100 border border-slate-200 overflow-hidden shadow-inner group">
            <ActionDrawingMap
              drawing={displayedDrawing}
              onDrawingChange={setManualDrawing}
              readOnly={false}
            />
            
            {/* Map Controls Glass Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <button className="h-12 w-12 rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl border border-white/50 flex items-center justify-center text-slate-600 hover:text-sky-600 transition-colors">
                <MapIcon size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                    statusStyles[statusTone],
                  )}
                >
                  {statusLabel}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {pointCountLabel}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-slate-500">
                {statusMessage}
              </p>
            </div>

            {manualDrawingSummary.normalized && onResetManualDrawing ? (
              <button
                type="button"
                onClick={onResetManualDrawing}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                Réinitialiser le tracé
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
