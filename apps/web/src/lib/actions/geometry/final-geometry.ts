import type {
  ActionDrawing,
  ActionGeometryMethod,
  ActionGeometrySource,
  ActionGpxImportMetadata,
} from "@/lib/actions/types";
import {
  getOperationalRouteMeetingPoint,
  type OperationalRoute,
} from "@/lib/route/route-operational";
import type { MeetingPointProjection } from "@/lib/route/route-response-contract";
import { isRenderableDrawing } from "./geometry-resolution";

export type FinalActionGeometry = {
  drawing: ActionDrawing;
  source: ActionGeometrySource;
  /** Present only when the operational route itself is the active geometry. */
  operationalRoute: OperationalRoute | null;
  /** Present only when the selected route has an unambiguous rendezvous. */
  meetingPoint?: MeetingPointProjection | null;
};

export type FinalActionGeometryInput = {
  /** Explicit form source; observed candidates still remain authoritative. */
  geometryMethod?: ActionGeometryMethod | null;
  /** A persisted field observation from a completed GPS mission. */
  trackingDrawing?: ActionDrawing | null;
  trackingSource?: ActionGeometrySource | null;
  /** A valid GPX drawing and its provenance are a single candidate. */
  gpxDrawing?: ActionDrawing | null;
  gpxImport?: ActionGpxImportMetadata | null;
  manualDrawing?: ActionDrawing | null;
  manualDrawingSource?: ActionGeometrySource | null;
  operationalRoute?: OperationalRoute | null;
  /** Existing reconstruction/reference/fallback output; never recomputed here. */
  reconstructedDrawing?: ActionDrawing | null;
  reconstructedSource?: ActionGeometrySource | null;
};

const PERSISTED_ROUTE_SOURCES = [
  "routed",
  "estimated_route",
  "reference",
] as const satisfies readonly ActionGeometrySource[];

type PersistedRouteSource = (typeof PERSISTED_ROUTE_SOURCES)[number];

export type HydratedActionGeometry = {
  trackingDrawing: ActionDrawing | null;
  trackingSource: ActionGeometrySource | null;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: ActionGeometrySource | null;
  reconstructedDrawing: ActionDrawing | null;
  reconstructedSource: PersistedRouteSource | null;
  finalGeometry: FinalActionGeometry | null;
};

function isPersistedRouteSource(
  source: ActionGeometrySource | null | undefined,
): source is PersistedRouteSource {
  return Boolean(source && PERSISTED_ROUTE_SOURCES.includes(source as PersistedRouteSource));
}

function hasUsableGpxCandidate(input: FinalActionGeometryInput): boolean {
  const drawing = input.gpxDrawing;
  const metadata = input.gpxImport;
  return Boolean(
    metadata?.source === "gpx_import" &&
      drawing?.kind === "polyline" &&
      isRenderableDrawing(drawing),
  );
}

function hasUsableTrackingCandidate(input: FinalActionGeometryInput): boolean {
  return Boolean(
    input.trackingSource === "gps_tracking" &&
      input.trackingDrawing?.kind === "polyline" &&
      isRenderableDrawing(input.trackingDrawing),
  );
}

function resolveTrackingCandidate(
  input: FinalActionGeometryInput,
): FinalActionGeometry | null {
  if (!hasUsableTrackingCandidate(input)) return null;
  return {
    drawing: input.trackingDrawing!,
    source: "gps_tracking",
    operationalRoute: null,
  };
}

function resolveGpxCandidate(
  input: FinalActionGeometryInput,
): FinalActionGeometry | null {
  if (!hasUsableGpxCandidate(input)) return null;
  return {
    drawing: input.gpxDrawing!,
    source: "gpx_import",
    operationalRoute: null,
  };
}

function trackingHydrationInput(
  source: ActionGeometrySource | null,
  drawing: ActionDrawing | null,
): Pick<FinalActionGeometryInput, "trackingDrawing" | "trackingSource"> {
  return source === "gps_tracking"
    ? { trackingDrawing: drawing, trackingSource: source }
    : { trackingDrawing: null, trackingSource: null };
}

function canUseManualCandidate(
  input: FinalActionGeometryInput,
  gpxTagged: boolean,
): input is FinalActionGeometryInput & { manualDrawing: ActionDrawing } {
  const manualDrawing = input.manualDrawing;
  return Boolean(
    !gpxTagged &&
      (!input.manualDrawingSource ||
        input.manualDrawingSource === "manual" ||
        (manualDrawing?.kind === "polygon" && !input.reconstructedDrawing)) &&
      manualDrawing &&
      isRenderableDrawing(manualDrawing),
  );
}

function hasGpxTag(input: FinalActionGeometryInput): boolean {
  return Boolean(
    input.gpxImport?.source === "gpx_import" ||
      input.manualDrawingSource === "gpx_import",
  );
}

function hydratedTrackingState(
  finalGeometry: FinalActionGeometry | null,
  drawing: ActionDrawing | null,
): Pick<HydratedActionGeometry, "trackingDrawing" | "trackingSource"> {
  return finalGeometry?.source === "gps_tracking"
    ? { trackingDrawing: drawing, trackingSource: "gps_tracking" }
    : { trackingDrawing: null, trackingSource: null };
}

function routeDrawing(
  operationalRoute: OperationalRoute,
): Pick<FinalActionGeometry, "drawing" | "source"> | null {
  const route = operationalRoute.routes[0];
  if (!route || route.geometry.coordinates.length < 2) return null;

  return {
    drawing: {
      kind: "polyline",
      coordinates: route.geometry.coordinates,
    },
    source:
      route.geometry.mode === "fallback" || route.geometry.estimated
        ? "estimated_route"
        : "routed",
  };
}

