import type { ActionGeometryKind, ActionGeometryOrigin, ActionMapItem } from "../types";
import { resolveGeometryOriginFromConfidence } from "./derived-geometry";

export type GeometryPresentationVariant =
  | "observed"
  | "declared"
  | "reference"
  | "network"
  | "estimated"
  | "indicative"
  | "point";

export type GeometryPresentation = {
  origin: ActionGeometryOrigin;
  reality: "real" | "estimated" | "fallback";
  label: string;
  strokeStyle: "solid" | "dashed" | "point";
  variant?: GeometryPresentationVariant;
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

function toGeometryKind(item: ActionMapItem): ActionGeometryKind | null {
  return item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
}

function isIndicativeRouteFallback(item: ActionMapItem): boolean {
  const preparationData = item.contract?.metadata.preparationData;
  return (
    preparationData?.routeGeometryMode === "fallback" ||
    preparationData?.routeGeometryProvider === "none"
  );
}

function getManualLabel(kind: ActionGeometryKind | null): string {
  if (kind === "polygon") return "Zone d’action";
  if (kind === "polyline") return "Parcours déclaré";
  return "Localisation seule";
}

function buildPresentation(
  origin: ActionGeometryOrigin,
  reality: GeometryPresentation["reality"],
  label: string,
  strokeStyle: GeometryPresentation["strokeStyle"],
  variant: GeometryPresentationVariant,
): GeometryPresentation {
  return { origin, reality, label, strokeStyle, variant };
}

function getEstimatedRoutePresentation(item: ActionMapItem): GeometryPresentation {
  if (isIndicativeRouteFallback(item)) {
    return buildPresentation(
      "estimated_route",
      "estimated",
      "Liaison indicative à vol d’oiseau",
      "dashed",
      "indicative",
    );
  }

  return buildPresentation(
    "estimated_route",
    "estimated",
    "Parcours estimé",
    "dashed",
    "estimated",
  );
}

/**
 * Retourne les propriétés visuelles et textuelles pour représenter la géométrie d'une action.
 */
export function getGeometryPresentation(
  item: ActionMapItem,
): GeometryPresentation {
  const origin = toGeometryPresentationOrigin(item);
  const kind = toGeometryKind(item);
  switch (origin) {
    case "manual":
      return buildPresentation(origin, "real", getManualLabel(kind), "solid", "declared");
    case "reference":
      return buildPresentation(origin, "real", "Zone de référence", "solid", "reference");
    case "gpx_import":
      return buildPresentation(origin, "real", "Trace GPS observée", "solid", "observed");
    case "routed":
      return buildPresentation(origin, "estimated", "Parcours reconstruit", "dashed", "network");
    case "estimated_route":
      return getEstimatedRoutePresentation(item);
    case "estimated_area":
      return buildPresentation(origin, "estimated", "Zone indicative", "solid", "indicative");
    case "fallback_point":
    default:
      return buildPresentation("fallback_point", "fallback", "Localisation seule", "point", "point");
  }
}
