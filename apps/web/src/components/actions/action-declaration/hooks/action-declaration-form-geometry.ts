import type {
  ActionDrawing,
  ActionGeometrySource,
} from "@/lib/actions/types";
import { resolveFinalActionGeometry } from "@/lib/actions/geometry/final-geometry";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import { summarizeActionDrawingValidation } from "../../map/layers/actions-map-geometry.utils";
import { applyOrganizerFormUpdates } from "../organizer-form-state";
import { isDrawingValid } from "../payload";
import type { FormState } from "../model";

const ROUTE_GEOMETRY_PARAMETER_FIELDS = new Set<keyof FormState>([
  "locationLabel",
  "departureLocationLabel",
  "midRouteLocationLabel",
  "arrivalLocationLabel",
  "routeTopology",
  "routeStyle",
  "latitude",
  "longitude",
  "durationMinutes",
  "routeTargetDistanceKm",
  "midRouteCoordinates",
  "arrivalCoordinates",
]);

export type ActionDeclarationGeometryState = {
  drawingIsValid: boolean;
  manualDrawingValidation: ReturnType<typeof summarizeActionDrawingValidation>;
  activeFinalGeometry: ReturnType<typeof resolveFinalActionGeometry>;
  effectiveRoutePreviewDrawing: ActionDrawing | null;
  effectiveDrawing: ActionDrawing | null;
  hasValidDrawing: boolean;
  hasServerRouteInput: boolean;
};

export function resolveActionDeclarationGeometryState({
  form,
  manualDrawing,
  manualDrawingSource,
  persistedDrawing,
  persistedDrawingSource,
}: {
  form: FormState;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: ActionGeometrySource | null;
  persistedDrawing: ActionDrawing | null;
  persistedDrawingSource: ActionGeometrySource | null;
}): ActionDeclarationGeometryState {
  const drawingIsValid = isDrawingValid(manualDrawing);
  const routePreviewInput = form.departureLocationLabel.trim() || form.locationLabel.trim();
  const manualDrawingValidation = summarizeActionDrawingValidation(manualDrawing);
  const activeFinalGeometry = resolveFinalActionGeometry({
    gpxDrawing: form.gpxImport ? manualDrawing : null,
    gpxImport: form.gpxImport,
    manualDrawing,
    manualDrawingSource,
    operationalRoute: form.operationalRoute,
    reconstructedDrawing: persistedDrawing,
    reconstructedSource: persistedDrawingSource,
  });
  const effectiveRoutePreviewDrawing = activeFinalGeometry?.drawing ?? null;
  const effectiveDrawing = manualDrawingValidation.normalized ?? effectiveRoutePreviewDrawing;

  return {
    drawingIsValid,
    manualDrawingValidation,
    activeFinalGeometry,
    effectiveRoutePreviewDrawing,
    effectiveDrawing,
    hasValidDrawing: Boolean(effectiveDrawing),
    hasServerRouteInput: routePreviewInput.length >= 2 || (
      Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude))
    ),
  };
}

export function getRouteTopologyConflictMessage(
  form: FormState,
  updates: Partial<FormState>,
): string | null {
  if (
    !updates.routeTopology ||
    !form.gpxImport ||
    updates.routeTopology === form.gpxImport.inferredTopology
  ) {
    return null;
  }

  return form.gpxImport.inferredTopology === "loop"
    ? "Ce tracé GPX est fermé. Supprimez-le avant de choisir Départ → arrivée."
    : "Ce tracé GPX est ouvert. Supprimez-le avant de choisir Boucle.";
}

export function prepareActionDeclarationFormUpdate(
  form: FormState,
  updates: Partial<FormState>,
): {
  nextForm: FormState;
  clearsPersistedDrawing: boolean;
} {
  const nextForm: FormState = { ...form, ...updates };
  const clearsPersistedDrawing = Boolean(
    Object.keys(updates).some((key) =>
      ROUTE_GEOMETRY_PARAMETER_FIELDS.has(key as keyof FormState),
    ),
  );

  if (updates.routeTargetDistanceKm !== undefined) {
    nextForm.routeTargetDistanceKmManuallySet = true;
  } else if (
    updates.durationMinutes !== undefined &&
    !form.routeTargetDistanceKmManuallySet
  ) {
    nextForm.routeTargetDistanceKm = String(
      resolveRouteTargetDistance({
        durationMinutes: updates.durationMinutes,
        routeTargetDistanceSource: "derived",
      }).distanceKm,
    );
  }
  if (updates.routeStyle !== undefined) {
    nextForm.routeStyle = "souple";
  }
  if (updates.routeTopology === "loop" && nextForm.recordType === "action") {
    nextForm.arrivalLocationLabel = "";
  }
  applyOrganizerFormUpdates(nextForm, form, updates);

  return { nextForm, clearsPersistedDrawing };
}
