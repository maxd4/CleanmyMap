"use client";

import { OperationalRouteEditor } from "./operational-route-editor";
import { ActionGpxExportButton } from "./action-gpx-export";
import { buildActionLocationViewModel } from "./action-location.model";
import {
  ActionLocationAdjustmentNotes,
  ActionLocationGpxImport,
  ActionLocationMapPanel,
} from "./action-location-geometry-sections";
import type { ActionLocationGeometryPanelProps } from "./action-location.types";
import { ActionRouteEntryPanel } from "./action-route-entry-panel";
import { ActionRouteReferenceImage } from "./action-route-reference-image";

export function ActionLocationGeometryPanel({
  form,
  updateField,
  manualDrawing,
  setManualDrawing,
  manualDrawingSource,
  routePreviewDrawing,
  routePreviewSource,
  gpxImport,
  gpxError,
  onImportGpx,
  onRemoveGpx,
  onSetGpxIntent,
  onResetManualDrawing,
  actionId,
  compact = false,
}: ActionLocationGeometryPanelProps) {
  const viewModel = buildActionLocationViewModel({
    form,
    manualDrawing,
    manualDrawingSource,
    routePreviewDrawing,
    routePreviewSource,
    gpxImport,
  });
  const handleDrawingChange = (
    drawing: Parameters<typeof setManualDrawing>[0],
    source: Parameters<typeof setManualDrawing>[1],
  ) => {
    setManualDrawing(drawing, source);
    updateField("geometryMethod", drawing && source === "manual" ? "manual" : "automatic");
  };

  return (
    <div id="action-location-geometry" className={compact ? "space-y-3" : "space-y-4"}>
      <ActionRouteEntryPanel
        intent="observed"
        description={form.observedRouteDescription ?? ""}
        onDescriptionChange={(value) => updateField("observedRouteDescription", value)}
        gpxContent={<ActionLocationGpxImport form={form} gpxImport={gpxImport} gpxError={gpxError} onImportGpx={onImportGpx} onRemoveGpx={onRemoveGpx} onSetGpxIntent={onSetGpxIntent} compact={compact} />}
        imageContent={<ActionRouteReferenceImage actionId={actionId} mediaId={form.routeReferenceImageMediaId} onMediaIdChange={(mediaId) => updateField("routeReferenceImageMediaId", mediaId)} />}
      />
      {form.plannedRouteGpx?.files?.some((file) => file.segments.some((segment) => segment.coordinates.length > 1)) && gpxImport?.intent === "observed" && gpxImport.files?.some((file) => file.segments.some((segment) => segment.coordinates.length > 1)) ? <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">Comparaison prévue / réalisée : {form.plannedRouteGpx.observedDistanceKm.toFixed(2).replace(".", ",")} km prévus · {gpxImport.observedDistanceKm.toFixed(2).replace(".", ",")} km observés.</p> : null}
      {viewModel.activeGeometry?.operationalRoute ? <OperationalRouteEditor operationalRoute={viewModel.activeGeometry.operationalRoute} onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)} compact={compact} /> : null}
      <ActionGpxExportButton input={{ finalGeometry: viewModel.activeGeometry, operationalRoute: form.operationalRoute, drawing: manualDrawing, gpxImport, routeTopology: form.routeTopology, departureLabel: form.departureLocationLabel, midpointLabel: form.midRouteLocationLabel, midpointCoordinates: form.midRouteCoordinates, arrivalLabel: form.arrivalLocationLabel }} />
      <ActionLocationMapPanel form={form} gpxImport={gpxImport} setManualDrawing={handleDrawingChange} onResetManualDrawing={onResetManualDrawing} viewModel={viewModel} compact={compact} />
      <ActionLocationAdjustmentNotes form={form} updateField={updateField} compact={compact} />
    </div>
  );
}
