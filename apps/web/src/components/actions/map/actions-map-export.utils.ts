import { toGeoJsonString } from "@/lib/actions/drawing";
import {
  mapItemCoordinates,
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemType,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionCsvRowWithDrawing } from "@/lib/reports/csv";
import { buildDeliverableBaseName } from "@/lib/reports/deliverable-name";
import type { MapViewportState } from "./map-export.types";

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
        if (!Array.isArray(pair) || pair.length < 2) {
          return [];
        }
        const lng = Number(pair[0]);
        const lat = Number(pair[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return [];
        }
        return [[lng, lat] as [number, number]];
      });

      if (coordinates.length >= 2) {
        return { type: "LineString", coordinates };
      }
    }

    if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates)) {
      const rings = (parsed.coordinates as unknown[]).map((ring) =>
        Array.isArray(ring)
          ? (ring as unknown[]).flatMap((pair) => {
              if (!Array.isArray(pair) || pair.length < 2) {
                return [];
              }
              const lng = Number(pair[0]);
              const lat = Number(pair[1]);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return [];
              }
              return [[lng, lat] as [number, number]];
            })
          : [],
      );

      if (rings.length > 0 && rings.every((ring) => ring.length >= 3)) {
        return { type: "Polygon", coordinates: rings };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function resolveGeoJsonGeometry(item: ActionMapItem): GeoJsonGeometry | null {
  const contractGeometry = item.contract?.geometry.geojson ?? item.geometry_geojson ?? null;
  const geometry = parseGeoJsonGeometry(contractGeometry) ?? parseGeoJsonGeometry(buildManualDrawingGeoJson(item));

  if (geometry) {
    return geometry;
  }

  const coords = mapItemCoordinates(item);
  if (coords.latitude === null || coords.longitude === null) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [coords.longitude, coords.latitude],
  };
}

function buildFeatureProperties(item: ActionMapItem): Record<string, unknown> {
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
    geometry_kind: item.contract?.geometry.kind ?? item.geometry_kind ?? null,
    geometry_confidence: item.contract?.geometry.confidence ?? item.geometry_confidence ?? null,
    geometry_source: item.contract?.geometry.geometrySource ?? item.geometry_source ?? null,
    has_manual_drawing: Boolean(item.contract?.metadata.manualDrawing ?? item.manual_drawing),
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
      volunteers_count: contract?.metadata.volunteersCount ?? 0,
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

export function buildActionsMapGeoJson(
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
    features: items.map((item) => ({
      type: "Feature",
      id: item.id,
      geometry: resolveGeoJsonGeometry(item),
      properties: buildFeatureProperties(item),
    })),
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
