import type { User } from "@clerk/nextjs/server";
import {
  extractParisArrondissementFromLabel,
  isParisArrondissementLabel,
  isParisArrondissement,
  getParisArrondissementLabel,
  parseParisArrondissement,
} from "@/lib/geo/paris-arrondissements";
import {
  createTerritoryLocationMetadataFromLabel,
  extractTerritoryLocationPreferenceFromMetadata,
} from "@/lib/user-location-preference";

export type ProfileRow = {
  id: string;
  handle: string | null;
  display_name_mode: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown> | null;
  paris_arrondissement: number | null;
};

type ProfileMetadata = Record<string, unknown> | null;
type MetadataSource = Record<string, unknown> | null | undefined;

function readMeaningfulMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function extractProfileMetadataFromSource(metadata: MetadataSource): ProfileMetadata {
  if (!metadata) return null;
  const keys = [
    "territoryPreferences",
    "territoryCountry",
    "territoryLevel",
    "territoryLabel",
    "territorySubtitle",
    "territoryArrondissement",
    "territoryArrondissementCity",
    "territoryLocationType",
    "territoryRegion",
    "territoryDepartment",
    "zoneName",
    "zoneLevel",
    "zoneDepartment",
    "zoneAreaType",
    "zoneLocationType",
    "parisArrondissement",
    "parisLocationType",
    "profileSetupCompleted",
    "profileSetupVersion",
    "profileSetupSchemaVersion",
  ] as const;
  const extracted: Record<string, unknown> = {};
  for (const key of keys) {
    const value = metadata[key];
    if (value !== undefined) extracted[key] = value;
  }
  return Object.keys(extracted).length > 0 ? extracted : null;
}

export function extractProfileMetadata(user: User): Record<string, unknown> {
  const sources = [
    user.unsafeMetadata as MetadataSource,
    user.publicMetadata as MetadataSource,
    user.privateMetadata as MetadataSource,
  ];
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    const extracted = extractProfileMetadataFromSource(source);
    if (!extracted) continue;
    for (const [key, value] of Object.entries(extracted)) {
      if (merged[key] === undefined) merged[key] = value;
    }
  }
  return merged;
}

export function resolveProfileArrondissement(
  profileMetadata: Record<string, unknown>,
): number | null {
  const primaryLocation = extractTerritoryLocationPreferenceFromMetadata(profileMetadata);
  const rawArrondissement =
    profileMetadata["territoryArrondissement"] ??
    profileMetadata["parisArrondissement"] ??
    primaryLocation?.arrondissement;
  const parsedArrondissement =
    typeof rawArrondissement === "number"
      ? rawArrondissement
      : typeof rawArrondissement === "string"
        ? parseInt(rawArrondissement, 10)
        : null;
  const metadataZoneName =
    typeof profileMetadata["territoryLabel"] === "string"
      ? profileMetadata["territoryLabel"]
      : typeof profileMetadata["zoneName"] === "string"
        ? profileMetadata["zoneName"]
        : primaryLocation?.label ?? null;
  const inferredArrondissement = metadataZoneName
    ? extractParisArrondissementFromLabel(metadataZoneName)
    : null;
  return parsedArrondissement && parsedArrondissement >= 1 && parsedArrondissement <= 20
    ? parsedArrondissement
    : inferredArrondissement;
}

function normalizeProfileMetadataRecord(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return metadata ? { ...metadata } : {};
}

function normalizeUserLocationType(value: string | null): "residence" | "work" {
  return value === "work" ? "work" : "residence";
}

function hasMeaningfulMetadataValue(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === "string" && value.trim().length === 0);
}

function mergeMissingMetadataValues(
  target: Record<string, unknown>,
  values: Record<string, unknown> | null,
): void {
  if (!values) return;
  for (const [key, value] of Object.entries(values)) {
    if (!hasMeaningfulMetadataValue(target[key])) target[key] = value;
  }
}

function readFirstMeaningfulMetadataString(
  metadata: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = readMeaningfulMetadataString(metadata, key);
    if (value) return value;
  }
  return null;
}

function resolveTerritoryLabel(
  metadata: Record<string, unknown>,
  arrondissement: number | null,
): string | null {
  const label =
    readFirstMeaningfulMetadataString(metadata, ["territoryLabel", "zoneName"]) ??
    extractTerritoryLocationPreferenceFromMetadata(metadata)?.label;
  if (label) return label;
  return isParisArrondissement(arrondissement)
    ? getParisArrondissementLabel(arrondissement)
    : null;
}

function buildTerritoryCompatibilityMetadata(
  mergedMetadata: Record<string, unknown>,
  existingParisArrondissement: number | null | undefined,
): Record<string, unknown> | null {
  const resolvedArrondissement =
    resolveProfileArrondissement(mergedMetadata) ?? existingParisArrondissement ?? null;
  const resolvedParisArrondissement = parseParisArrondissement(resolvedArrondissement);
  const resolvedLocationType = normalizeUserLocationType(
    readFirstMeaningfulMetadataString(mergedMetadata, [
      "territoryLocationType",
      "zoneLocationType",
      "parisLocationType",
    ]) ??
    "residence",
  );
  const resolvedSubtitle =
    readFirstMeaningfulMetadataString(mergedMetadata, [
      "territorySubtitle",
      "zoneDepartment",
      "zoneAreaType",
    ]) ??
    extractTerritoryLocationPreferenceFromMetadata(mergedMetadata)?.subtitle;
  const resolvedLabel = resolveTerritoryLabel(mergedMetadata, resolvedParisArrondissement);
  if (!resolvedLabel) return null;

  const territoryMetadata = createTerritoryLocationMetadataFromLabel(
    resolvedLabel,
    resolvedLocationType,
    {
      subtitle: resolvedSubtitle,
      arrondissement: resolvedArrondissement ?? undefined,
      level: resolvedArrondissement ? "arrondissement" : "commune",
    },
  );
  return {
    ...(territoryMetadata ?? {}),
    zoneName: resolvedLabel,
    zoneDepartment: resolvedSubtitle,
    zoneLocationType: resolvedLocationType,
    territorySubtitle: resolvedSubtitle,
    territoryLocationType: resolvedLocationType,
    territoryCountry: "France",
    territoryLevel: resolvedArrondissement ? "arrondissement" : "commune",
    territoryLabel: resolvedLabel,
    ...(resolvedArrondissement !== null
      ? { territoryArrondissement: resolvedArrondissement }
      : {}),
    ...(resolvedArrondissement !== null && isParisArrondissementLabel(resolvedLabel)
      ? { parisArrondissement: resolvedArrondissement }
      : {}),
    parisLocationType: resolvedLocationType,
  };
}

export function buildCompatibilityProfileMetadata(
  existingProfile: ProfileRow | null,
  profileMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const mergedMetadata = normalizeProfileMetadataRecord(existingProfile?.metadata);
  mergeMissingMetadataValues(mergedMetadata, profileMetadata);
  mergeMissingMetadataValues(
    mergedMetadata,
    buildTerritoryCompatibilityMetadata(mergedMetadata, existingProfile?.paris_arrondissement),
  );
  return mergedMetadata;
}