function resolveOperationalCandidate(input: FinalActionGeometryInput): {
  route: OperationalRoute | null;
  candidate: Pick<FinalActionGeometry, "drawing" | "source"> | null;
} {
  const route =
    input.operationalRoute && input.operationalRoute.routes.length > 0
      ? input.operationalRoute
      : null;
  return {
    route,
    candidate: route ? routeDrawing(route) : null,
  };
}

function resolvePersistedCandidate(
  input: FinalActionGeometryInput,
): FinalActionGeometry | null {
  const persistedDrawing =
    input.reconstructedDrawing ??
    (isPersistedRouteSource(input.manualDrawingSource)
      ? input.manualDrawing
      : null);
  const persistedSource =
    input.reconstructedSource ??
    (isPersistedRouteSource(input.manualDrawingSource)
      ? input.manualDrawingSource
      : null);

  if (!persistedDrawing || !isRenderableDrawing(persistedDrawing)) {
    return null;
  }

  return {
    drawing: persistedDrawing,
    source: persistedSource ?? "routed",
    operationalRoute: null,
  };
}

function resolveExplicitGeometryMethod(
  input: FinalActionGeometryInput,
  gpxTagged: boolean,
  operationalRoute: OperationalRoute | null,
  operationalCandidate: Pick<FinalActionGeometry, "drawing" | "source"> | null,
): FinalActionGeometry | null | undefined {
  if (input.geometryMethod === "location_only") return null;
  if (input.geometryMethod === "gpx_import") return resolveGpxCandidate(input);
  if (input.geometryMethod === "manual" || (!input.geometryMethod && canUseManualCandidate(input, gpxTagged))) {
    return canUseManualCandidate(input, gpxTagged)
      ? { drawing: input.manualDrawing, source: "manual", operationalRoute: null }
      : null;
  }
  if (input.geometryMethod === "generator" || (input.geometryMethod !== "automatic" && operationalRoute && operationalCandidate)) {
    return operationalRoute && operationalCandidate
      ? { ...operationalCandidate, operationalRoute, meetingPoint: getOperationalRouteMeetingPoint(operationalRoute) }
      : null;
  }
  return undefined;
}

/**
 * Selects the one active geometry without routing, snapping, or reconstruction.
 * The order is field tracking, GPX, manual drawing, operational route, persisted geometry, then
 * no active geometry. Persisted route/reference drawings are deliberately kept
 * out of the manual candidate slot.
 */
export function resolveFinalActionGeometry(
  input: FinalActionGeometryInput,
): FinalActionGeometry | null {
  const observedCandidate =
    resolveTrackingCandidate(input) ?? resolveGpxCandidate(input);
  if (observedCandidate) return observedCandidate;

  const gpxTagged = hasGpxTag(input);
  const { route: operationalRoute, candidate: operationalCandidate } =
    resolveOperationalCandidate(input);
  const explicitCandidate = resolveExplicitGeometryMethod(input, gpxTagged, operationalRoute, operationalCandidate);
  if (explicitCandidate !== undefined) return explicitCandidate;

  const persistedCandidate = resolvePersistedCandidate(input);
  if (persistedCandidate) return persistedCandidate;

  return input.geometryMethod === "automatic" ? null : operationalCandidate && operationalRoute
    ? {
        ...operationalCandidate,
        operationalRoute,
        meetingPoint: getOperationalRouteMeetingPoint(operationalRoute),
      }
    : null;
}

/**
 * Splits an editor record's single persisted drawing field into the candidates
 * understood by the final-geometry resolver. This keeps legacy storage
 * compatible while preventing routed/reference geometry from becoming a user
 * drawing during hydration.
 */
export function hydrateActionEditorGeometry(input: {
  drawing?: ActionDrawing | null;
  geometrySource?: ActionGeometrySource | null;
  gpxImport?: ActionGpxImportMetadata | null;
  operationalRoute?: OperationalRoute | null;
  geometryMethod?: ActionGeometryMethod | null;
}): HydratedActionGeometry {
  const drawing = input.drawing ?? null;
  const source =
    input.geometrySource ??
    (input.gpxImport?.source === "gpx_import"
      ? "gpx_import"
      : drawing
        ? "manual"
        : null);
  const manualCandidate = source === "manual" || source === null ? drawing : null;
  const trackingInput = trackingHydrationInput(source, drawing);
  const persistedCandidate = isPersistedRouteSource(source) ? drawing : null;
  const finalGeometry = resolveFinalActionGeometry({
    geometryMethod: input.geometryMethod,
    ...trackingInput,
    gpxDrawing: source === "gpx_import" ? drawing : null,
    gpxImport: input.gpxImport,
    manualDrawing: manualCandidate,
    manualDrawingSource: source,
    operationalRoute: input.operationalRoute,
    reconstructedDrawing: persistedCandidate,
    reconstructedSource: isPersistedRouteSource(source) ? source : null,
  });

  return {
    ...hydratedTrackingState(finalGeometry, drawing),
    manualDrawing:
      finalGeometry?.source === "gpx_import" || finalGeometry?.source === "manual"
        ? drawing
        : null,
    manualDrawingSource:
      finalGeometry?.source === "gpx_import"
        ? "gpx_import"
        : finalGeometry?.source === "manual"
          ? "manual"
          : null,
    reconstructedDrawing: persistedCandidate,
    reconstructedSource: isPersistedRouteSource(source) ? source : null,
    finalGeometry,
  };
}
