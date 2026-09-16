import type { ActionPreparationData } from "./types";
import {
  CURRENT_ROUTE_DISTANCE_POLICY,
  persistResolvedRouteTargetDistance,
  resolveRouteTargetDistanceFromPreparationData,
  type RouteDistancePolicy,
} from "./route-target-distance";

/**
 * Rebase uniquement la cible de distance sur une nouvelle policy.
 *
 * La préparation est copiée telle quelle autour des trois champs de cible :
 * cette opération ne lit pas la géométrie et ne déclenche aucun provider de
 * routage. Une trace observée, notamment un GPX importé, reste donc intacte.
 */
export function rebaseRouteTargetDistancePolicy(params: {
  preparationData: ActionPreparationData;
  durationMinutes: number | string | null | undefined;
  policy?: RouteDistancePolicy;
}): ActionPreparationData {
  const resolved = resolveRouteTargetDistanceFromPreparationData({
    durationMinutes: params.durationMinutes,
    preparationData: params.preparationData,
    policy: params.policy ?? CURRENT_ROUTE_DISTANCE_POLICY,
  });
  return persistResolvedRouteTargetDistance(params.preparationData, resolved);
}
