import { clerkClient } from "@clerk/nextjs/server";

import {
  CLERK_AGE_BAND_METADATA_KEY,
  CLERK_PARENTAL_CONSENT_METADATA_KEY,
  isOptionalConsentTreatmentAllowed,
  parseAgeBand,
  type AgeBand,
} from "@/lib/minor-consent";

export type OptionalConsentEligibility = {
  ageBand: AgeBand;
  parentalConsentVerified: boolean;
};

const UNKNOWN_ELIGIBILITY: OptionalConsentEligibility = {
  ageBand: "unknown",
  parentalConsentVerified: false,
};

function readEligibility(metadata: Record<string, unknown> | null | undefined): OptionalConsentEligibility {
  return {
    ageBand: parseAgeBand(metadata?.[CLERK_AGE_BAND_METADATA_KEY]),
    parentalConsentVerified:
      metadata?.[CLERK_PARENTAL_CONSENT_METADATA_KEY] === true,
  };
}

export async function getUserOptionalConsentEligibility(
  userId: string,
): Promise<OptionalConsentEligibility> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return readEligibility(user.privateMetadata as Record<string, unknown>);
  } catch {
    return UNKNOWN_ELIGIBILITY;
  }
}

export async function isOptionalConsentTreatmentAllowedForUser(
  userId: string | null,
  fallbackAgeBand: AgeBand = "unknown",
): Promise<boolean> {
  const eligibility = userId
    ? await getUserOptionalConsentEligibility(userId)
    : { ageBand: fallbackAgeBand, parentalConsentVerified: false };

  return isOptionalConsentTreatmentAllowed(eligibility);
}
