import {
  extractArrondissementFromLabel,
  inferArrondissementCityFromLabel,
  parseParisArrondissement,
  parseTerritoryArrondissement as parseTerritoryArrondissementValue,
  type ArrondissementCity,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import { findZoneByName, type AreaType } from "@/lib/geo/greater-paris";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type UserLocationType = "residence" | "work";

export type TerritoryLocationLevel =
  | "country"
  | "region"
  | "department"
  | "commune"
  | "arrondissement";

export type TerritoryLocationSelection = {
  country: "France";
  level: TerritoryLocationLevel;
  label: string;
  subtitle: string | null;
  arrondissement: ParisArrondissement | null;
  arrondissementCity: ArrondissementCity | null;
};

export type TerritoryLocationPreference = TerritoryLocationSelection & {
  locationType: UserLocationType;
};

export type UserLocationPreference = {
  arrondissement: ParisArrondissement;
  locationType: UserLocationType;
};

export type GreaterParisLocationPreference = TerritoryLocationPreference;

function parseLocationType(value: unknown): UserLocationType | null {
  if (value === "residence" || value === "work") {
    return value;
  }
  return null;
}

function parseTerritoryArrondissementCity(value: unknown): ArrondissementCity | null {
  if (value === "Paris" || value === "Lyon" || value === "Marseille") {
    return value;
  }
  return null;
}

function parseTerritoryLevel(value: unknown): TerritoryLocationLevel | null {
  if (
    value === "country" ||
    value === "region" ||
    value === "department" ||
    value === "commune" ||
    value === "arrondissement"
  ) {
    return value;
  }

  return null;
}

function normalizeLabel(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function parseTerritoryArrondissement(value: unknown): ParisArrondissement | null {
  const parsed = parseTerritoryArrondissementValue(value);
  if (parsed) {
    return parsed;
  }

  if (typeof value === "string") {
    const extracted = extractArrondissementFromLabel(value);
    return extracted ? parseTerritoryArrondissementValue(extracted) : null;
  }

  return null;
}

function inferTerritoryLevel(metadata: ClerkMetadata, label: string): TerritoryLocationLevel {
  const explicitLevel =
    parseTerritoryLevel(metadata?.["territoryLevel"]) ??
    parseTerritoryLevel(metadata?.["zoneLevel"]);
  if (explicitLevel) {
    return explicitLevel;
  }

  const arrondissement =
    parseTerritoryArrondissement(metadata?.["territoryArrondissement"]) ??
    parseTerritoryArrondissement(metadata?.["parisArrondissement"]) ??
    parseTerritoryArrondissement(label);
  if (arrondissement) {
    return "arrondissement";
  }

  if (typeof metadata?.["territoryCountry"] === "string") {
    return "country";
  }

  if (
    typeof metadata?.["territoryRegion"] === "string" ||
    typeof metadata?.["territoryDepartment"] === "string"
  ) {
    return "department";
  }

  return "commune";
}

function buildTerritorySelectionFromMetadata(
  metadata: ClerkMetadata,
  locationType: UserLocationType,
): TerritoryLocationPreference | null {
  if (!metadata) {
    return null;
  }

  const label =
    normalizeLabel(metadata["territoryLabel"]) ||
    normalizeLabel(metadata["zoneName"]);
  if (!label) {
    return null;
  }

  const arrondissementCity =
    parseTerritoryArrondissementCity(metadata["territoryArrondissementCity"]) ??
    parseTerritoryArrondissementCity(metadata["zoneCity"]) ??
    inferArrondissementCityFromLabel(label) ??
    inferArrondissementCityFromLabel(
      normalizeLabel(metadata["zoneName"]),
    ) ??
    (parseTerritoryArrondissement(metadata["parisArrondissement"]) ? "Paris" : null);

  const territorySelection: TerritoryLocationSelection = {
    country: "France",
    level: inferTerritoryLevel(metadata, label),
    label,
    subtitle:
      normalizeLabel(metadata["territorySubtitle"]) ||
      normalizeLabel(metadata["zoneDepartment"]) ||
      normalizeLabel(metadata["zoneAreaType"]) ||
      null,
    arrondissement:
      parseTerritoryArrondissement(metadata["territoryArrondissement"]) ??
      parseTerritoryArrondissement(metadata["parisArrondissement"]) ??
      parseTerritoryArrondissement(label),
    arrondissementCity,
  };

  return {
    ...territorySelection,
    locationType,
  };
}

export function extractUserLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): UserLocationPreference | null {
  if (!metadata) {
    return null;
  }

  const territoryLocationType =
    parseLocationType(metadata["territoryLocationType"]) ??
    parseLocationType(metadata["zoneLocationType"]) ??
    parseLocationType(metadata["parisLocationType"]);
  const territorySelection = buildTerritorySelectionFromMetadata(
    metadata,
    territoryLocationType ?? "residence",
  );
  if (territorySelection?.arrondissement && territoryLocationType) {
    return {
      arrondissement: territorySelection.arrondissement,
      locationType: territoryLocationType,
    };
  }

  const arrondissement = parseParisArrondissement(metadata["parisArrondissement"]);
  const locationType = parseLocationType(metadata["parisLocationType"]);
  if (!arrondissement || !locationType) {
    return null;
  }
  return { arrondissement, locationType };
}

export function extractTerritoryLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): TerritoryLocationPreference | null {
  if (!metadata) {
    return null;
  }

  const locationType =
    parseLocationType(metadata["territoryLocationType"]) ??
    parseLocationType(metadata["zoneLocationType"]) ??
    parseLocationType(metadata["parisLocationType"]);

  if (!locationType) {
    return null;
  }

  return buildTerritorySelectionFromMetadata(metadata, locationType);
}

