"use client";

import { useState } from "react";
import { ACTION_INTERVENTION_MODES, createActionInterventionMode, type ActionInterventionMode } from "@/lib/actions/intervention-mode";
import { cn } from "@/lib/utils";
import type { BaseSectionProps } from "./section-contract";

/** Owns collection-mode changes and confirmation before discarding a saved route. */
export function InterventionModeFields({
  form,
  updateFields,
}: Pick<BaseSectionProps, "form" | "updateFields">) {
  const [pendingFixedAreaConfirmation, setPendingFixedAreaConfirmation] = useState(false);
  const mode = form.interventionMode?.mode ?? (form.operationalRoute ? "itinerary" : "fixed_area");
  const updateMode = (nextMode: ActionInterventionMode) => {
    if (nextMode === "fixed_area" && form.operationalRoute && mode !== "fixed_area") {
      setPendingFixedAreaConfirmation(true);
      return;
    }
    setPendingFixedAreaConfirmation(false);
    updateFields?.({ interventionMode: createActionInterventionMode(nextMode) });
  };
  const confirmFixedArea = () => {
    setPendingFixedAreaConfirmation(false);
    updateFields?.({
      interventionMode: createActionInterventionMode("fixed_area"),
      operationalRoute: null,
      routeCalibrationContext: null,
      plannerProof: null,
      gpxImport: null,
      routeTargetDistanceKm: "",
      routeTargetDistanceKmManuallySet: false,
      routeTopology: "loop",
      arrivalLocationLabel: "",
      arrivalCoordinates: null,
      midRouteCoordinates: null,
    });
  };
  return (
    <fieldset className="space-y-3" data-testid="intervention-mode-selector">
      <legend className="text-sm font-black text-emerald-950">Mode de collecte</legend>
      <div className="grid gap-3 md:grid-cols-3">
        {ACTION_INTERVENTION_MODES.map((option) => {
          const selected = mode === option;
          const copy = option === "fixed_area"
            ? { title: "Zone fixe", description: "Un lieu et un rendez-vous, sans itinéraire." }
            : option === "itinerary"
              ? { title: "Itinéraire", description: "Une boucle ou un parcours avec arrivée." }
              : { title: "Plusieurs groupes", description: "Plusieurs zones ou parcours coordonnés." };
          return (
            <label key={option} className={cn("cursor-pointer rounded-2xl border p-4 transition", selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15" : "border-emerald-100 bg-white hover:border-emerald-300")}>
              <input type="radio" name="intervention-mode" value={option} checked={selected} onChange={() => updateMode(option)} className="sr-only" />
              <span className="block text-sm font-black text-emerald-950">{copy.title}</span>
              <span className="mt-1 block text-xs leading-5 text-emerald-900/70">{copy.description}</span>
            </label>
          );
        })}
      </div>
      {pendingFixedAreaConfirmation ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert" data-testid="fixed-area-route-replacement-confirmation">
          <p className="font-black">Remplacer le parcours conservé par une zone fixe ?</p>
          <p className="mt-1 leading-6">Le parcours et ses distances seront retirés.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={confirmFixedArea} className="rounded-full bg-amber-700 px-4 py-2 text-xs font-black text-white">Confirmer la zone fixe</button>
            <button type="button" onClick={() => setPendingFixedAreaConfirmation(false)} className="rounded-full border border-amber-300 px-4 py-2 text-xs font-black text-amber-950">Conserver le parcours</button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
