import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import type { ActionRow } from "@/types/database";
import { hasPriorityObservedGeometry } from "./action-observed-geometry";

export function preserveObservedRouteGeometry(
  current: ActionRow,
  updateData: Record<string, unknown>,
): void {
  const currentPreparationData = normalizeActionPreparationData(
    current.preparation_data ?? {},
  );
  const hasObservedRoute = hasPriorityObservedGeometry(current);
  if (!hasObservedRoute || !updateData["preparation_data"]) return;
  const nextSource = updateData["geometry_source"];
  if (nextSource === "gpx_import" || nextSource === "gps_tracking") return;

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
