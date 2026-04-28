import { toGeoJsonString } from "@/lib/actions/drawing";
import { mapItemType } from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionCsvRowWithDrawing } from "@/lib/reports/csv";

function resolveCreatedAt(item: ActionMapItem): string {
  return item.contract?.dates.createdAt ?? item.contract?.dates.importedAt ?? "";
}

function resolveObservedAt(item: ActionMapItem): string {
  return item.contract?.dates.observedAt ?? item.action_date;
}

function buildManualDrawingGeoJson(item: ActionMapItem): string | null {
  const manualDrawing = item.contract?.metadata.manualDrawing ?? item.manual_drawing ?? null;
  return toGeoJsonString(manualDrawing);
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
