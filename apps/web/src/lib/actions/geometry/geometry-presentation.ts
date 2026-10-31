import type { ActionGeometryKind, ActionGeometryOrigin, ActionMapItem } from "../types";
import { resolveGeometryOriginFromConfidence } from "./derived-geometry";
import { resolveObservedCoverageGeometry } from "@/lib/actions/map/observed-coverage";

type GeometryPresentationVariant =
  | "observed"
  | "declared"
  | "reference"
  | "network"
  | "estimated"
  | "indicative"
  | "planned_gpx"
  | "point";

export type GeometryPresentationReality =
  | "observed"
  | "declared"
  | "planned"
  | "contextual"
  | "location_only"
  /** @deprecated Compatibility for isolated renderer fixtures. */
  | "real"
  | "estimated"
  | "fallback";

export type GeometryPresentation = {
  origin: ActionGeometryOrigin;
  reality: GeometryPresentationReality;
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

export function isIndicativeRouteFallback(item: ActionMapItem): boolean {
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
  reality: GeometryPresentationReality,
  label: string,
  strokeStyle: GeometryPresentation["strokeStyle"],
  variant: GeometryPresentationVariant,
): GeometryPresentation {
  return { origin, reality, label, strokeStyle, variant };
}

function getEstimatedRoutePresentation(item: ActionMapItem): GeometryPresentation {
  if (isIndicativeRouteFallback(item)) {
    if (item.contract?.metadata.actionPhase !== "pre_action") {
      return buildPresentation(
        "estimated_route",
        "location_only",
        "Parcours non documenté",
        "point",
        "point",
      );
    }

    return buildPresentation(
      "estimated_route",
      "planned",
      "Liaison indicative non routée",
      "dashed",
      "indicative",
    );
  }

  return buildPresentation(
    "estimated_route",
    "planned",
    "Itinéraire prévu estimé",
    "dashed",
    "estimated",
  );
}

function buildFallbackPointPresentation(): GeometryPresentation {
  return buildPresentation(
    "fallback_point",
    "location_only",
    "Localisation seule",
    "point",
    "point",
  );
}

/** Uses only the effective fallback representation when historical geometry is unavailable. */
export function getFallbackPointPresentation(item: ActionMapItem): GeometryPresentation {
  const historicalPresentation = getGeometryPresentation(item);
  return historicalPresentation.reality === "contextual" ||
    historicalPresentation.reality === "location_only"
    ? historicalPresentation
    : buildFallbackPointPresentation();
}

function observedTraceCount(item: ActionMapItem): number {
  return resolveObservedCoverageGeometry({
    preparationData: item.contract?.metadata.preparationData,
    primaryGeoJson: item.contract?.geometry.geojson,
  })?.traceCount ?? 0;
}

function hasStoredObservedCoverage(item: ActionMapItem): boolean {
  return resolveObservedCoverageGeometry({
    preparationData: item.contract?.metadata.preparationData,
    primaryGeoJson: item.contract?.geometry.geojson,
  }) !== null;
}

function observedCoverageSources(item: ActionMapItem): ActionGeometryOrigin[] {
  return (item.contract?.metadata.preparationData?.observedCoverage?.sources ?? [])
    .filter((source): source is ActionGeometryOrigin =>
      source === "gpx_import" || source === "gps_tracking",
    );
}

function getGpxProvenancePresentation(item: ActionMapItem): GeometryPresentation | null {
  const preparationData = item.contract?.metadata.preparationData;
  const gpxImport = preparationData?.gpxImport;
  const isPlanned = preparationData?.gpxImportProvenance === "planned" ||
    gpxImport?.intent === "planned" ||
    gpxImport?.provenance === "planned";
  if (isPlanned) {
    return buildPresentation(
      "gpx_import",
      "planned",
      "Parcours GPX prévu",
      "dashed",
      "planned_gpx",
    );
  }
  const isUnknown = preparationData?.gpxImportProvenance === "unknown" ||
    (gpxImport?.intent === "observed" && gpxImport.provenance === "unknown") ||
    (Array.isArray(gpxImport?.files) && gpxImport.intent !== "observed");
  if (isUnknown) {
    return buildPresentation(
      "gpx_import",
      "contextual",
      "Trace GPX à qualifier",
      "dashed",
      "indicative",
    );
  }
  return null;
}

function observedLabel(
  item: ActionMapItem,
  origin: ActionGeometryOrigin | null,
): string {
  if (observedTraceCount(item) > 1) return "Couverture observée multi-traces";
  return (origin === "gpx_import" || observedCoverageSources(item).includes("gpx_import"))
    ? "Trace GPX fournie"
    : "Trace GPS enregistrée";
}

function getOriginPresentation(
  item: ActionMapItem,
  origin: ActionGeometryOrigin,
  kind: ActionGeometryKind | null,
): GeometryPresentation {
  if (origin === "gpx_import") {
    return getGpxProvenancePresentation(item) ?? buildPresentation(origin, "observed", observedLabel(item, origin), "solid", "observed");
  }
  if (origin === "gps_tracking") {
    return buildPresentation(origin, "observed", observedLabel(item, origin), "solid", "observed");
  }
  if (origin === "estimated_route") return getEstimatedRoutePresentation(item);
  if (origin === "manual") return buildPresentation(origin, "declared", getManualLabel(kind), "solid", "declared");
  if (origin === "reference") return buildPresentation(origin, "contextual", "Repère géographique indicatif", "dashed", "reference");
  if (origin === "routed") return buildPresentation(origin, "planned", "Itinéraire prévu sur le réseau", "dashed", "network");
  if (origin === "estimated_area") return buildPresentation(origin, "contextual", "Zone indicative", "dashed", "indicative");
  return buildFallbackPointPresentation();
}

/**
 * Retourne les propriétés visuelles et textuelles pour représenter la géométrie d'une action.
 */
export function getGeometryPresentation(
  item: ActionMapItem,
): GeometryPresentation {
  const origin = toGeometryPresentationOrigin(item);
  const kind = toGeometryKind(item);
  const hasObservedCoverage = hasStoredObservedCoverage(item);
  if (hasObservedCoverage) {
    return buildPresentation(origin, "observed", observedLabel(item, origin), "solid", "observed");
  }
  if (
    kind === "multiline" &&
    (origin === "gps_tracking" || origin === "gpx_import")
  ) {
    return buildFallbackPointPresentation();
  }
  return getOriginPresentation(item, origin, kind);
}
