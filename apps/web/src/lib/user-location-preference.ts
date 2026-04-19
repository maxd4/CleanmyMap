import {
  parseParisArrondissement,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type UserLocationType = "residence" | "work";

export type UserLocationPreference = {
  arrondissement: ParisArrondissement;
  locationType: UserLocationType;
};

function parseLocationType(value: unknown): UserLocationType | null {
  if (value === "residence" || value === "work") {
    return value;
  }
  return null;
}

export function extractUserLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): UserLocationPreference | null {
  if (!metadata) {
    return null;
  }
  const arrondissement = parseParisArrondissement(metadata.parisArrondissement);
  const locationType = parseLocationType(metadata.parisLocationType);
  if (!arrondissement || !locationType) {
    return null;
  }
  return { arrondissement, locationType };
}
