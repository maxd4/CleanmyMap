import {
  extractArrondissementFromLabel,
  getArrondissementMunicipalLabel,
  inferArrondissementCityFromLabel,
  parseTerritoryArrondissement as parseTerritoryArrondissementValue,
  type ArrondissementCity,
  type ParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import { findZoneByName, type AreaType } from "@/lib/geo/greater-paris";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type UserLocationType = "residence" | "work";

/** ISO 3166-1 alpha-2 country code used by the canonical preference contract. */
export type CountryCode = string;

export const DEFAULT_COUNTRY_CODE: CountryCode = "FR";

const ISO_3166_ALPHA_2_CODES = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" "),
);

export type TerritoryLocationLevel =
  | "country"
  | "region"
  | "department"
  | "commune"
  | "arrondissement"
  | "locality"
  | "administrative_area"
  | (string & {});

export type TerritoryLocationSelection = {
  country: CountryCode;
  level: TerritoryLocationLevel;
  label: string;
  subtitle: string | null;
  arrondissement: ParisArrondissement | null;
  arrondissementCity: ArrondissementCity | null;
  /** Optional country-specific administrative identifier; never assumed outside France. */
  administrativeCode?: string | null;
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
  "territoryAdministrativeCode",
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

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && ISO_3166_ALPHA_2_CODES.has(value);
}

