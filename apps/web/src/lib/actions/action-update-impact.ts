import type { ActionUpdateInput } from "./action-update-audit";

const ACTION_IMPACT_FIELDS = [
  "wasteKg",
  "cigaretteButtsMeasurements",
  "cigaretteButtsMassKg",
  "cigaretteButtsVolumeLiters",
  "cigaretteButtsCondition",
  "cigaretteButtsKg",
  "cigaretteButts",
  "cigaretteButtsCount",
  "wasteBreakdown",
  "wasteMeasurementMethod",
  "volunteerParticipation",
  "volunteersCount",
  "durationMinutes",
] as const satisfies ReadonlyArray<keyof ActionUpdateInput>;

export function hasActionImpactUpdate(body: ActionUpdateInput): boolean {
  return ACTION_IMPACT_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
}
