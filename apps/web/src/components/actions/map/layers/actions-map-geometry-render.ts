import type { ActionDrawing, ActionGeometryKind } from "@/lib/actions/types";
import { normalizeDrawingCoordinates } from "@/lib/actions/geometry/geometry-core";
import type { GeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import { computeCoordinateDistanceMeters } from "./actions-map-geometry-metrics";

type CoordinatePair = [number, number];

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

export const HYPOTHETICAL_GEOMETRY_DASH_ARRAY = "8 8";
export const DEFAULT_GEOMETRY_STROKE_OPACITY = 0.9;

const GEOMETRY_STROKE_WEIGHT_POLICY = [
  { maximumParticipants: 4, weight: 1.75 },
  { maximumParticipants: 9, weight: 2.25 },
  { maximumParticipants: 24, weight: 2.75 },
  { maximumParticipants: 49, weight: 3.25 },
  { maximumParticipants: Number.POSITIVE_INFINITY, weight: 3.75 },
] as const;

const DEFAULT_GEOMETRY_STROKE_WEIGHT = GEOMETRY_STROKE_WEIGHT_POLICY[0].weight;
const MIN_ZOOM_WEIGHT_FACTOR = 0.78;
const MAX_ZOOM_WEIGHT_FACTOR = 1.14;
const ZOOM_WEIGHT_REFERENCE = 10;
const ZOOM_WEIGHT_SLOPE = 0.04;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveParticipantBaseWeight(participantsCount: number | null): number {
  if (participantsCount === null || !Number.isFinite(participantsCount)) {
    return DEFAULT_GEOMETRY_STROKE_WEIGHT;
  }

  const normalizedCount = Math.max(0, Math.trunc(participantsCount));
  return GEOMETRY_STROKE_WEIGHT_POLICY.find(
    ({ maximumParticipants }) => normalizedCount <= maximumParticipants,
  )?.weight ?? DEFAULT_GEOMETRY_STROKE_WEIGHT;
}

/**
 * Keeps business thickness independent from selection and provenance. Leaflet
 * path weights are pixels, so the bounded continuous factor compensates for
 * visual overload when zooming in while preserving tier ratios.
 */
export function resolveGeometryStrokeWeight({
  participantsCount,
  zoom,
}: {
  participantsCount: number | null;
  zoom: number;
}): number {
  const safeZoom = Number.isFinite(zoom) ? zoom : ZOOM_WEIGHT_REFERENCE;
  const zoomFactor = clamp(
    MAX_ZOOM_WEIGHT_FACTOR -
      (safeZoom - ZOOM_WEIGHT_REFERENCE) * ZOOM_WEIGHT_SLOPE,
    MIN_ZOOM_WEIGHT_FACTOR,
    MAX_ZOOM_WEIGHT_FACTOR,
  );
  return resolveParticipantBaseWeight(participantsCount) * zoomFactor;
}

export function formatActionGeometryTooltipTitle(
  kind: "polyline" | "polygon",
): string {
  return kind === "polygon" ? "Zone d'action" : "Parcours d'action";
}

function resolvePointRenderStyle(isFallback: boolean): ActionMapGeometryRenderStyle {
  return { pointRadius: isFallback ? 4.5 : 6, pointWeight: isFallback ? 1.5 : 2, pointOpacity: isFallback ? 0.7 : 0.95, pointFillOpacity: isFallback ? 0.52 : 0.85, strokeWeight: null, strokeOpacity: null, fillOpacity: null, dashArray: undefined };
}

function resolvePolygonRenderStyle(isHypothetical: boolean): ActionMapGeometryRenderStyle {
  return { pointRadius: null, pointWeight: null, pointOpacity: null, pointFillOpacity: null, strokeWeight: null, strokeOpacity: DEFAULT_GEOMETRY_STROKE_OPACITY, fillOpacity: 0.24, dashArray: isHypothetical ? HYPOTHETICAL_GEOMETRY_DASH_ARRAY : undefined };
}

function resolveLineRenderStyle(presentation: GeometryPresentation): ActionMapGeometryRenderStyle {
  const isHypothetical = presentation.variant === "network" || presentation.strokeStyle === "dashed";
  return { pointRadius: null, pointWeight: null, pointOpacity: null, pointFillOpacity: null, strokeWeight: null, strokeOpacity: DEFAULT_GEOMETRY_STROKE_OPACITY, fillOpacity: null, dashArray: isHypothetical ? HYPOTHETICAL_GEOMETRY_DASH_ARRAY : undefined };
}

export function resolveGeometryRenderStyle(
  geometry: Pick<GeometryRenderInput, "kind" | "presentation">,
): ActionMapGeometryRenderStyle {
  if (geometry.kind === "point") {
    return resolvePointRenderStyle(geometry.presentation.strokeStyle === "point");
  }

  if (geometry.kind === "polygon") {
    if (geometry.presentation.origin === "reference" && geometry.presentation.strokeStyle === "solid") {
      return resolvePolygonRenderStyle(false);
    }
    return resolvePolygonRenderStyle(geometry.presentation.strokeStyle === "dashed");
  }
  return resolveLineRenderStyle(geometry.presentation);
}

export function buildDrawingLeafletPositions(
  drawing: ActionDrawing | null | undefined,
): [number, number][] {
  return normalizeDrawingCoordinates(drawing);
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
  return presentation.reality === "planned" || presentation.reality === "estimated"
    ? formatGeometryConfidenceLabel(confidence)
    : null;
}

export type GeometryRenderInput = {
  kind: ActionGeometryKind | "point" | null;
  positions: CoordinatePair[];
  presentation: GeometryPresentation;
};

export function resolvePolylineEndpointMarkers(
  geometry: Pick<GeometryRenderInput, "kind" | "positions"> &
    Partial<Pick<GeometryRenderInput, "presentation">>,
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

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function computeBearing(start: CoordinatePair, end: CoordinatePair): number {
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
