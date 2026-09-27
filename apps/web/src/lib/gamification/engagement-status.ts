export const ENGAGEMENT_STATUS_DEFINITIONS = [
  { id: "observateur", label: "Observateur", minimumLevel: 1 },
  { id: "contributeur", label: "Contributeur", minimumLevel: 3 },
  { id: "referent", label: "Référent", minimumLevel: 6 },
  { id: "mentor", label: "Mentor", minimumLevel: 10 },
  { id: "coordinateur", label: "Coordinateur", minimumLevel: 14 },
] as const;

export type EngagementStatusId =
  (typeof ENGAGEMENT_STATUS_DEFINITIONS)[number]["id"];

export type EngagementStatus = (typeof ENGAGEMENT_STATUS_DEFINITIONS)[number];

/**
 * Engagement is qualitative recognition derived from the global level. It is
 * deliberately separate from specialized badge families and from AuthZ roles.
 */
export function resolveEngagementStatus(level: number): EngagementStatus {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1;
  return (
    [...ENGAGEMENT_STATUS_DEFINITIONS]
      .reverse()
      .find((definition) => safeLevel >= definition.minimumLevel) ??
    ENGAGEMENT_STATUS_DEFINITIONS[0]
  );
}
