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
      <ActionLocationGpxImport form={form} gpxImport={gpxImport} gpxError={gpxError} onImportGpx={onImportGpx} onRemoveGpx={onRemoveGpx} onSetGpxIntent={onSetGpxIntent} compact={compact} />
      {viewModel.activeGeometry?.operationalRoute ? <OperationalRouteEditor operationalRoute={viewModel.activeGeometry.operationalRoute} onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)} compact={compact} /> : null}
      <ActionGpxExportButton input={{ finalGeometry: viewModel.activeGeometry, operationalRoute: form.operationalRoute, drawing: manualDrawing, gpxImport, routeTopology: form.routeTopology, departureLabel: form.departureLocationLabel, midpointLabel: form.midRouteLocationLabel, midpointCoordinates: form.midRouteCoordinates, arrivalLabel: form.arrivalLocationLabel }} />
      <ActionLocationMapPanel form={form} gpxImport={gpxImport} setManualDrawing={handleDrawingChange} onResetManualDrawing={onResetManualDrawing} viewModel={viewModel} compact={compact} />
      <ActionLocationAdjustmentNotes form={form} updateField={updateField} compact={compact} />
    </div>
  );
}
