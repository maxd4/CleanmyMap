const AGE_BANDS = ["under_15", "15_or_over", "unknown"] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export const AGE_BAND_COOKIE_NAME = "cleanmymap_age_band";
export const CLERK_AGE_BAND_METADATA_KEY = "cleanmymap_age_band";
export const CLERK_PARENTAL_CONSENT_METADATA_KEY =
  "cleanmymap_parental_consent_verified";

export function parseAgeBand(value: unknown): AgeBand {
  return AGE_BANDS.includes(value as AgeBand) ? (value as AgeBand) : "unknown";
}

export function isOptionalConsentTreatmentAllowed({
  ageBand,
  parentalConsentVerified = false,
}: {
  ageBand: AgeBand;
  parentalConsentVerified?: boolean;
}): boolean {
  return ageBand === "15_or_over" ||
    (ageBand === "under_15" && parentalConsentVerified);
}
