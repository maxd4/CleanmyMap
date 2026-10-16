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

export function formatActionGeometryTooltipTitle(
  kind: "polyline" | "polygon",
): string {
  return kind === "polygon" ? "Zone d'action" : "Parcours d'action";
}

export function resolveGeometryRenderStyle(
  geometry: Pick<GeometryRenderInput, "kind" | "presentation">,
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
  const isEstimatedRoute =
    geometry.presentation.variant === "estimated" &&
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
      : isIndicativeRoute || isEstimatedRoute
        ? "4 8"
        : undefined,
  };
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
  return presentation.reality === "estimated"
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
