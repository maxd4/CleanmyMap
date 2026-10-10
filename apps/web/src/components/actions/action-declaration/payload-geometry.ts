import type {
  ActionDrawing,
  ActionRouteTopology,
  CreateActionPayload,
} from "../../../lib/actions/types";
import {
  resolveFinalActionGeometry,
  type FinalActionGeometry,
} from "../../../lib/actions/geometry/final-geometry";
import { resolveActionRouteTopology } from "../../../lib/actions/route-topology";
import { normalizeActionDrawing } from "../map/layers/actions-map-geometry.utils";
import type { CreateActionPayloadParams, CreateActionPayloadParts } from "./payload-contract";
import { toOptionalNumber } from "./payload-numbers";
import { normalizeActionInterventionMode } from "@/lib/actions/intervention-mode";

function getDrawingCentroid(drawing: ActionDrawing): {
  latitude: number;
  longitude: number;
} {
  const total = drawing.coordinates.reduce(
    (acc, [lat, lng]) => ({
      latitude: acc.latitude + lat,
      longitude: acc.longitude + lng,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: Number((total.latitude / drawing.coordinates.length).toFixed(6)),
    longitude: Number((total.longitude / drawing.coordinates.length).toFixed(6)),
  };
}

export function resolveCreateActionRouteParts(
  params: CreateActionPayloadParams,
): Pick<
  CreateActionPayloadParts,
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "routeTopology"
  | "routeLocationLabel"
  | "latitude"
  | "longitude"
  | "finalGeometry"
  | "normalizedDrawing"
  | "resolvedManualDrawingSource"
> {
  const {
    form,
    effectiveManualDrawingEnabled,
    manualDrawing,
    manualDrawingSource,
    routePreviewDrawing,
    routePreviewSource,
  } = params;
  const departureLocationLabel = form.departureLocationLabel.trim();
  const arrivalLocationLabel = form.arrivalLocationLabel.trim();
  const routeTopology: ActionRouteTopology = resolveActionRouteTopology({
    topology: form.routeTopology,
    arrivalLocationLabel,
    recordType: form.recordType,
  });
  const isFixedArea = normalizeActionInterventionMode(form.interventionMode)?.mode === "fixed_area";
  const routeLocationLabel =
    routeTopology === "point_to_point" && departureLocationLabel && arrivalLocationLabel
      ? `${departureLocationLabel} → ${arrivalLocationLabel}`
      : departureLocationLabel || form.locationLabel.trim();
  let latitude = toOptionalNumber(form.latitude) ?? null;
  let longitude = toOptionalNumber(form.longitude) ?? null;
  const normalizedManualDrawing = normalizeActionDrawing(manualDrawing);
  const finalGeometry = resolveFinalActionGeometry({
    gpxDrawing: !isFixedArea && form.gpxImport ? normalizedManualDrawing : null,
    gpxImport: isFixedArea ? null : form.gpxImport,
    manualDrawing: normalizedManualDrawing,
    manualDrawingSource,
    operationalRoute: isFixedArea ? null : form.operationalRoute,
    reconstructedDrawing: isFixedArea ? null : normalizeActionDrawing(routePreviewDrawing),
    reconstructedSource: isFixedArea ? null : routePreviewSource,
  });
  const normalizedDrawing = finalGeometry?.drawing ?? null;
  const resolvedManualDrawingSource = finalGeometry?.source ?? null;
  const shouldUseGeometryCentroid = params.declarationMode !== "quick" &&
    normalizedDrawing &&
    (effectiveManualDrawingEnabled || finalGeometry?.operationalRoute || routePreviewDrawing);
  if (shouldUseGeometryCentroid) {
    const centroid = getDrawingCentroid(normalizedDrawing);
    latitude = centroid.latitude;
    longitude = centroid.longitude;
  }
  return {
    departureLocationLabel,
    arrivalLocationLabel,
    routeTopology,
    routeLocationLabel,
    latitude,
    longitude,
    finalGeometry,
    normalizedDrawing,
    resolvedManualDrawingSource,
  };
}

export function buildCreateActionPayloadGeometryFields(
  params: CreateActionPayloadParams,
  parts: CreateActionPayloadParts,
  buildPreparationData: (
    form: CreateActionPayloadParams["form"],
    finalGeometry: FinalActionGeometry | null,
  ) => CreateActionPayload["preparationData"],
): Partial<CreateActionPayload> {
  const hasManualGeometry = Boolean(
    parts.finalGeometry?.drawing &&
      (params.effectiveManualDrawingEnabled || parts.finalGeometry.operationalRoute || params.routePreviewDrawing),
  );
  return {
    latitude: parts.latitude ?? undefined,
    longitude: parts.longitude ?? undefined,
    preparationData: buildPreparationData(params.form, parts.finalGeometry),
    plannerSnapshotProof: params.form.plannerProof ?? null,
    manualDrawing: hasManualGeometry ? parts.normalizedDrawing! : undefined,
    geometrySource: hasManualGeometry ? parts.resolvedManualDrawingSource : undefined,
  };
}

export function isDrawingValid(
  drawing: ActionDrawing | null | undefined,
): drawing is ActionDrawing {
  return normalizeActionDrawing(drawing) !== null;
}

export function isLocationLikelyPark(value: string): boolean {
  const lower = value.toLowerCase();
  return ["luxembourg", "vincennes", "boulogne", "chaumont", "tuileries", "parc", "jardin", "square"]
    .some((keyword) => lower.includes(keyword));
}
