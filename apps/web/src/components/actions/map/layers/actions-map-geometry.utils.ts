import type { LatLngTuple } from "leaflet";
import type { ActionDrawing, ActionGeometryKind, ActionMapItem } from "@/lib/actions/types";
import {
  mapItemCoordinates,
  mapItemDrawing,
  mapItemShouldRenderPoint,
} from "@/lib/actions/data-contract";
import { getGeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import type { GeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import { isRenderableDrawing } from "@/lib/actions/geometry/derived-geometry";
import {
  computeCoordinateDistanceMeters,
  resolveGeometryMetric,
  type ActionMapGeometryMetric,
} from "./actions-map-geometry-metrics";
export type { ActionMapGeometryMetric } from "./actions-map-geometry-metrics";

type CoordinatePair = [number, number];

export type ActionMapGeometryViewModel = {
  kind: ActionGeometryKind | "point" | null;
  renderMode: "point" | "drawing" | "empty";
  positions: CoordinatePair[];
  anchor: LatLngTuple | null;
  pointCount: number;
  confidence: number | null;
  metrics: ActionMapGeometryMetric;
  label: string;
  presentation: GeometryPresentation;
  drawing: ActionDrawing | null;
};

export type ActionPolylineEndpointMarkers = {
  start: CoordinatePair;
  end: CoordinatePair;
  isLoop: boolean;
};

export type ActionPolylineDirectionMarker = {
  position: CoordinatePair;
  bearing: number;
};

export type ActionMapGeometryRenderStyle = {
  pointRadius: number | null;
  pointWeight: number | null;
  pointOpacity: number | null;
  pointFillOpacity: number | null;
  strokeWeight: number | null;
  strokeOpacity: number | null;
  fillOpacity: number | null;
  dashArray: string | undefined;
};

type ActionDrawingValidationTone =
  | "neutral"
  | "success"
  | "warning"
  | "error";

export type ActionDrawingValidationSummary = {
  normalized: ActionDrawing | null;
  rawPointCount: number;
  pointCount: number;
  hasDuplicates: boolean;
  isValid: boolean;
  tone: ActionDrawingValidationTone;
  message: string;
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

function areSameCoordinate(
  left: CoordinatePair,
  right: CoordinatePair,
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function formatActionGeometryTooltipTitle(
  kind: "polyline" | "polygon",
  metricLabel: string | null,
): string {
  if (metricLabel) return metricLabel;
  return kind === "polygon" ? "Zone d'action" : "Parcours d'action";
}

export function resolveGeometryRenderStyle(
  geometry: Pick<ActionMapGeometryViewModel, "kind" | "presentation">,
): ActionMapGeometryRenderStyle {
  if (geometry.kind === "point") {
    const isFallback = geometry.presentation.strokeStyle === "point";
    return {
      pointRadius: isFallback ? 4.5 : 6,
      pointWeight: isFallback ? 1.5 : 2,
      pointOpacity: isFallback ? 0.7 : 0.95,
      pointFillOpacity: isFallback ? 0.52 : 0.85,
      strokeWeight: null,
      strokeOpacity: null,
      fillOpacity: null,
      dashArray: undefined,
    };
  }

  if (geometry.kind === "polygon") {
    const isIndicative =
      geometry.presentation.variant === "indicative" ||
      (geometry.presentation.variant === undefined &&
        geometry.presentation.reality === "estimated");
    return {
      pointRadius: null,
      pointWeight: null,
      pointOpacity: null,
      pointFillOpacity: null,
      strokeWeight: 2,
      strokeOpacity: isIndicative ? 0.68 : 0.95,
      fillOpacity: isIndicative ? 0.14 : 0.32,
      dashArray: undefined,
    };
  }

  const isNetworkRoute =
    geometry.presentation.variant === "network" ||
    (geometry.presentation.variant === undefined &&
      geometry.presentation.strokeStyle === "dashed");
  const isIndicativeRoute =
    geometry.presentation.variant === "indicative" &&
    geometry.presentation.strokeStyle === "dashed";
  return {
    pointRadius: null,
    pointWeight: null,
    pointOpacity: null,
    pointFillOpacity: null,
    strokeWeight: 4,
    strokeOpacity: isNetworkRoute ? 0.75 : isIndicativeRoute ? 0.62 : 0.92,
    fillOpacity: null,
    dashArray: isNetworkRoute
      ? "8 8"
      : isIndicativeRoute
        ? "4 8"
        : undefined,
  };
}

function normalizeDrawingCoordinates(
  drawing: Pick<ActionDrawing, "coordinates"> | null | undefined,
): CoordinatePair[] {
  if (!drawing) {
    return [];
  }

  return drawing.coordinates.reduce<CoordinatePair[]>((acc, point) => {
    const normalizedPoint = normalizeCoordinatePair(point);
    if (!normalizedPoint) {
      return acc;
    }

    const previousPoint = acc[acc.length - 1];
    if (previousPoint && areSameCoordinate(previousPoint, normalizedPoint)) {
      return acc;
    }

    acc.push(normalizedPoint);
    return acc;
  }, []);
}

export function normalizeActionDrawing(
  drawing: ActionDrawing | null | undefined,
): ActionDrawing | null {
  if (!drawing) {
    return null;
  }

  const coordinates = normalizeDrawingCoordinates(drawing);
  if (!isRenderableDrawing({ kind: drawing.kind, coordinates })) {
    return null;
  }

  return {
    kind: drawing.kind,
    coordinates,
  };
}

export function summarizeActionDrawingValidation(
  drawing: ActionDrawing | null | undefined,
): ActionDrawingValidationSummary {
  if (!drawing) {
    return {
      normalized: null,
      rawPointCount: 0,
      pointCount: 0,
      hasDuplicates: false,
      isValid: false,
      tone: "neutral",
      message: "Aucun tracé.",
    };
  }

  const rawPointCount = drawing.coordinates.length;
  const coordinates = normalizeDrawingCoordinates(drawing);
  const pointCount = coordinates.length;
  const hasDuplicates = pointCount < rawPointCount;
  const minPoints = drawing.kind === "polygon" ? 3 : 2;
  const normalized =
    isRenderableDrawing({ kind: drawing.kind, coordinates }) && pointCount >= minPoints
      ? { kind: drawing.kind, coordinates }
      : null;

  if (!drawing.coordinates.length) {
    return {
      normalized: null,
      rawPointCount,
      pointCount,
      hasDuplicates,
      isValid: false,
      tone: "error",
      message:
        drawing.kind === "polygon"
          ? "Polygone incomplet."
          : "Tracé incomplet.",
    };
  }

  if (pointCount === 0) {
    return {
      normalized: null,
      rawPointCount,
      pointCount,
      hasDuplicates,
      isValid: false,
      tone: "error",
      message: "Aucune coordonnée exploitable.",
    };
  }

  if (pointCount < minPoints) {
    return {
      normalized: null,
      rawPointCount,
      pointCount,
      hasDuplicates,
      isValid: false,
      tone: "warning",
      message:
        drawing.kind === "polygon"
          ? "3 points minimum pour un polygone."
          : "2 points minimum pour un tracé.",
    };
  }

  return {
    normalized,
    rawPointCount,
    pointCount,
    hasDuplicates,
    isValid: Boolean(normalized),
    tone: hasDuplicates ? "warning" : "success",
    message: hasDuplicates
      ? "Doublons retirés, tracé validé."
      : drawing.kind === "polygon"
        ? "Polygone validé."
        : "Tracé validé.",
  };
}

export function buildDrawingLeafletPositions(
  drawing: ActionDrawing | null | undefined,
): [number, number][] {
  return normalizeDrawingCoordinates(drawing);
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

export function formatGeometryPointCount(pointCount: number): string {
  return pointCount <= 1 ? "1 point" : `${pointCount} points`;
}

export function formatGeometryConfidenceLabel(
  confidence: number | null,
): string | null {
  if (confidence === null || !Number.isFinite(confidence)) {
    return null;
  }

  return `Confiance ${Math.round(confidence * 100)}%`;
}

export function resolveGeometryConfidenceLabel(
  presentation: Pick<GeometryPresentation, "reality">,
  confidence: number | null,
): string | null {
  return presentation.reality === "estimated"
    ? formatGeometryConfidenceLabel(confidence)
    : null;
}

export function resolvePolylineEndpointMarkers(
  geometry: Pick<
    ActionMapGeometryViewModel,
    "kind" | "positions" | "presentation"
  >,
): ActionPolylineEndpointMarkers | null {
  if (geometry.kind !== "polyline" || geometry.positions.length < 2) {
    return null;
  }

  return {
    start: geometry.positions[0],
    end: geometry.positions[geometry.positions.length - 1],
    isLoop:
      computeCoordinateDistanceMeters(
        geometry.positions[0],
        geometry.positions[geometry.positions.length - 1],
      ) <= 5,
  };
}

function computeBearing(
  start: CoordinatePair,
  end: CoordinatePair,
): number {
  const startLatitude = toRadians(start[0]);
  const endLatitude = toRadians(end[0]);
  const deltaLongitude = toRadians(end[1] - start[1]);
  const y = Math.sin(deltaLongitude) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) *
      Math.cos(endLatitude) *
      Math.cos(deltaLongitude);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function resolvePolylineDirectionMarkers(
  positions: CoordinatePair[],
): ActionPolylineDirectionMarker[] {
  if (positions.length < 2) {
    return [];
  }

  const segmentDistances = positions.slice(1).map((position, index) =>
    computeCoordinateDistanceMeters(positions[index], position),
  );
  const totalDistance = segmentDistances.reduce(
    (total, distance) => total + distance,
    0,
  );
  if (totalDistance <= 0) {
    return [];
  }

  return [0.25, 0.5, 0.75].map((ratio) => {
    const targetDistance = totalDistance * ratio;
    let traversedDistance = 0;
    let segmentIndex = 0;

    for (let index = 0; index < segmentDistances.length; index += 1) {
      const segmentDistance = segmentDistances[index];
      if (
        segmentDistance > 0 &&
        targetDistance <= traversedDistance + segmentDistance
      ) {
        segmentIndex = index;
        break;
      }
      traversedDistance += segmentDistance;
      segmentIndex = index;
    }

    const segmentDistance = segmentDistances[segmentIndex];
    const start = positions[segmentIndex];
    const end = positions[segmentIndex + 1];
    const segmentProgress =
      segmentDistance > 0
        ? Math.max(
            0,
            Math.min(
              1,
              (targetDistance -
                segmentDistances
                  .slice(0, segmentIndex)
                  .reduce((total, distance) => total + distance, 0)) /
                segmentDistance,
            ),
          )
        : 0;

    return {
      position: [
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
      ],
      bearing: computeBearing(start, end),
    };
  });
}

export function formatGeometryModeLabel(
  kind: ActionGeometryKind | "point" | null,
  presentation: GeometryPresentation,
): string {
  void kind;
  return presentation.label;
}

export function resolveActionMapGeometryViewModel(
  item: ActionMapItem,
): ActionMapGeometryViewModel {
  const presentation = getGeometryPresentation(item);
  const drawing = mapItemDrawing(item);
  const coordinates = buildDrawingLeafletPositions(drawing);
  const confidence =
    item.contract?.geometry.confidence ?? item.geometry_confidence ?? null;

  if (drawing && coordinates.length > 0) {
    const kind = drawing.kind;
    return {
      kind,
      renderMode: "drawing",
      positions: coordinates,
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
    mapItemShouldRenderPoint(item) &&
    isFiniteCoordinate(location.latitude) &&
    isFiniteCoordinate(location.longitude)
  ) {
    const anchor: [number, number] = [location.latitude, location.longitude];
    return {
      kind: "point",
      renderMode: "point",
      positions: [anchor],
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
