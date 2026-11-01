/**
 * Version identities shared by the statistical projections. SQL migrations
 * repeat these literals because PostgreSQL cannot import TypeScript; the
 * migration-contract tests keep the two owners aligned.
 */
export const ACTION_COLLECTION_REFERENCE_FORMULA_VERSION =
  "action-collection-reference-averages-v1" as const;

export const ACTION_COLLECTION_CONTEXT_FORMULA_VERSION =
  "contextual-effective-units-v1" as const;

export const POLLUTION_SCORE_REFERENCE_FORMULA_VERSION =
  "pollution-score-references-v2" as const;

export const PUBLIC_IMPACT_PROJECTION_VERSION =
  "impact-terrain-public-2026.09-v6" as const;

export const LEGACY_PUBLIC_IMPACT_PROJECTION_VERSIONS = [
  "impact-terrain-public-2026.09-v2",
  "impact-terrain-public-2026.09-v3",
  "impact-terrain-public-2026.09-v4",
  "impact-terrain-public-2026.09-v5",
] as const;

export function isKnownPublicImpactProjectionVersion(
  value: unknown,
): value is string {
  return (
    value === PUBLIC_IMPACT_PROJECTION_VERSION ||
    LEGACY_PUBLIC_IMPACT_PROJECTION_VERSIONS.includes(
      value as (typeof LEGACY_PUBLIC_IMPACT_PROJECTION_VERSIONS)[number],
    )
  );
}
