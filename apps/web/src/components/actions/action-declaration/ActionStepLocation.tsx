"use client";

import React from "react";
import { MapPin, Navigation, Route, Map as MapIcon, Crosshair, HelpCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
import type { FormState } from "../action-declaration-form.model";
import type { ActionDrawing } from "@/lib/actions/types";

const ActionDrawingMap = dynamic(
  () => import("@/components/actions/action-drawing-map").then((mod) => mod.ActionDrawingMap),
  { ssr: false }
);

interface ActionStepLocationProps {
  form: FormState;
  updateField: (key: keyof FormState, value: any) => void;
  manualDrawing: ActionDrawing | null;
  setManualDrawing: (drawing: ActionDrawing | null) => void;
  routePreviewDrawing: ActionDrawing | null;
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
  gpsStatus,
  gpsMessage,
  onAutofillGps,
}: ActionStepLocationProps) {
  const isCompleteMode = true; // For now
  
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
                tone={gpsStatus === "success" ? "emerald" : "slate"} 
                variant="elevated" 
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
                  onChange={(e) => updateField("routeStyle", e.target.value)}
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
              Dessinez votre parcours sur la carte
            </div>
          </div>

          <div className="relative h-[340px] rounded-[2.5rem] bg-slate-100 border border-slate-200 overflow-hidden shadow-inner group">
            <ActionDrawingMap
              drawing={manualDrawing ?? routePreviewDrawing}
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
        </div>
      </div>
    </div>
  );
}
