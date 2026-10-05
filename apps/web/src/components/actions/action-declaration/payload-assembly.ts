import type { CreateActionPayload } from "../../../lib/actions/types";
import { normalizeActionDrawing } from "../map/layers/actions-map-geometry.utils";
import type { CreateActionPayloadParams, CreateActionPayloadParts } from "./payload-contract";
import { buildCreateActionPayloadIdentityFields, resolveCreateActionIdentityParts } from "./payload-identity";
import { buildCreateActionPayloadMeasurementFields, resolveCreateActionMeasurementParts } from "./payload-measurements";
import { buildPreparationDataFromForm } from "./payload-preparation";
import { buildCreateActionPayloadGeometryFields, resolveCreateActionRouteParts } from "./payload-geometry";
import { resolveFinalActionGeometry } from "../../../lib/actions/geometry/final-geometry";

function resolveCreateActionPayloadParts(
  params: CreateActionPayloadParams,
): CreateActionPayloadParts {
  return {
    ...resolveCreateActionRouteParts(params),
    ...resolveCreateActionIdentityParts(params),
    ...resolveCreateActionMeasurementParts(params.form, params.isEntrepriseMode),
  };
}

function buildCreateActionPayloadResult(
  params: CreateActionPayloadParams,
  parts: CreateActionPayloadParts,
): CreateActionPayload {
  return {
    ...buildCreateActionPayloadIdentityFields(params, parts),
    ...buildCreateActionPayloadMeasurementFields(params.form, parts),
    ...buildCreateActionPayloadGeometryFields(params, parts, buildPreparationDataFromForm),
    photos: params.photos ?? [],
    visionEstimate: params.visionEstimate ?? null,
    userMetadata: params.userMetadata,
  } as CreateActionPayload;
}

export function buildCreateActionPayload(
  params: CreateActionPayloadParams,
): CreateActionPayload {
  return buildCreateActionPayloadResult(params, resolveCreateActionPayloadParts(params));
}

export async function prepareCreateActionPayload(
  params: CreateActionPayloadParams,
): Promise<CreateActionPayload> {
  const payload = buildCreateActionPayload(params);
  const normalizedRoutePreview = normalizeActionDrawing(params.routePreviewDrawing);
  const finalGeometry = resolveFinalActionGeometry({
    gpxDrawing: payload.preparationData?.gpxImport ? payload.manualDrawing : null,
    gpxImport: payload.preparationData?.gpxImport,
    manualDrawing: payload.manualDrawing,
    manualDrawingSource: payload.geometrySource,
    operationalRoute: payload.preparationData?.operationalRoute,
    reconstructedDrawing: normalizedRoutePreview,
    reconstructedSource:
      params.routePreviewSource ??
      (normalizedRoutePreview?.kind === "polygon" ? "manual" : "routed"),
  });

  if (finalGeometry && (payload.manualDrawing || normalizedRoutePreview)) {
    return {
      ...payload,
      manualDrawing: finalGeometry.drawing,
      geometrySource: finalGeometry.source,
    };
  }

  // Location-only drafts stay free of derived coordinates; the server preserves geometry priority.
  return payload;
}
