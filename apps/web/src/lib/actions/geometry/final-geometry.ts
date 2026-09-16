import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionGpxImportMetadata,
} from "@/lib/actions/types";
import type { OperationalRoute } from "@/lib/route/route-operational";
import { isRenderableDrawing } from "./geometry-resolution";

export type FinalActionGeometry = {
  drawing: ActionDrawing;
  source: ActionGeometrySource;
  /** Present only when the operational route itself is the active geometry. */
  operationalRoute: OperationalRoute | null;
};

export type FinalActionGeometryInput = {
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

/**
 * Selects the one active geometry without routing, snapping, or reconstruction.
 * The order is GPX, manual drawing, operational route, persisted geometry, then
 * no active geometry. Persisted route/reference drawings are deliberately kept
 * out of the manual candidate slot.
 */
export function resolveFinalActionGeometry(
  input: FinalActionGeometryInput,
): FinalActionGeometry | null {
  const gpxTagged =
    input.gpxImport?.source === "gpx_import" ||
    input.manualDrawingSource === "gpx_import";
  if (hasUsableGpxCandidate(input)) {
    return {
      drawing: input.gpxDrawing!,
      source: "gpx_import",
      operationalRoute: null,
    };
  }

  const operationalRoute =
    input.operationalRoute && input.operationalRoute.routes.length > 0
      ? input.operationalRoute
      : null;
  const operationalCandidate = operationalRoute ? routeDrawing(operationalRoute) : null;
  const manualDrawing = input.manualDrawing;
  const canUseManualDrawing =
    !gpxTagged &&
    (!input.manualDrawingSource ||
      input.manualDrawingSource === "manual" ||
      (manualDrawing?.kind === "polygon" && !input.reconstructedDrawing)) &&
    manualDrawing &&
    isRenderableDrawing(manualDrawing);

  if (canUseManualDrawing) {
    return {
      drawing: manualDrawing,
      source: "manual",
      operationalRoute: null,
    };
  }

  if (operationalRoute && operationalCandidate) {
    return {
      ...operationalCandidate,
      operationalRoute,
    };
  }

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

  if (persistedDrawing && isRenderableDrawing(persistedDrawing)) {
    return {
      drawing: persistedDrawing,
      source: persistedSource ?? "routed",
      operationalRoute: null,
    };
  }

  return null;
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
  const persistedCandidate = isPersistedRouteSource(source) ? drawing : null;
  const finalGeometry = resolveFinalActionGeometry({
    gpxDrawing: source === "gpx_import" ? drawing : null,
    gpxImport: input.gpxImport,
    manualDrawing: manualCandidate,
    manualDrawingSource: source,
    operationalRoute: input.operationalRoute,
    reconstructedDrawing: persistedCandidate,
    reconstructedSource: isPersistedRouteSource(source) ? source : null,
  });

  return {
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
