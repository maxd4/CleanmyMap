import type { ActionPreparationData } from "./types";
import {
  CURRENT_ROUTE_DISTANCE_POLICY,
  persistResolvedRouteTargetDistance,
  resolveRouteTargetDistanceFromPreparationData,
  type RouteDistancePolicy,
} from "./route-target-distance";

/**
 * Projette la cible sans réécrire une version historique déjà persistée.
 *
 * La préparation est copiée telle quelle autour des trois champs de cible :
 * cette opération ne lit pas la géométrie et ne déclenche aucun provider de
 * routage. Une trace observée, notamment un GPX importé, reste donc intacte.
 * Une candidate sans version est dérivée avec la policy courante ; une
 * candidate versionnée reste immuable jusqu'à une modification explicite.
 */
export function rebaseRouteTargetDistancePolicy(params: {
  preparationData: ActionPreparationData;
  durationMinutes: number | string | null | undefined;
  policy?: RouteDistancePolicy;
}): ActionPreparationData {
  if (params.preparationData.routeTargetDistanceSource === "manual") {
    return persistResolvedRouteTargetDistance(params.preparationData, {
      distanceKm: params.preparationData.routeTargetDistanceKm ?? 0,
      source: "manual",
    });
  }
  if (params.preparationData.routeTargetDistancePolicyVersion) {
    return { ...params.preparationData };
  }
  const resolved = resolveRouteTargetDistanceFromPreparationData({
    durationMinutes: params.durationMinutes,
    preparationData: params.preparationData,
    policy: params.policy ?? CURRENT_ROUTE_DISTANCE_POLICY,
  });
  return persistResolvedRouteTargetDistance(params.preparationData, resolved);
}
