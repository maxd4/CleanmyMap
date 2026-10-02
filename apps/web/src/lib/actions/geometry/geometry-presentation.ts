import { ActionGeometryOrigin, ActionMapItem } from "../types";
import { resolveGeometryOriginFromConfidence } from "./derived-geometry";

export type GeometryPresentation = {
  origin: ActionGeometryOrigin;
  reality: "real" | "estimated" | "fallback";
  label: string;
  strokeStyle: "solid" | "dashed" | "point";
};

function toGeometryPresentationOrigin(
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
    case "gpx_import":
      return {
        origin,
        reality: "real",
        label:
          origin === "manual"
            ? "Géométrie déclarée · manuelle"
            : origin === "gpx_import"
              ? "Tracé observé · GPX importé"
              : "Zone de référence · emprise connue",
        strokeStyle: "solid",
      };
    case "routed":
      return {
        origin,
        reality: "estimated",
        label: "Parcours reconstruit · estimation",
        strokeStyle: "dashed",
      };
    case "estimated_route":
      return {
        origin,
        reality: "estimated",
        label: "Parcours estimé · repli local",
        strokeStyle: "dashed",
      };
    case "estimated_area":
      return {
        origin,
        reality: "estimated",
        label: "Zone indicative · emprise estimée",
        strokeStyle: "solid",
      };
    case "fallback_point":
    default:
      return {
        origin: "fallback_point",
        reality: "fallback",
        label: "Localisation seule",
        strokeStyle: "point",
      };
  }
}
