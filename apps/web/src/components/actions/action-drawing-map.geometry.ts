import type {
  ActionDrawing,
  ActionGeometrySource,
} from "@/lib/actions/types";
import { normalizeActionDrawing } from "./map/actions-map-geometry.utils";

export type ResolvedDrawnGeometry = {
  drawing: ActionDrawing;
  geometrySource: Extract<ActionGeometrySource, "manual" | "routed">;
};

/**
 * Resolves the provenance of the geometry that will leave the drawing map.
 * A missing or invalid snap keeps the user's actual line and therefore stays
 * manual; only a valid network replacement is routed.
 */
export function resolveDrawnGeometry(
  drawing: ActionDrawing,
  snappedCoordinates?: [number, number][] | null,
): ResolvedDrawnGeometry {
  const normalizedDrawing = normalizeActionDrawing(drawing) ?? drawing;

  if (normalizedDrawing.kind === "polygon") {
    return { drawing: normalizedDrawing, geometrySource: "manual" };
  }

  const snappedDrawing = normalizeActionDrawing({
    kind: "polyline",
    coordinates: snappedCoordinates ?? [],
  });

  if (snappedDrawing) {
    return { drawing: snappedDrawing, geometrySource: "routed" };
  }

  return { drawing: normalizedDrawing, geometrySource: "manual" };
}
