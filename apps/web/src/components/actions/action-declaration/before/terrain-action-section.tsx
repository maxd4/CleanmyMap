"use client";

import { MapPinned } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { OperationalRouteEditor } from "../operational-route-editor";
import { RouteTopologyFieldset } from "../action-location-inputs";
import type { BaseSectionProps } from "./section-contract";
import { hasValidCoordinatePair, MeetingLocationFields, RouteDestinationField } from "./planned-action-location-section";
import { SectionLabel } from "./ui";

export function TerrainActionSection({
  form,
  updateField,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-5">
        <SectionLabel
          icon={MapPinned}
          title="Localisation et parcours"
          subtitle="Corrigez le départ, l’arrivée et le parcours conservé avant de passer à la préparation terrain."
        />
        <MeetingLocationFields
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssueFields={validationIssueFields}
        />
        <RouteTopologyFieldset form={form} updateField={updateField} />
        <RouteDestinationField
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssueFields={validationIssueFields}
        />
        {form.operationalRoute ? (
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
