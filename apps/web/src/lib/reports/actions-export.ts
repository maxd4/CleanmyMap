import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import { buildActionLocationAndMeasuresFields } from "@/lib/actions/contracts/contract-mappers";

export function buildActionsExportBaseFields(contract: ActionDataContract) {
  return {
    ...buildActionLocationAndMeasuresFields(contract),
    created_at: contract.dates.createdAt,
    actor_name: contract.metadata.actorName,
    association_name: contract.metadata.associationName,
    notes: contract.metadata.notes,
    notes_plain: contract.metadata.notesPlain,
    geometry_kind: contract.geometry.kind,
    geometry_geojson: contract.geometry.geojson,
  };
}

export function manualDrawingToGeoJson(
  drawing: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  } | null | undefined,
): string | null {
  if (!drawing) {
    return null;
  }

  return JSON.stringify(
    drawing.kind === "polyline"
      ? {
          type: "LineString",
          coordinates: drawing.coordinates.map(([lat, lng]) => [lng, lat]),
        }
      : {
          type: "Polygon",
          coordinates: [
            drawing.coordinates.map(([lat, lng]) => [lng, lat]),
          ],
        },
  );
}