export function createTerritoryLocationMetadata(
  selection: TerritoryLocationSelection,
  locationType: UserLocationType,
): Record<string, unknown> {
  return {
    territoryCountry: selection.country,
    territoryLevel: selection.level,
    territoryLabel: selection.label,
    territorySubtitle: selection.subtitle,
    territoryArrondissement: selection.arrondissement,
    territoryArrondissementCity: selection.arrondissementCity,
    territoryLocationType: locationType,
    ...(selection.arrondissement && selection.arrondissementCity === "Paris"
      ? {
          parisArrondissement: selection.arrondissement,
          parisLocationType: locationType,
        }
      : {}),
  };
}

export function createTerritoryLocationMetadataFromLabel(
  label: string,
  locationType: UserLocationType,
  options: {
    level?: TerritoryLocationLevel;
    subtitle?: string | null;
    arrondissement?: unknown;
    arrondissementCity?: unknown;
  } = {},
): Record<string, unknown> | null {
  const normalizedLabel = normalizeLabel(label);
  if (!normalizedLabel) {
    return null;
  }

  const arrondissement =
    parseTerritoryArrondissement(options.arrondissement) ??
    parseTerritoryArrondissement(normalizedLabel);
  const arrondissementCity =
    parseTerritoryArrondissementCity(options.arrondissementCity) ??
    inferArrondissementCityFromLabel(normalizedLabel);

  return createTerritoryLocationMetadata(
    {
      country: "France",
      level: options.level ?? (arrondissement ? "arrondissement" : "commune"),
      label: normalizedLabel,
      subtitle: options.subtitle?.trim() ? options.subtitle.trim() : null,
      arrondissement,
      arrondissementCity,
    },
    locationType,
  );
}

export function createGreaterParisMetadata(
  zone: string,
  department: string,
  areaType: AreaType,
  locationType: UserLocationType,
): Record<string, unknown> {
  const zoneRecord = findZoneByName(zone);
  const selection =
    createTerritoryLocationMetadataFromLabel(zone, locationType, {
      level:
        zoneRecord && zoneRecord.areaType === "paris"
          ? "arrondissement"
          : "commune",
      subtitle: department,
    }) ?? null;

  if (!selection) {
    return {
      zoneName: zone,
      zoneDepartment: department,
      zoneAreaType: areaType,
      zoneLocationType: locationType,
    };
  }

  return {
    ...selection,
    zoneName: zone,
    zoneDepartment: department,
    zoneAreaType: areaType,
    zoneLocationType: locationType,
  };
}

export function createGreaterParisMetadataFromZoneName(
  zoneName: string,
  locationType: UserLocationType,
): Record<string, unknown> | null {
  const normalizedZoneName = zoneName.trim();
  if (!normalizedZoneName) {
    return null;
  }

  const zone = findZoneByName(normalizedZoneName);
  if (!zone) {
    return createTerritoryLocationMetadataFromLabel(normalizedZoneName, locationType);
  }

  return createGreaterParisMetadata(
    zone.name,
    zone.department,
    zone.areaType,
    locationType,
  );
}

export function extractGreaterParisLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): GreaterParisLocationPreference | null {
  return extractTerritoryLocationPreferenceFromMetadata(metadata);
}