export function parseCountryCode(value: unknown): CountryCode | null {
  if (value === "France") {
    return DEFAULT_COUNTRY_CODE;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return isCountryCode(normalized) ? normalized : null;
}

function parseTerritoryArrondissementCity(value: unknown): ArrondissementCity | null {
  if (value === "Paris" || value === "Lyon" || value === "Marseille") {
    return value;
  }
  return null;
}

function parseTerritoryLevel(value: unknown): TerritoryLocationLevel | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return /^[a-z][a-z0-9_-]{0,63}$/.test(normalized) ? normalized : null;
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

/** Convert the former single arrondissement field to the canonical territory shape. */
export function createTerritoryLocationSelectionFromLegacyArrondissement(
  value: unknown,
): TerritoryLocationSelection | null {
  const arrondissement = parseTerritoryArrondissement(value);
  if (!arrondissement) {
    return null;
  }

  return {
    country: DEFAULT_COUNTRY_CODE,
    level: "arrondissement",
    label: getArrondissementMunicipalLabel("Paris", arrondissement),
    subtitle: "Compatibilité historique",
    arrondissement,
    arrondissementCity: "Paris",
  };
}

function parseCanonicalSelection(value: unknown): TerritoryLocationSelection | null {
  if (!isRecord(value)) {
    return null;
  }

  const country = parseCountryCode(value.country);
  const label = normalizeLabel(value.label);
  const level = parseTerritoryLevel(value.level);
  if (!country || !label || !level) {
    return null;
  }

  const administrativeCode = normalizeLabel(value.administrativeCode);
  const isFrenchTerritory = country === DEFAULT_COUNTRY_CODE;
  return {
    country,
    level,
    label,
    subtitle: normalizeLabel(value.subtitle) || null,
    arrondissement: isFrenchTerritory
      ? parseTerritoryArrondissement(value.arrondissement) ??
        parseTerritoryArrondissement(label)
      : null,
    arrondissementCity: isFrenchTerritory
      ? parseTerritoryArrondissementCity(value.arrondissementCity) ??
        inferArrondissementCityFromLabel(label)
      : null,
    ...(administrativeCode ? { administrativeCode } : {}),
  };
}

export function hasCanonicalLocationPreferences(metadata: ClerkMetadata): boolean {
  const raw = metadata?.[TERRITORY_PREFERENCES_METADATA_KEY];
  return isRecord(raw) && "residence" in raw && "work" in raw;
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

  const country = parseCountryCode(metadata?.["territoryCountry"]) ?? DEFAULT_COUNTRY_CODE;
  const arrondissement = country === DEFAULT_COUNTRY_CODE
    ? parseTerritoryArrondissement(metadata?.["territoryArrondissement"]) ??
      parseTerritoryArrondissement(metadata?.["parisArrondissement"]) ??
      parseTerritoryArrondissement(label)
    : null;
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

  const country = parseCountryCode(metadata["territoryCountry"]) ?? DEFAULT_COUNTRY_CODE;
  const isFrenchTerritory = country === DEFAULT_COUNTRY_CODE;
  const administrativeCode = normalizeLabel(metadata["territoryAdministrativeCode"]);
  return {
    country,
    level: inferTerritoryLevel(metadata, label),
    label,
    subtitle:
      normalizeLabel(metadata["territorySubtitle"]) ||
      normalizeLabel(metadata["zoneDepartment"]) ||
      normalizeLabel(metadata["zoneAreaType"]) ||
      null,
    arrondissement: isFrenchTerritory
      ? parseTerritoryArrondissement(metadata["territoryArrondissement"]) ??
        parseTerritoryArrondissement(metadata["parisArrondissement"]) ??
        parseTerritoryArrondissement(label)
      : null,
    arrondissementCity: isFrenchTerritory
      ? parseTerritoryArrondissementCity(metadata["territoryArrondissementCity"]) ??
        parseTerritoryArrondissementCity(metadata["zoneCity"]) ??
        inferArrondissementCityFromLabel(label) ??
        inferArrondissementCityFromLabel(normalizeLabel(metadata["zoneName"])) ??
        (parseTerritoryArrondissement(metadata["parisArrondissement"]) ? "Paris" : null)
      : null,
    ...(administrativeCode ? { administrativeCode } : {}),
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
    const country = parseCountryCode(metadata["territoryCountry"]) ?? DEFAULT_COUNTRY_CODE;
    const arrondissement = parseTerritoryArrondissement(metadata["parisArrondissement"]);
    if (country === DEFAULT_COUNTRY_CODE && arrondissement) {
      const parisSelection: TerritoryLocationSelection = {
        country: DEFAULT_COUNTRY_CODE,
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
  return hasCanonicalLocationPreferences(metadata)
    ? readCanonicalLocationPreferences(metadata) ?? { residence: null, work: null }
    : readLegacyLocationPreferences(metadata);
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
  const isFrenchTerritory = parseCountryCode(selection.country) === DEFAULT_COUNTRY_CODE;
  return {
    territoryCountry: selection.country,
    territoryLevel: selection.level,
    territoryLabel: selection.label,
    territorySubtitle: selection.subtitle,
    ...(isFrenchTerritory
      ? {
          territoryArrondissement: selection.arrondissement,
          territoryArrondissementCity: selection.arrondissementCity,
        }
      : {}),
    ...(selection.administrativeCode
      ? { territoryAdministrativeCode: selection.administrativeCode }
      : {}),
    territoryLocationType: locationType,
    ...(isFrenchTerritory && selection.arrondissement && selection.arrondissementCity === "Paris"
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
    country?: CountryCode;
    level?: TerritoryLocationLevel;
    subtitle?: string | null;
    arrondissement?: unknown;
    arrondissementCity?: unknown;
    administrativeCode?: string | null;
  } = {},
): Record<string, unknown> | null {
  const normalizedLabel = normalizeLabel(label);
  if (!normalizedLabel) {
    return null;
  }

  const arrondissement =
    parseCountryCode(options.country ?? DEFAULT_COUNTRY_CODE) === DEFAULT_COUNTRY_CODE
      ? parseTerritoryArrondissement(options.arrondissement) ??
        parseTerritoryArrondissement(normalizedLabel)
      : null;
  const arrondissementCity =
    parseCountryCode(options.country ?? DEFAULT_COUNTRY_CODE) === DEFAULT_COUNTRY_CODE
      ? parseTerritoryArrondissementCity(options.arrondissementCity) ??
        inferArrondissementCityFromLabel(normalizedLabel)
      : null;

  return createTerritoryLocationMetadata(
    {
      country: options.country ?? DEFAULT_COUNTRY_CODE,
      level: options.level ?? (arrondissement ? "arrondissement" : "commune"),
      label: normalizedLabel,
      subtitle: options.subtitle?.trim() ? options.subtitle.trim() : null,
      arrondissement,
      arrondissementCity,
      administrativeCode: options.administrativeCode ?? null,
    },
    locationType,
  );
}

function createGreaterParisMetadata(
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
