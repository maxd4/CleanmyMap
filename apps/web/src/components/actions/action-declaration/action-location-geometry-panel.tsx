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
  onResetManualDrawing,
}: ActionLocationGeometryPanelProps) {
  const viewModel = buildActionLocationViewModel({
    form,
    manualDrawing,
    manualDrawingSource,
    routePreviewDrawing,
    routePreviewSource,
    gpxImport,
  });

  return (
    <>
      <ActionLocationGpxImport form={form} gpxImport={gpxImport} gpxError={gpxError} onImportGpx={onImportGpx} onRemoveGpx={onRemoveGpx} />
      {viewModel.activeGeometry?.operationalRoute ? <OperationalRouteEditor operationalRoute={viewModel.activeGeometry.operationalRoute} onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)} /> : null}
      <ActionGpxExportButton input={{ finalGeometry: viewModel.activeGeometry, operationalRoute: form.operationalRoute, drawing: manualDrawing, gpxImport, routeTopology: form.routeTopology, departureLabel: form.departureLocationLabel, midpointLabel: form.midRouteLocationLabel, midpointCoordinates: form.midRouteCoordinates, arrivalLabel: form.arrivalLocationLabel }} />
      <ActionLocationMapPanel form={form} gpxImport={gpxImport} setManualDrawing={setManualDrawing} onResetManualDrawing={onResetManualDrawing} viewModel={viewModel} />
      <ActionLocationAdjustmentNotes form={form} updateField={updateField} />
    </>
  );
}
