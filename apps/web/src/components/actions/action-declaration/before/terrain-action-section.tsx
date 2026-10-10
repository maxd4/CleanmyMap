"use client";

import { MapPinned } from "lucide-react";
import { useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { OperationalRouteEditor } from "../operational-route-editor";
import { RouteTopologyFieldset } from "../action-location-inputs";
import type { BaseSectionProps } from "./section-contract";
import { hasValidCoordinatePair, MeetingLocationFields, RouteDestinationField } from "./planned-action-location-section";
import { SectionLabel } from "./ui";
import { TerrainMapPanel } from "./terrain-map-panel";
import { ACTION_INTERVENTION_MODES, createActionInterventionMode, isRouteInterventionMode, type ActionInterventionMode } from "@/lib/actions/intervention-mode";
import { cn } from "@/lib/utils";

export function TerrainActionSection({
  form,
  updateField,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  const [mobilePanel, setMobilePanel] = useState<"map" | "settings">("settings");
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
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-5">
        <SectionLabel
          icon={MapPinned}
          title="Carte et mode d’intervention"
          subtitle="Choisissez une zone fixe, un parcours ou plusieurs zones. Le rendez-vous reste distinct du secteur et de l’itinéraire."
        />
        <fieldset className="space-y-3" data-testid="intervention-mode-selector">
          <legend className="text-sm font-black text-emerald-950">Comment souhaitez-vous intervenir ?</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {ACTION_INTERVENTION_MODES.map((option) => {
              const selected = mode === option;
              const copy = option === "fixed_area"
                ? { title: "Collecte sur une zone précise", description: "Un lieu et un rendez-vous, sans itinéraire." }
                : option === "itinerary"
                  ? { title: "Cleanwalk itinérante", description: "Boucle ou départ → arrivée, à recommander si besoin." }
                  : { title: "Plusieurs zones ou groupes", description: "Segmentation et calibration par le moteur existant." };
              return (
                <label key={option} className={cn("cursor-pointer rounded-2xl border p-4 transition", selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15" : "border-emerald-100 bg-white hover:border-emerald-300")}>
                  <input type="radio" name="intervention-mode" value={option} checked={selected} onChange={() => updateMode(option)} className="sr-only" />
                  <span className="block text-sm font-black text-emerald-950">{copy.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-emerald-900/70">{copy.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {pendingFixedAreaConfirmation ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert" data-testid="fixed-area-route-replacement-confirmation">
            <p className="font-black">Remplacer le parcours conservé par une zone fixe ?</p>
            <p className="mt-1 leading-6">Cette décision retire le parcours et ses distances de cette préparation, sans modifier le rendez-vous, la date ni les horaires.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={confirmFixedArea} className="rounded-full bg-amber-700 px-4 py-2 text-xs font-black text-white">Confirmer la zone fixe</button>
              <button type="button" onClick={() => setPendingFixedAreaConfirmation(false)} className="rounded-full border border-amber-300 px-4 py-2 text-xs font-black text-amber-950">Conserver le parcours</button>
            </div>
          </div>
        ) : null}
        <div className="flex gap-2 rounded-2xl border border-emerald-100 bg-white p-2 lg:hidden" role="tablist" aria-label="Affichage terrain">
          {(["settings", "map"] as const).map((panel) => <button key={panel} type="button" role="tab" aria-selected={mobilePanel === panel} onClick={() => setMobilePanel(panel)} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold", mobilePanel === panel ? "bg-emerald-600 text-white" : "text-emerald-900")}>{panel === "map" ? "Carte" : "Paramètres"}</button>)}
        </div>
        <div className={cn(mobilePanel === "map" ? "block" : "hidden", "lg:block")}>
          <TerrainMapPanel form={form} />
        </div>
        <div className={cn(mobilePanel === "settings" ? "block" : "hidden", "space-y-5 lg:block")}>
          <MeetingLocationFields
            form={form}
            updateField={updateField}
            updateFields={updateFields}
            hasAttemptedSubmit={hasAttemptedSubmit}
            validationIssueFields={validationIssueFields}
          />
          {isRouteInterventionMode(mode) ? <>
            <RouteTopologyFieldset form={form} updateField={updateField} />
            <RouteDestinationField
              form={form}
              updateField={updateField}
              updateFields={updateFields}
              hasAttemptedSubmit={hasAttemptedSubmit}
              validationIssueFields={validationIssueFields}
            />
          </> : <p className="rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-950">Zone fixe : renseignez le secteur et le point de rendez-vous. Aucun tracé, distance ou géométrie d’itinéraire n’est requis.</p>}
        </div>
        {isRouteInterventionMode(mode) && form.operationalRoute ? (
          <CmmDisclosure
            summary={<ActionFormDisclosureSummary label="Parcours existant" detail="parcours calculé conservé" />}
            tone="emerald"
            size="sm"
          >
            <p className="mb-3 text-sm text-emerald-900/70">Le parcours calculé par le planificateur est repris ici sans nouvelle géométrie.</p>
            <OperationalRouteEditor
              operationalRoute={form.operationalRoute}
              onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)}
            />
          </CmmDisclosure>
        ) : null}
        <CmmDisclosure
          summary={<ActionFormDisclosureSummary label="Coordonnées avancées" detail={hasValidCoordinatePair(form.latitude, form.longitude) ? "coordonnées renseignées" : "facultatives"} />}
          tone="emerald"
          size="sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CmmField id="before-latitude" label="Latitude">
              <CmmInput type="number" step="any" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} placeholder="Latitude" />
            </CmmField>
            <CmmField id="before-longitude" label="Longitude">
              <CmmInput type="number" step="any" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} placeholder="Longitude" />
            </CmmField>
          </div>
        </CmmDisclosure>
      </div>
    </CmmCard>
  );
}
