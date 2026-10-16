import type { LatLngTuple } from "leaflet";
import type { ActionDrawing, ActionGeometryKind, ActionMapItem } from "@/lib/actions/types";
import {
  mapItemCoordinates,
  mapItemDrawing,
  mapItemShouldRenderPoint,
} from "@/lib/actions/data-contract";
import { getGeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import type { GeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import { resolveGeometryMetric } from "./actions-map-geometry-metrics";
import {
  buildDrawingLeafletPositions,
  formatGeometryModeLabel,
} from "./actions-map-geometry-render";

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
  const storedCoverage = item.contract?.metadata.preparationData?.observedCoverage;
  let coverage = storedCoverage;
  if (!coverage && item.contract?.geometry.geojson) {
    try {
      const parsed = JSON.parse(item.contract.geometry.geojson) as {
        type?: unknown;
        coordinates?: unknown;
      };
      if (parsed.type === "MultiLineString" && Array.isArray(parsed.coordinates)) {
        coverage = {
          type: "MultiLineString",
          coordinates: parsed.coordinates as [number, number][][],
          traceCount: parsed.coordinates.length,
          individualDistancesKm: [],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        };
      }
    } catch {
      coverage = undefined;
    }
  }
  if (!coverage || coverage.type !== "MultiLineString" || !Array.isArray(coverage.coordinates)) {
    return { positions: [], traceCount: 0 };
  }

  const positions = coverage.coordinates
    .map((line) => line
      .map(([longitude, latitude]) => normalizeCoordinatePair([latitude, longitude]))
      .filter((point): point is CoordinatePair => point !== null))
    .filter((line) => line.length >= 2);
  return {
    positions,
    traceCount: Math.max(0, Math.trunc(Number(coverage.traceCount) || positions.length)),
  };
}

export function resolveActionMapGeometryViewModel(
  item: ActionMapItem,
): ActionMapGeometryViewModel {
  const presentation = getGeometryPresentation(item);
  const drawing = mapItemDrawing(item);
  const coverage = resolveObservedCoverage(item);
  const coordinates = buildDrawingLeafletPositions(drawing);
  const confidence =
    item.contract?.geometry.confidence ?? item.geometry_confidence ?? null;

  if (drawing && coordinates.length > 0) {
    const kind = drawing.kind;
    return {
      kind,
      renderMode: "drawing",
      positions: coordinates,
      multiLinePositions: coverage.positions,
      coverageTraceCount: coverage.traceCount,
      anchor: resolveAnchorFromCoordinates(coordinates),
      pointCount: coordinates.length,
      confidence,
      metrics: resolveGeometryMetric(drawing.kind, coordinates, item, presentation),
      label: formatGeometryModeLabel(kind, presentation),
      presentation,
      drawing,
    };
  }

  if (coverage.positions.length > 0) {
    const allCoordinates = coverage.positions.flat();
    const kind = item.contract?.geometry.kind === "multiline" ? "multiline" : "polyline";
    return {
      kind,
      renderMode: "drawing",
      positions: kind === "multiline" ? [] : (coverage.positions[0] ?? []),
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

  const location = mapItemCoordinates(item);
  if (
    mapItemShouldRenderPoint(item) &&
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
