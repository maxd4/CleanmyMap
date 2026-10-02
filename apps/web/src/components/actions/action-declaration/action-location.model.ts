import type { ActionDrawing } from "@/lib/actions/types";
import {
  formatGeometryPointCount,
  summarizeActionDrawingValidation,
} from "../map/layers/actions-map-geometry.utils";
import {
  resolveFinalActionGeometry,
  type FinalActionGeometry,
} from "@/lib/actions/geometry/final-geometry";
import type { ActionLocationGeometryInput } from "./action-location.types";

type ActionLocationStatusTone =
  | "success"
  | "warning"
  | "error"
  | "neutral";

export type ActionLocationViewModel = {
  activeGeometry: FinalActionGeometry | null;
  displayedDrawing: ActionDrawing | null;
  previewSummary: ReturnType<typeof summarizeActionDrawingValidation>;
  activeSummary: ReturnType<typeof summarizeActionDrawingValidation>;
  isManual: boolean;
  isGpx: boolean;
  hasDrawing: boolean;
  statusTone: ActionLocationStatusTone;
};

export function buildActionLocationViewModel({
  form,
  manualDrawing,
  manualDrawingSource,
  routePreviewDrawing,
  routePreviewSource,
  gpxImport,
}: ActionLocationGeometryInput): ActionLocationViewModel {
  const previewSummary = summarizeActionDrawingValidation(routePreviewDrawing);
  const activeGeometry = resolveFinalActionGeometry({
    gpxDrawing: gpxImport ? manualDrawing : null,
    gpxImport,
    manualDrawing,
    manualDrawingSource,
    operationalRoute: form.operationalRoute,
    reconstructedDrawing: routePreviewDrawing,
    reconstructedSource: routePreviewSource,
  });
  const displayedDrawing = activeGeometry?.drawing ?? previewSummary.normalized;
  const activeSummary = activeGeometry?.drawing
    ? summarizeActionDrawingValidation(activeGeometry.drawing)
    : previewSummary;
  const hasDrawing = Boolean(displayedDrawing);

  return {
    activeGeometry,
    displayedDrawing,
    previewSummary,
    activeSummary,
    isManual: activeGeometry?.source === "manual",
    isGpx: activeGeometry?.source === "gpx_import",
    hasDrawing,
    statusTone: activeGeometry?.drawing
      ? activeSummary.tone
      : hasDrawing
        ? previewSummary.tone
        : "neutral",
  };
}

export { formatGeometryPointCount };
