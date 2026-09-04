import {
  extractArrondissementFromLabel,
  inferArrondissementCityFromLabel,
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

/** Canonical independent onboarding preferences stored in Clerk unsafeMetadata. */
export type UserLocationPreferences = {
  residence: TerritoryLocationSelection | null;
  work: TerritoryLocationSelection | null;
};

export type GreaterParisLocationPreference = TerritoryLocationPreference;

export const TERRITORY_PREFERENCES_METADATA_KEY = "territoryPreferences";

const LEGACY_TERRITORY_METADATA_KEYS = [
  "territoryCountry",
  "territoryLevel",
  "territoryLabel",
  "territorySubtitle",
  "territoryArrondissement",
  "territoryArrondissementCity",
  "territoryLocationType",
  "territoryRegion",
  "territoryDepartment",
  "parisArrondissement",
  "parisLocationType",
  "zoneName",
  "zoneDepartment",
  "zoneAreaType",
  "zoneLocationType",
  "zoneLevel",
  "zoneCity",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function parseCanonicalSelection(value: unknown): TerritoryLocationSelection | null {
  if (!isRecord(value) || value.country !== "France") {
    return null;
  }

  const label = normalizeLabel(value.label);
  const level = parseTerritoryLevel(value.level);
  if (!label || !level) {
    return null;
  }

  return {
    country: "France",
    level,
    label,
    subtitle: normalizeLabel(value.subtitle) || null,
    arrondissement:
      parseTerritoryArrondissement(value.arrondissement) ??
      parseTerritoryArrondissement(label),
    arrondissementCity:
      parseTerritoryArrondissementCity(value.arrondissementCity) ??
      inferArrondissementCityFromLabel(label),
  };
}

function readCanonicalLocationPreferences(
  metadata: ClerkMetadata,
): UserLocationPreferences | null {
  const raw = metadata?.[TERRITORY_PREFERENCES_METADATA_KEY];
  if (!isRecord(raw) || !("residence" in raw) || !("work" in raw)) {
    return null;
  }

  return {
    residence: parseCanonicalSelection(raw.residence),
    work: parseCanonicalSelection(raw.work),
  };
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

  return {
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
    arrondissementCity:
      parseTerritoryArrondissementCity(metadata["territoryArrondissementCity"]) ??
      parseTerritoryArrondissementCity(metadata["zoneCity"]) ??
      inferArrondissementCityFromLabel(label) ??
      inferArrondissementCityFromLabel(normalizeLabel(metadata["zoneName"])) ??
      (parseTerritoryArrondissement(metadata["parisArrondissement"]) ? "Paris" : null),
    locationType,
  };
}

function readLegacyLocationPreferences(metadata: ClerkMetadata): UserLocationPreferences {
  if (!metadata) {
    return { residence: null, work: null };
  }

  const locationType =
    parseLocationType(metadata["territoryLocationType"]) ??
    parseLocationType(metadata["zoneLocationType"]) ??
    parseLocationType(metadata["parisLocationType"]);
  const selection = locationType
    ? buildTerritorySelectionFromMetadata(metadata, locationType)
    : null;

  if (!selection && locationType) {
    const arrondissement = parseTerritoryArrondissement(metadata["parisArrondissement"]);
    if (arrondissement) {
      const parisSelection: TerritoryLocationSelection = {
        country: "France",
        level: "arrondissement",
        label: `Paris ${arrondissement === 1 ? "1er" : `${arrondissement}e`}`,
        subtitle: null,
        arrondissement,
        arrondissementCity: "Paris",
      };
      return {
        residence: locationType === "residence" ? parisSelection : null,
        work: locationType === "work" ? parisSelection : null,
      };
    }
  }

  if (!selection) {
    return { residence: null, work: null };
  }

  const { locationType: selectedLocationType, ...territorySelection } = selection;
  return {
    residence: selectedLocationType === "residence" ? territorySelection : null,
    work: selectedLocationType === "work" ? territorySelection : null,
  };
}

export function extractLocationPreferencesFromMetadata(
  metadata: ClerkMetadata,
): UserLocationPreferences {
  return readCanonicalLocationPreferences(metadata) ?? readLegacyLocationPreferences(metadata);
}

export function extractUserLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): UserLocationPreference | null {
  const preferences = extractLocationPreferencesFromMetadata(metadata);
  for (const [locationType, selection] of [
    ["residence", preferences.residence],
    ["work", preferences.work],
  ] as const) {
    if (selection?.arrondissement) {
      return { arrondissement: selection.arrondissement, locationType };
    }
  }
  return null;
}

export function extractTerritoryLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): TerritoryLocationPreference | null {
  const preferences = extractLocationPreferencesFromMetadata(metadata);
  if (preferences.residence) {
    return { ...preferences.residence, locationType: "residence" };
  }
  if (preferences.work) {
    return { ...preferences.work, locationType: "work" };
  }
  return null;
}

export function extractResidenceLocationPreferenceFromMetadata(
  metadata: ClerkMetadata,
): TerritoryLocationPreference | null {
  const selection = extractLocationPreferencesFromMetadata(metadata).residence;
  return selection ? { ...selection, locationType: "residence" } : null;
}

export function createLocationPreferencesMetadata(
  preferences: UserLocationPreferences,
): Record<string, unknown> {
  return {
    [TERRITORY_PREFERENCES_METADATA_KEY]: {
      residence: preferences.residence,
      work: preferences.work,
    },
  };
}

/** Remove both the canonical object and all legacy Clerk location fields. */
export function clearLocationPreferenceMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned = { ...metadata };
  delete cleaned[TERRITORY_PREFERENCES_METADATA_KEY];
  for (const key of LEGACY_TERRITORY_METADATA_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}

/** Legacy writer retained for non-onboarding consumers until their contracts migrate. */
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
