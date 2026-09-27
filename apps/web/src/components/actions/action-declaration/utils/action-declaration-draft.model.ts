import type { PlannerActionHandoff } from "@/lib/route/route-operational";
import type { FormState } from "../model";

export function applyPlannerActionHandoffToForm(
  form: FormState,
  handoff: PlannerActionHandoff,
): FormState {
  return {
    ...form,
    operationalRoute: handoff.operationalRoute,
    routeCalibrationContext: handoff.routeCalibrationContext,
    plannerProof: handoff.plannerProof,
    departureLocationLabel:
      handoff.operationalRoute.zones.departure.label ?? form.departureLocationLabel,
    midRouteLocationLabel:
      handoff.operationalRoute.zones.midpoint.label ?? form.midRouteLocationLabel,
    arrivalLocationLabel:
      handoff.operationalRoute.zones.arrival.label ?? form.arrivalLocationLabel,
  };
}
