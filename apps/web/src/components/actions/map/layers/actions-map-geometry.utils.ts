import type { LatLngTuple } from "leaflet";
import type { ActionDrawing, ActionGeometryKind, ActionMapItem } from "@/lib/actions/types";
import {
  mapItemCoordinates,
  mapItemDrawing,
  mapItemShouldRenderPoint,
} from "@/lib/actions/data-contract";
import {
  getGeometryPresentation,
  isIndicativeRouteFallback,
} from "@/lib/actions/geometry/geometry-presentation";
import type { GeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import { resolveGeometryMetric } from "./actions-map-geometry-metrics";
import {
  buildDrawingLeafletPositions,
  formatGeometryModeLabel,
} from "./actions-map-geometry-render";
import { resolveObservedCoverageGeometry } from "@/lib/actions/map/observed-coverage";

type CoordinatePair = [number, number];

export type ActionMapGeometryViewModel = {
  kind: ActionGeometryKind | "point" | null;
  renderMode: "point" | "drawing" | "empty";
  positions: CoordinatePair[];
  multiLinePositions: CoordinatePair[][];
  coverageTraceCount: number;
  anchor: LatLngTuple | null;
  pointCount: number;
  confidence: number | null;
  metrics: ReturnType<typeof resolveGeometryMetric>;
  label: string;
  presentation: GeometryPresentation;
  drawing: ActionDrawing | null;
};

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeCoordinatePair(
  point: CoordinatePair | null | undefined,
): CoordinatePair | null {
  if (!point) {
    return null;
  }

  const [latitude, longitude] = point;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function resolveAnchorFromCoordinates(
  coordinates: CoordinatePair[],
): LatLngTuple | null {
  if (coordinates.length === 0) {
    return null;
  }

  const [latitudeSum, longitudeSum] = coordinates.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
    [0, 0],
  );

  return [
    Number((latitudeSum / coordinates.length).toFixed(6)),
    Number((longitudeSum / coordinates.length).toFixed(6)),
  ];
}

function resolveObservedCoverage(item: ActionMapItem): {
  positions: CoordinatePair[][];
  traceCount: number;
} {
  const coverage = resolveObservedCoverageGeometry({
    preparationData: item.contract?.metadata.preparationData,
    primaryGeoJson: item.contract?.geometry.geojson,
  });
  if (!coverage) {
    return { positions: [], traceCount: 0 };
  }

  const positions = coverage.coordinates
    .map((line) => line
      .map(([longitude, latitude]) => normalizeCoordinatePair([latitude, longitude]))
      .filter((point): point is CoordinatePair => point !== null))
    .filter((line) => line.length >= 2);
  return {
    positions,
    traceCount: coverage.traceCount,
  };
}

function shouldRenderPublicDrawing(
  item: ActionMapItem,
  presentation: GeometryPresentation,
): boolean {
  if (presentation.reality === "contextual" || presentation.reality === "location_only") {
    return false;
  }

  const isPreAction = item.contract?.metadata.actionPhase === "pre_action";
  if (
    presentation.origin === "estimated_route" &&
    isIndicativeRouteFallback(item) &&
    !isPreAction
  ) {
    return false;
  }

  return true;
}

export function resolveActionMapGeometryViewModel(
  item: ActionMapItem,
): ActionMapGeometryViewModel {
  const presentation = getGeometryPresentation(item);
  const coverage = resolveObservedCoverage(item);
  const storedDrawing = mapItemDrawing(item);
  const drawing = shouldRenderPublicDrawing(item, presentation) ? storedDrawing : null;
  const coordinates = buildDrawingLeafletPositions(drawing);
  const confidence =
    item.contract?.geometry.confidence ?? item.geometry_confidence ?? null;

  if (coverage.positions.length > 0) {
    const allCoordinates = coverage.positions.flat();
    const kind = "multiline" as const;
    return {
      kind,
      renderMode: "drawing",
      positions: [],
      multiLinePositions: coverage.positions,
      coverageTraceCount: coverage.traceCount,
      anchor: resolveAnchorFromCoordinates(allCoordinates),
      pointCount: allCoordinates.length,
      confidence,
      metrics: resolveGeometryMetric(kind, allCoordinates, item, presentation),
      label: formatGeometryModeLabel(kind, presentation),
      presentation,
      drawing: null,
    };
  }

  if (drawing && coordinates.length > 0) {
    const kind = drawing.kind;
    return {
      kind,
      renderMode: "drawing",
      positions: coordinates,
      multiLinePositions: [],
      coverageTraceCount: 0,
      anchor: resolveAnchorFromCoordinates(coordinates),
      pointCount: coordinates.length,
      confidence,
      metrics: resolveGeometryMetric(drawing.kind, coordinates, item, presentation),
      label: formatGeometryModeLabel(kind, presentation),
      presentation,
      drawing,
    };
  }

  const location = mapItemCoordinates(item);
  if (
    (mapItemShouldRenderPoint(item) || drawing === null) &&
    isFiniteCoordinate(location.latitude) &&
    isFiniteCoordinate(location.longitude)
  ) {
    const anchor: [number, number] = [location.latitude, location.longitude];
    return {
      kind: "point",
      renderMode: "point",
      positions: [anchor],
      multiLinePositions: [],
      coverageTraceCount: 0,
      anchor: anchor as LatLngTuple,
      pointCount: 1,
      confidence,
      metrics: resolveGeometryMetric("point", [anchor], item, presentation),
      label: formatGeometryModeLabel("point", presentation),
      presentation,
      drawing: null,
    };
  }

  return {
    kind: null,
    renderMode: "empty",
    positions: [],
    multiLinePositions: [],
    coverageTraceCount: 0,
    anchor: null,
    pointCount: 0,
    confidence,
    metrics: resolveGeometryMetric(null, [], item, presentation),
    label: formatGeometryModeLabel(null, presentation),
    presentation,
    drawing: null,
  };
}

export function resolveInfrastructureAnchor(
  item: ActionMapItem,
): LatLngTuple | null {
  return resolveActionMapGeometryViewModel(item).anchor;
}
