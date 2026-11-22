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
import { hasValidCoordinatePair, RouteDestinationField } from "./planned-action-location-section";
import { SectionLabel } from "./ui";
import { TerrainMapPanel } from "./terrain-map-panel";
import { isRouteInterventionMode } from "@/lib/actions/intervention-mode";
import { cn } from "@/lib/utils";

export function TerrainActionSection({
  form,
  updateField,
  updateFields,
  countryCode,
  hasAttemptedSubmit,
  validationIssueFields,
  onEditDefinition,
}: BaseSectionProps & { onEditDefinition?: () => void }) {
  const [mobilePanel, setMobilePanel] = useState<"map" | "settings">("settings");
  const mode = form.interventionMode?.mode ?? (form.operationalRoute ? "itinerary" : "fixed_area");
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-5">
        <SectionLabel icon={MapPinned} title="Carte et parcours" />
        <div className="flex gap-2 rounded-2xl border border-emerald-100 bg-white p-2 lg:hidden" role="tablist" aria-label="Affichage terrain">
          {(["settings", "map"] as const).map((panel) => <button key={panel} type="button" role="tab" aria-selected={mobilePanel === panel} onClick={() => setMobilePanel(panel)} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold", mobilePanel === panel ? "bg-emerald-600 text-white" : "text-emerald-900")}>{panel === "map" ? "Carte" : "Paramètres"}</button>)}
        </div>
        <div className={cn(mobilePanel === "map" ? "block" : "hidden", "lg:block")}>
          <TerrainMapPanel form={form} onEditDefinition={onEditDefinition} />
        </div>
        <div className={cn(mobilePanel === "settings" ? "block" : "hidden", "space-y-5 lg:block")}>
          {isRouteInterventionMode(mode) ? <>
            <RouteTopologyFieldset form={form} updateField={updateField} />
            <RouteDestinationField
              form={form}
              updateField={updateField}
              updateFields={updateFields}
              hasAttemptedSubmit={hasAttemptedSubmit}
              validationIssueFields={validationIssueFields}
              countryCode={countryCode}
            />
          </> : <p className="rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-950">Zone fixe : secteur et rendez-vous.</p>}
        </div>
        {isRouteInterventionMode(mode) && form.operationalRoute ? (
          <CmmDisclosure
            summary={<ActionFormDisclosureSummary label="Parcours existant" detail="parcours calculé conservé" />}
            tone="emerald"
            size="sm"
          >
            <p className="mb-3 text-sm text-emerald-900/70">Parcours calculé conservé.</p>
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
