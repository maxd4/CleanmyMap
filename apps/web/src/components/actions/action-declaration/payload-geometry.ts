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
import { normalizeActionDrawing } from "../../../lib/actions/geometry/geometry-core";
import type { CreateActionPayloadParams, CreateActionPayloadParts } from "./payload-contract";
import { hasValidCoordinatePair, toOptionalNumber } from "./payload-numbers";
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

function resolveFinalGeometryForPayload(params: CreateActionPayloadParams, isFixedArea: boolean) {
  const normalizedManualDrawing = normalizeActionDrawing(params.manualDrawing);
  const finalGeometry = resolveFinalActionGeometry({
    geometryMethod: params.form.geometryMethod,
    gpxDrawing: !isFixedArea && params.form.gpxImport ? normalizedManualDrawing : null,
    gpxImport: isFixedArea ? null : params.form.gpxImport,
    manualDrawing: normalizedManualDrawing,
    manualDrawingSource: params.manualDrawingSource,
    operationalRoute: isFixedArea ? null : params.form.operationalRoute,
    reconstructedDrawing: isFixedArea ? null : normalizeActionDrawing(params.routePreviewDrawing),
    reconstructedSource: isFixedArea ? null : params.routePreviewSource,
  });
  return { finalGeometry, normalizedManualDrawing };
}

function applyGeometryCentroid(
  params: CreateActionPayloadParams,
  finalGeometry: FinalActionGeometry | null,
  normalizedDrawing: ActionDrawing | null,
  coordinates: { latitude: number | null; longitude: number | null },
): void {
  const shouldUseGeometryCentroid = params.declarationMode !== "quick" &&
    normalizedDrawing &&
    (params.effectiveManualDrawingEnabled || finalGeometry?.operationalRoute || params.routePreviewDrawing);
  if (shouldUseGeometryCentroid) {
    const centroid = getDrawingCentroid(normalizedDrawing);
    coordinates.latitude = centroid.latitude;
    coordinates.longitude = centroid.longitude;
  }
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
  const { form } = params;
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
  const hasCoordinatePair = hasValidCoordinatePair(form.latitude, form.longitude);
  const latitude = hasCoordinatePair ? toOptionalNumber(form.latitude) ?? null : null;
  const longitude = hasCoordinatePair ? toOptionalNumber(form.longitude) ?? null : null;
  const geometry = resolveFinalGeometryForPayload(params, isFixedArea);
  const { finalGeometry } = geometry;
  const normalizedDrawing = finalGeometry?.drawing ?? null;
  const resolvedManualDrawingSource = finalGeometry?.source ?? null;
  const coordinates = { latitude, longitude };
  applyGeometryCentroid(params, finalGeometry, normalizedDrawing, coordinates);
  return {
    departureLocationLabel,
    arrivalLocationLabel,
    routeTopology,
    routeLocationLabel,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
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
    declarationMode: CreateActionPayloadParams["declarationMode"],
  ) => CreateActionPayload["preparationData"],
): Partial<CreateActionPayload> {
  const hasManualGeometry = Boolean(
    parts.finalGeometry?.drawing &&
      (params.effectiveManualDrawingEnabled || parts.finalGeometry.operationalRoute || params.routePreviewDrawing),
  );
  return {
    latitude: parts.latitude ?? undefined,
    longitude: parts.longitude ?? undefined,
    preparationData: buildPreparationData(
      params.form,
      parts.finalGeometry,
      params.declarationMode,
    ),
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
