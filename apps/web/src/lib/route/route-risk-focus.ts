import type { RoutePickupPreference } from "./route-response-contract";
import type { RouteRiskFocus } from "./route-predicted-targets";

export type EffectiveRouteRiskFocus = RouteRiskFocus;

/**
 * Resolves the single predictive risk branch used for a route calculation.
 * Observed candidates are intentionally outside this preference resolver.
 */
export function resolveEffectiveRiskFocus(input: {
  pickupPreference?: RoutePickupPreference;
  riskFocus?: RouteRiskFocus;
}): EffectiveRouteRiskFocus {
  if (input.pickupPreference === "waste") return "waste";
  if (input.pickupPreference === "cigarette_butts") return "cigaretteButts";
  return input.riskFocus ?? "all";
}
