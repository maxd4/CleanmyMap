import {
  parseParisArrondissement,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import {
  findZoneByName,
  type AreaType,
} from "@/lib/geo/greater-paris";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type UserLocationType = "residence" | "work";

export type UserLocationPreference = {
  arrondissement: ParisArrondissement;
  locationType: UserLocationType;
};

export type GreaterParisLocationPreference = {
  zone: string;
  department: string;
  areaType: AreaType;
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
  const arrondissement = parseParisArrondissement(metadata["parisArrondissement"]);
  const locationType = parseLocationType(metadata["parisLocationType"]);
  if (!arrondissement || !locationType) {
    return null;
  }
  return { arrondissement, locationType };
}

export function extractGreaterParisLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): GreaterParisLocationPreference | null {
  if (!metadata) {
    return null;
  }
  const zoneName = typeof metadata["zoneName"] === "string" ? metadata["zoneName"] : null;
  const department = typeof metadata["zoneDepartment"] === "string" ? metadata["zoneDepartment"] : null;
  const areaTypeRaw = typeof metadata["zoneAreaType"] === "string" ? metadata["zoneAreaType"] : null;
  const locationType = parseLocationType(metadata["zoneLocationType"]);

  if (!zoneName || !department || !areaTypeRaw || !locationType) {
    return null;
  }

  const areaType = areaTypeRaw as AreaType;
  const zone = findZoneByName(zoneName);
  if (!zone || zone.department !== department || zone.areaType !== areaType) {
    return null;
  }

  return { zone: zoneName, department, areaType, locationType };
}

export function createGreaterParisMetadata(
  zone: string,
  department: string,
  areaType: AreaType,
  locationType: UserLocationType,
): Record<string, unknown> {
  return {
    zoneName: zone,
    zoneDepartment: department,
    zoneAreaType: areaType,
    zoneLocationType: locationType,
  };
}
