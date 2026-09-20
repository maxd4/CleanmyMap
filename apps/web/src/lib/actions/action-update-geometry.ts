import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import type { ActionRow } from "@/types/database";

export function preserveGpxObservation(
  current: ActionRow,
  updateData: Record<string, unknown>,
): void {
  const currentPreparationData = normalizeActionPreparationData(
    current.preparation_data ?? {},
  );
  const hasGpxObservation =
    current.geometry_source === "gpx_import" ||
    currentPreparationData.gpxImport?.source === "gpx_import";
  if (!hasGpxObservation || !updateData["preparation_data"]) return;

  const nextPreparationData = updateData["preparation_data"] as ActionRow["preparation_data"];
  updateData["preparation_data"] = {
    ...nextPreparationData,
    ...(currentPreparationData.routeObservedDistanceKm !== undefined
      ? { routeObservedDistanceKm: currentPreparationData.routeObservedDistanceKm }
      : {}),
    ...(currentPreparationData.gpxImport
      ? { gpxImport: structuredClone(currentPreparationData.gpxImport) }
      : {}),
  };
}
