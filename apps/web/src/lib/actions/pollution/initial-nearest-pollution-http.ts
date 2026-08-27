import type { ActionMapItem, ActionMapViewportQuery } from "../types";

export async function fetchInitialNearestPollution(params: {
  radiusKm: number;
  viewport: ActionMapViewportQuery;
}): Promise<{ item: ActionMapItem | null }> {
  const query = new URLSearchParams({
    radiusKm: String(params.radiusKm),
    south: String(params.viewport.south),
    west: String(params.viewport.west),
    north: String(params.viewport.north),
    east: String(params.viewport.east),
  });

  const response = await fetch(`/api/actions/map/initial-nearest?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de rechercher la pollution active la plus proche.");
  }

  const body = (await response.json()) as { item?: ActionMapItem | null };
  return { item: body.item ?? null };
}
