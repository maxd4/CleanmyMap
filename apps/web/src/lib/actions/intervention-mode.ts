export const ACTION_INTERVENTION_MODE_VERSION = "intervention-mode-v1" as const;

export const ACTION_INTERVENTION_MODES = [
  "fixed_area",
  "itinerary",
  "multi_zone",
] as const;

export type ActionInterventionMode = (typeof ACTION_INTERVENTION_MODES)[number];

export type ActionInterventionModeSelection = {
  version: typeof ACTION_INTERVENTION_MODE_VERSION;
  mode: ActionInterventionMode;
};

export function createActionInterventionMode(
  mode: ActionInterventionMode = "fixed_area",
): ActionInterventionModeSelection {
  return { version: ACTION_INTERVENTION_MODE_VERSION, mode };
}

export function normalizeActionInterventionMode(
  value: unknown,
): ActionInterventionModeSelection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ActionInterventionModeSelection>;
  if (candidate.version !== ACTION_INTERVENTION_MODE_VERSION) return undefined;
  return typeof candidate.mode === "string" && ACTION_INTERVENTION_MODES.includes(candidate.mode as ActionInterventionMode)
    ? createActionInterventionMode(candidate.mode as ActionInterventionMode)
    : undefined;
}

export function isRouteInterventionMode(
  mode: ActionInterventionMode | null | undefined,
): mode is "itinerary" | "multi_zone" {
  return mode === "itinerary" || mode === "multi_zone";
}
