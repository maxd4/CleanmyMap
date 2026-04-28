import type { LatLngTuple } from "leaflet";
import type { ActionDrawing, ActionGeometryKind, ActionMapItem } from "@/lib/actions/types";
import {
  getGeometryPresentation,
  mapItemCoordinates,
  mapItemDrawing,
  mapItemShouldRenderPoint,
} from "@/lib/actions/data-contract";
import type { GeometryPresentation } from "@/lib/actions/geometry-presentation";
import { isRenderableDrawing } from "@/lib/actions/derived-geometry";

export type ActionMapGeometryViewModel = {
  kind: ActionGeometryKind | "point" | null;
  renderMode: "point" | "drawing" | "empty";
  positions: [number, number][];
  anchor: LatLngTuple | null;
  pointCount: number;
  confidence: number | null;
  metrics: ActionMapGeometryMetric;
  label: string;
  presentation: GeometryPresentation;
  drawing: ActionDrawing | null;
};

export type ActionMapGeometryMetric = {
  kind: "length" | "area" | null;
  value: number | null;
  label: string | null;
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

export type ActionDrawingValidationTone =
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
  point: [number, number] | null | undefined,
): [number, number] | null {
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
  left: [number, number],
  right: [number, number],
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function computePolylineLengthMeters(coordinates: [number, number][]): number | null {
  if (coordinates.length < 2) {
    return null;
  }

  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const [previousLat, previousLng] = coordinates[index - 1];
    const [currentLat, currentLng] = coordinates[index];
    const deltaLat = toRadians(currentLat - previousLat);
    const deltaLng = toRadians(currentLng - previousLng);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(previousLat)) *
        Math.cos(toRadians(currentLat)) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    total += 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return total;
}

function computePolygonAreaSquareMeters(
  coordinates: [number, number][],
): number | null {
  if (coordinates.length < 3) {
    return null;
  }

  const meanLatitude =
    coordinates.reduce((sum, [latitude]) => sum + latitude, 0) /
    coordinates.length;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    111_320 * Math.max(0.1, Math.cos(toRadians(meanLatitude)));

  const projected = coordinates.map(([latitude, longitude]) => [
    longitude * metersPerDegreeLng,
    latitude * metersPerDegreeLat,
  ]);

  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const [x1, y1] = projected[index];
    const [x2, y2] = projected[(index + 1) % projected.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function formatDistanceLabel(meters: number): string {
  if (meters >= 1000) {
    return `Longueur ~ ${(meters / 1000).toFixed(1).replace(".", ",")} km`;
  }
  return `Longueur ~ ${Math.round(meters)} m`;
}

function formatAreaLabel(squareMeters: number): string {
  if (squareMeters >= 10_000) {
    return `Surface ~ ${(squareMeters / 10_000).toFixed(1).replace(".", ",")} ha`;
  }
  return `Surface ~ ${Math.round(squareMeters)} m²`;
}

function resolveGeometryMetric(
  kind: ActionGeometryKind | "point" | null,
  coordinates: [number, number][],
): ActionMapGeometryMetric {
  if (kind === "polyline") {
    const lengthMeters = computePolylineLengthMeters(coordinates);
    return {
      kind: "length",
      value: lengthMeters,
      label: lengthMeters === null ? null : formatDistanceLabel(lengthMeters),
    };
  }

  if (kind === "polygon") {
    const areaSquareMeters = computePolygonAreaSquareMeters(coordinates);
    return {
      kind: "area",
      value: areaSquareMeters,
      label: areaSquareMeters === null ? null : formatAreaLabel(areaSquareMeters),
    };
  }

  return {
    kind: null,
    value: null,
    label: null,
  };
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

  const isEstimated = geometry.presentation.strokeStyle === "dashed";
  if (geometry.kind === "polygon") {
    return {
      pointRadius: null,
      pointWeight: null,
      pointOpacity: null,
      pointFillOpacity: null,
      strokeWeight: 2,
      strokeOpacity: isEstimated ? 0.8 : 0.95,
      fillOpacity: isEstimated ? 0.14 : 0.24,
      dashArray: isEstimated ? "8 8" : undefined,
    };
  }

  return {
    pointRadius: null,
    pointWeight: null,
    pointOpacity: null,
    pointFillOpacity: null,
    strokeWeight: 4,
    strokeOpacity: isEstimated ? 0.75 : 0.92,
    fillOpacity: null,
    dashArray: isEstimated ? "8 8" : undefined,
  };
}

export function normalizeDrawingCoordinates(
  drawing: Pick<ActionDrawing, "coordinates"> | null | undefined,
): [number, number][] {
  if (!drawing) {
    return [];
  }

  return drawing.coordinates.reduce<[number, number][]>((acc, point) => {
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
  coordinates: [number, number][],
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

export function formatGeometryModeLabel(
  presentation: GeometryPresentation,
): string {
  if (presentation.reality === "real") {
    return "Géométrie réelle";
  }
  if (presentation.reality === "estimated") {
    return "Géométrie estimée";
  }
  return "Point fallback";
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
    return {
      kind: drawing.kind,
      renderMode: "drawing",
      positions: coordinates,
      anchor: resolveAnchorFromCoordinates(coordinates),
      pointCount: coordinates.length,
      confidence,
      metrics: resolveGeometryMetric(drawing.kind, coordinates),
      label: presentation.label,
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
      metrics: resolveGeometryMetric("point", [anchor]),
      label: presentation.label,
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
    metrics: resolveGeometryMetric(null, []),
    label: presentation.label,
    presentation,
    drawing: null,
  };
}

export function resolveInfrastructureAnchor(
  item: ActionMapItem,
): LatLngTuple | null {
  return resolveActionMapGeometryViewModel(item).anchor;
}
