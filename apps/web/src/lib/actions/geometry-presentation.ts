import { ActionGeometryOrigin, ActionMapItem } from "./types";
import { resolveGeometryOriginFromConfidence } from "./derived-geometry";

export type GeometryPresentation = {
  origin: ActionGeometryOrigin;
  reality: "real" | "estimated" | "fallback";
  label: string;
  strokeStyle: "solid" | "dashed" | "point";
};

export function toGeometryPresentationOrigin(
  item: ActionMapItem,
): ActionGeometryOrigin {
  const contractGeometry = item.contract?.geometry;
  const geometrySource =
    item.geometry_source ??
    contractGeometry?.geometrySource ??
    contractGeometry?.origin ??
    null;

  if (geometrySource) {
    return geometrySource as ActionGeometryOrigin;
  }

  return resolveGeometryOriginFromConfidence(
    contractGeometry?.confidence ?? item.geometry_confidence ?? null,
  );
}

/**
 * Retourne les propriétés visuelles et textuelles pour représenter la géométrie d'une action.
 */
export function getGeometryPresentation(
  item: ActionMapItem,
): GeometryPresentation {
  const origin = toGeometryPresentationOrigin(item);
  switch (origin) {
    case "manual":
    case "reference":
      return {
        origin,
        reality: "real",
        label:
          origin === "manual"
            ? "Géométrie réelle · manuelle"
            : "Géométrie réelle · référence",
        strokeStyle: "solid",
      };
    case "routed":
      return {
        origin,
        reality: "estimated",
        label: "Géométrie estimée · routée",
        strokeStyle: "dashed",
      };
    case "estimated_area":
      return {
        origin,
        reality: "estimated",
        label: "Géométrie estimée · zone",
        strokeStyle: "dashed",
      };
    case "fallback_point":
    default:
      return {
        origin: "fallback_point",
        reality: "fallback",
        label: "Point discret · fallback",
        strokeStyle: "point",
      };
  }
}

export function isRealGeometryOrigin(origin: ActionGeometryOrigin): boolean {
  return origin === "manual" || origin === "reference";
}

export function isEstimatedGeometryOrigin(
  origin: ActionGeometryOrigin,
): boolean {
  return origin === "routed" || origin === "estimated_area";
}
