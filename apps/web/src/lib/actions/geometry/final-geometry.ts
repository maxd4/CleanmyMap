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
 * The order is GPX, manual drawing, operational route, then no active geometry.
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
  const manualSource =
    manualDrawingKindIsPolygon(input.manualDrawing)
      ? "manual"
      : input.manualDrawingSource ?? "manual";
  const manualDrawing = input.manualDrawing;
  const canUseManualDrawing =
    !gpxTagged &&
    manualDrawing &&
    isRenderableDrawing(manualDrawing);

  if (canUseManualDrawing) {
    return {
      drawing: manualDrawing,
      source: manualSource,
      operationalRoute: null,
    };
  }

  if (operationalRoute && operationalCandidate) {
    return {
      ...operationalCandidate,
      operationalRoute,
    };
  }

  if (
    input.reconstructedDrawing &&
    isRenderableDrawing(input.reconstructedDrawing)
  ) {
    return {
      drawing: input.reconstructedDrawing,
      source: input.reconstructedSource ?? "routed",
      operationalRoute: null,
    };
  }

  return null;
}

function manualDrawingKindIsPolygon(
  drawing: ActionDrawing | null | undefined,
): boolean {
  return drawing?.kind === "polygon";
}
