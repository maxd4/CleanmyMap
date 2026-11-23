"use client";

import { MapPinned } from "lucide-react";
import { useRef, useState } from "react";
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
import { ActionRouteEntryPanel } from "../action-route-entry-panel";
import { ActionRouteReferenceImage } from "../action-route-reference-image";
import { parsePlannedGpxFiles } from "@/lib/actions/geometry/action-planned-gpx";

export function TerrainActionSection({
  form,
  updateField,
  updateFields,
  countryCode,
  hasAttemptedSubmit,
  validationIssueFields,
  onEditDefinition,
  actionId,
}: BaseSectionProps & { onEditDefinition?: () => void }) {
  const [mobilePanel, setMobilePanel] = useState<"map" | "settings">("settings");
  const gpxInputRef = useRef<HTMLInputElement>(null);
  const [gpxBusy, setGpxBusy] = useState(false);
  const [gpxError, setGpxError] = useState<string | null>(null);
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
        {isRouteInterventionMode(mode) ? <ActionRouteEntryPanel
          intent="planned"
          description={form.plannedRouteDescription ?? ""}
          onDescriptionChange={(plannedRouteDescription) => updateField("plannedRouteDescription", plannedRouteDescription)}
          gpxContent={<div className="space-y-3 rounded-xl border border-violet-200 bg-white p-3">
            <input ref={gpxInputRef} type="file" multiple accept=".gpx,application/gpx+xml,application/xml,text/xml" className="sr-only" aria-label="Importer un ou plusieurs fichiers GPX prévus" onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; if (!files.length) return; setGpxBusy(true); setGpxError(null); void parsePlannedGpxFiles(files, form.routeTopology).then(({ metadata, errors }) => { const previous = form.plannedRouteGpx?.files ?? []; const merged = [...previous, ...(metadata.files ?? [])]; const segments = merged.flatMap((file) => file.segments); updateField("plannedRouteGpx", { ...metadata, files: merged, observedDistanceKm: Number(segments.reduce((sum, segment) => sum + segment.distanceKm, 0).toFixed(3)), pointCount: segments.reduce((sum, segment) => sum + segment.pointCount, 0), segmentCount: segments.length, traceCount: new Set(segments.map((segment) => `${segment.fileId ?? segment.fileName}:${segment.traceIndex}`)).size, segmentTopologies: segments.map((segment) => segment.topology), segmentDistancesKm: segments.map((segment) => segment.distanceKm), segmentPointCounts: segments.map((segment) => segment.pointCount), provenance: merged.length > 0 && merged.every((file) => file.provenance === "planned") ? "planned" : "unknown", gpxImportProvenance: merged.some((file) => file.provenance === "planned") ? "planned" : "unknown" }); setGpxError(errors.length ? errors.join(" · ") : null); }).catch((error: unknown) => setGpxError(error instanceof Error ? error.message : "Le GPX n’a pas pu être lu.")).finally(() => setGpxBusy(false)); }} />
            <button type="button" disabled={gpxBusy} onClick={() => gpxInputRef.current?.click()} className="min-h-11 rounded-xl border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 disabled:opacity-50">{gpxBusy ? "Lecture du GPX…" : "Choisir un ou plusieurs fichiers GPX"}</button>
            {form.plannedRouteGpx?.files?.length ? <div className="space-y-2"><p className="text-sm font-semibold text-violet-950">{form.plannedRouteGpx.files.length} fichier(s) · {form.plannedRouteGpx.segmentCount ?? 0} segment(s) · {form.plannedRouteGpx.observedDistanceKm.toFixed(2).replace(".", ",")} km prévus · provenance GPX</p>{form.plannedRouteGpx.files.map((file, index) => <p key={file.fileId ?? `${file.fileName}-${index}`} className="break-words text-sm text-slate-700">{file.fileName}{file.error ? ` · ${file.error}` : " · parcours prévu"}</p>)}<button type="button" onClick={() => updateField("plannedRouteGpx", null)} className="min-h-11 text-sm font-semibold text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">Supprimer les fichiers GPX prévus</button></div> : <p className="text-sm text-slate-600">Le tracé GPX reste un parcours prévu, jamais une trace observée.</p>}
            {gpxError ? <p role="alert" className="text-sm text-rose-700">{gpxError}</p> : null}
          </div>}
          imageContent={<ActionRouteReferenceImage actionId={actionId} mediaId={form.routeReferenceImageMediaId} onMediaIdChange={(id) => updateField("routeReferenceImageMediaId", id)} />}
        /> : null}
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
