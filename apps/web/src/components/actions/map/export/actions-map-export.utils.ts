import { toGeoJsonString } from "@/lib/actions/geometry/drawing";
import {
  mapItemCoordinates,
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemType,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import {
  getGeometryPresentation,
  isIndicativeRouteFallback,
} from "@/lib/actions/geometry/geometry-presentation";
import type {
  ActionGeometryKind,
  ActionGeometrySource,
  ActionMapItem,
} from "@/lib/actions/types";
import type { ActionCsvRowWithDrawing } from "@/lib/reports/csv";
import { buildDeliverableBaseName } from "@/lib/reports/deliverable-name";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import {
  resolveObservedCoverageGeometry,
  type ObservedCoverageGeometry,
} from "@/lib/actions/map/observed-coverage";

type GeoJsonGeometry =
  | {
      type: "Point";
      coordinates: [number, number];
    }
  | {
      type: "LineString";
      coordinates: [number, number][];
    }
  | {
      type: "Polygon";
      coordinates: [number, number][][];
    }
  | {
      type: "MultiLineString";
      coordinates: [number, number][][];
    };

type GeoJsonFeature = {
  type: "Feature";
  id: string;
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  metadata: {
    generatedAt: string;
    source: "CleanMyMap";
    subject: "actions-map";
    itemsCount: number;
    viewport: MapViewportState | null;
    zoneQuery: string;
    visibleCount: number;
    loadedCount: number;
    freshnessLabel: string | null;
  };
  features: GeoJsonFeature[];
};

type ActionsMapExportContext = {
  zoneQuery?: string;
  visibleCount?: number;
  loadedCount?: number;
  freshnessLabel?: string | null;
  viewport?: MapViewportState | null;
  generatedAt?: Date;
};

function resolveCreatedAt(item: ActionMapItem): string {
  return item.contract?.dates.createdAt ?? item.contract?.dates.importedAt ?? "";
}

function resolveObservedAt(item: ActionMapItem): string {
  return mapItemObservedAt(item);
}

function buildManualDrawingGeoJson(item: ActionMapItem): string | null {
  const manualDrawing = item.contract?.metadata.manualDrawing ?? item.manual_drawing ?? null;
  return toGeoJsonString(manualDrawing);
}

function parseGeoJsonCoordinatePair(pair: unknown): [number, number] | null {
  if (!Array.isArray(pair) || pair.length < 2) {
    return null;
  }
  const lng = Number(pair[0]);
  const lat = Number(pair[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null;
}

function parseGeoJsonGeometry(raw: string | null | undefined): GeoJsonGeometry | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { type?: unknown; coordinates?: unknown };
    if (parsed?.type === "Point" && Array.isArray(parsed.coordinates)) {
      const [lng, lat] = parsed.coordinates as [number, number];
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { type: "Point", coordinates: [lng, lat] };
      }
    }

    if (parsed?.type === "LineString" && Array.isArray(parsed.coordinates)) {
      const coordinates = (parsed.coordinates as unknown[]).flatMap((pair) => {
        const coordinate = parseGeoJsonCoordinatePair(pair);
        return coordinate ? [coordinate] : [];
      });

      if (coordinates.length >= 2) {
        return { type: "LineString", coordinates };
      }
    }

    if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates)) {
      const rings = (parsed.coordinates as unknown[]).map((ring) =>
        Array.isArray(ring)
          ? (ring as unknown[]).flatMap((pair) => {
              const coordinate = parseGeoJsonCoordinatePair(pair);
              return coordinate ? [coordinate] : [];
            })
          : [],
      );

      if (rings.length > 0 && rings.every((ring) => ring.length >= 3)) {
        return { type: "Polygon", coordinates: rings };
      }
    }

    if (parsed?.type === "MultiLineString" && Array.isArray(parsed.coordinates)) {
      const lines = (parsed.coordinates as unknown[]).map((line) =>
        Array.isArray(line)
          ? (line as unknown[]).flatMap((pair) => {
              const coordinate = parseGeoJsonCoordinatePair(pair);
              return coordinate ? [coordinate] : [];
            })
          : [],
      );

      if (lines.length > 0 && lines.every((line) => line.length >= 2)) {
        return { type: "MultiLineString", coordinates: lines };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function shouldExportPublicDrawing(item: ActionMapItem): boolean {
  const presentation = getGeometryPresentation(item);
  if (presentation.reality === "contextual" || presentation.reality === "location_only") {
    return false;
  }

  const isPreAction = item.contract?.metadata.actionPhase === "pre_action";
  return !(presentation.origin === "estimated_route" && isIndicativeRouteFallback(item) && !isPreAction);
}

type ResolvedExportGeometry = {
  geometry: GeoJsonGeometry | null;
  observedCoverage: ObservedCoverageGeometry | null;
  presentation: ReturnType<typeof getGeometryPresentation>;
  effectiveKind: ActionGeometryKind | null;
  effectiveSource: ActionGeometrySource | null;
  effectiveSources: Extract<ActionGeometrySource, "gps_tracking" | "gpx_import">[] | null;
  effectiveConfidence: number | null;
  historicalKind: ActionGeometryKind | null;
  historicalSource: ActionGeometrySource | null;
  historicalConfidence: number | null;
};

function geometryKind(geometry: GeoJsonGeometry | null): ActionGeometryKind | null {
  switch (geometry?.type) {
    case "Point":
      return "point";
    case "LineString":
      return "polyline";
    case "Polygon":
      return "polygon";
    case "MultiLineString":
      return "multiline";
    default:
      return null;
  }
}

function uniqueObservedSources(
  observedCoverage: ObservedCoverageGeometry | null,
): Extract<ActionGeometrySource, "gps_tracking" | "gpx_import">[] | null {
  const sources = observedCoverage?.sources ?? [];
  return sources.length > 0 ? sources : null;
}

function resolveObservedSource(
  observedCoverage: ObservedCoverageGeometry,
): ActionGeometrySource | null {
  const sources = uniqueObservedSources(observedCoverage) ?? [];
  return sources.length === 1 ? sources[0] : null;
}

function observedGeometryLabel(
  observedCoverage: ObservedCoverageGeometry,
  source: ActionGeometrySource | null,
): string {
  if (observedCoverage.traceCount > 1) return "Couverture observée multi-traces";
  if (source === "gpx_import") return "Trace GPX fournie";
  if (source === "gps_tracking") return "Trace GPS enregistrée";
  return "Couverture observée";
}

function resolveExportGeometry(item: ActionMapItem): ResolvedExportGeometry {
  const historicalKind = item.contract?.geometry.kind ?? item.geometry_kind ?? null;
  const historicalSource =
    item.contract?.geometry.geometrySource ?? item.geometry_source ?? null;
  const historicalConfidence =
    item.contract?.geometry.confidence ?? item.geometry_confidence ?? null;
  const observedCoverage = resolveObservedCoverageGeometry({
    preparationData: item.contract?.metadata.preparationData,
    primaryGeoJson: item.contract?.geometry.geojson,
  });
  if (observedCoverage) {
    const effectiveSource = resolveObservedSource(observedCoverage);
    return {
      geometry: {
        type: "MultiLineString",
        coordinates: observedCoverage.coordinates,
      },
      observedCoverage,
      presentation: {
        origin: effectiveSource ?? "fallback_point",
        reality: "observed",
        label: observedGeometryLabel(observedCoverage, effectiveSource),
        strokeStyle: "solid",
        variant: "observed",
      },
      effectiveKind: "multiline",
      effectiveSource,
      effectiveSources: uniqueObservedSources(observedCoverage),
      effectiveConfidence: null,
      historicalKind,
      historicalSource,
      historicalConfidence,
    };
  }

  const contractGeometry = item.contract?.geometry.geojson ?? item.geometry_geojson ?? null;
  const geometry = shouldExportPublicDrawing(item)
    ? parseGeoJsonGeometry(contractGeometry) ?? parseGeoJsonGeometry(buildManualDrawingGeoJson(item))
    : null;

  if (geometry) {
    const presentation = getGeometryPresentation(item);
    return {
      geometry,
      observedCoverage: null,
      presentation,
      effectiveKind: geometryKind(geometry),
      effectiveSource:
        geometry.type === "Point" && presentation.reality === "contextual"
          ? "fallback_point"
          : historicalSource,
      effectiveSources: null,
      effectiveConfidence:
        geometry.type === "Point" && presentation.reality === "contextual"
          ? null
          : historicalConfidence,
      historicalKind,
      historicalSource,
      historicalConfidence,
    };
  }

  const coords = mapItemCoordinates(item);
  if (coords.latitude === null || coords.longitude === null) {
    return {
      geometry: null,
      observedCoverage: null,
      presentation: getGeometryPresentation(item),
      effectiveKind: null,
      effectiveSource: null,
      effectiveSources: null,
      effectiveConfidence: null,
      historicalKind,
      historicalSource,
      historicalConfidence,
    };
  }

  return {
    geometry: {
      type: "Point",
      coordinates: [coords.longitude, coords.latitude],
    },
    observedCoverage: null,
    presentation: getGeometryPresentation(item),
    effectiveKind: "point",
    effectiveSource: "fallback_point",
    effectiveSources: null,
    effectiveConfidence: null,
    historicalKind,
    historicalSource,
    historicalConfidence,
  };
}

function buildFeatureProperties(
  item: ActionMapItem,
  resolved: ResolvedExportGeometry,
): Record<string, unknown> {
  return {
    id: item.id,
    created_at: resolveCreatedAt(item),
    observed_at: resolveObservedAt(item),
    action_date: item.action_date,
    location_label: mapItemLocationLabel(item),
    record_type: mapItemType(item),
    status: item.status,
    source: item.contract?.source ?? item.source ?? null,
    waste_kg: mapItemWasteKg(item),
    cigarette_butts: mapItemCigaretteButts(item),
    volunteers_count: item.contract?.metadata.volunteersCount ?? item.volunteers_count ?? null,
    duration_minutes: item.contract?.metadata.durationMinutes ?? item.duration_minutes ?? null,
    notes_plain: item.contract?.metadata.notesPlain ?? item.notes_plain ?? null,
    geometry_kind: resolved.effectiveKind,
    geometry_confidence: resolved.effectiveConfidence,
    geometry_source: resolved.effectiveSource,
    geometry_sources: resolved.effectiveSources,
    geometry_label: resolved.presentation.label,
    geometry_reality: resolved.presentation.reality,
    geometry_variant: resolved.presentation.variant ?? null,
    observed_trace_count: resolved.observedCoverage?.traceCount ?? null,
    historical_geometry_kind: resolved.historicalKind,
    historical_geometry_confidence: resolved.historicalConfidence,
    historical_geometry_source: resolved.historicalSource,
    has_manual_drawing: resolved.effectiveSource === "manual",
  };
}

export function toActionsMapCsvRows(
  items: ActionMapItem[],
): ActionCsvRowWithDrawing[] {
  return items.map((item) => {
    const contract = item.contract;
    const manualDrawing = contract?.metadata.manualDrawing ?? item.manual_drawing ?? null;

    return {
      id: item.id,
      created_at: resolveCreatedAt(item),
      action_date: resolveObservedAt(item),
      actor_name: contract?.metadata.actorName ?? null,
      association_name: contract?.metadata.associationName ?? null,
      location_label: contract?.location.label ?? item.location_label,
      latitude: contract?.location.latitude ?? item.latitude,
      longitude: contract?.location.longitude ?? item.longitude,
      waste_kg: contract?.metadata.wasteKg ?? item.waste_kg,
      cigarette_butts: contract?.metadata.cigaretteButts ?? item.cigarette_butts,
      volunteers_count: contract?.metadata.volunteersCount ?? null,
      duration_minutes: contract?.metadata.durationMinutes ?? 0,
      status: contract?.status ?? item.status,
      notes: contract?.metadata.notes ?? null,
      notes_plain: contract?.metadata.notesPlain ?? null,
      record_type: contract?.type ?? mapItemType(item),
      source: contract?.source ?? item.source ?? null,
      observed_at: resolveObservedAt(item),
      geometry_kind: contract?.geometry.kind ?? item.geometry_kind ?? null,
      geometry_geojson: contract?.geometry.geojson ?? item.geometry_geojson ?? null,
      geometry_confidence:
        contract?.geometry.confidence ?? item.geometry_confidence ?? null,
      manual_drawing_kind: manualDrawing?.kind ?? null,
      manual_drawing_points: manualDrawing?.coordinates.length ?? null,
      manual_drawing_coordinates_json: manualDrawing
        ? JSON.stringify(manualDrawing)
        : null,
      manual_drawing_geojson: buildManualDrawingGeoJson(item),
    };
  });
}

function buildActionsMapGeoJson(
  items: ActionMapItem[],
  context: ActionsMapExportContext = {},
): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    metadata: {
      generatedAt: (context.generatedAt ?? new Date()).toISOString(),
      source: "CleanMyMap",
      subject: "actions-map",
      itemsCount: items.length,
      viewport: context.viewport ?? null,
      zoneQuery: context.zoneQuery?.trim() ?? "",
      visibleCount: context.visibleCount ?? items.length,
      loadedCount: context.loadedCount ?? items.length,
      freshnessLabel: context.freshnessLabel ?? null,
    },
    features: items.map((item) => {
      const resolved = resolveExportGeometry(item);
      return {
        type: "Feature",
        id: item.id,
        geometry: resolved.geometry,
        properties: buildFeatureProperties(item, resolved),
      };
    }),
  };
}

export function buildActionsMapGeoJsonString(
  items: ActionMapItem[],
  context: ActionsMapExportContext = {},
): string {
  return JSON.stringify(buildActionsMapGeoJson(items, context), null, 2);
}

export function buildActionsMapGeoJsonFilename(now: Date = new Date()): string {
  return `${buildDeliverableBaseName({ rubrique: "carte_actions", date: now })}.geojson`;
}

export function buildActionsMapPngFilename(now: Date = new Date()): string {
  return `${buildDeliverableBaseName({ rubrique: "carte_actions", date: now })}.png`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
