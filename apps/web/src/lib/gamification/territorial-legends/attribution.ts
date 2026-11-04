import type { ResolvedActionTerritory } from "@/lib/geo/action-territory-resolver";
import type { TerritorialActionFact, TerritorialPart } from "./types";

export const TERRITORIAL_LEGEND_ATTRIBUTION_SCHEMA_VERSION =
  "territorial-legend-attribution-v1" as const;
export const TERRITORIAL_LEGEND_COG_YEAR = 2026 as const;

export type TerritorialLegendAttribution = {
  schemaVersion: typeof TERRITORIAL_LEGEND_ATTRIBUTION_SCHEMA_VERSION;
  source: "geo.api.gouv.fr";
  cogYear: typeof TERRITORIAL_LEGEND_COG_YEAR;
  actionId: string;
  actionDate: string;
  resolvedAt: string;
  sourceFingerprint: string;
  territory: {
    country: TerritorialPart;
    region: TerritorialPart;
    department: TerritorialPart;
    commune: TerritorialPart;
    arrondissement: TerritorialPart | null;
  };
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPart(value: unknown): TerritorialPart | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { code?: unknown; name?: unknown };
  const code = readString(record.code);
  const name = readString(record.name);
  return code && name ? { code, name } : null;
}

function sourceFingerprint(
  actionId: string,
  actionDate: string,
  territory: TerritorialLegendAttribution["territory"],
): string {
  return [
    TERRITORIAL_LEGEND_ATTRIBUTION_SCHEMA_VERSION,
    TERRITORIAL_LEGEND_COG_YEAR,
    actionId,
    actionDate,
    territory.country.code,
    territory.region.code,
    territory.department.code,
    territory.commune.code,
    territory.arrondissement?.code ?? "",
  ].join("|");
}

export function buildTerritorialLegendAttribution(params: {
  actionId: string;
  actionDate: string;
  resolved: ResolvedActionTerritory | null | undefined;
  resolvedAt?: Date;
}): TerritorialLegendAttribution | null {
  const resolved = params.resolved;
  if (
    !resolved ||
    resolved.source !== "geo.api.gouv.fr" ||
    !resolved.region ||
    !resolved.department ||
    !resolved.commune
  ) {
    return null;
  }

  const territory = {
    country: { code: "FR", name: "France" },
    region: resolved.region,
    department: resolved.department,
    commune: resolved.commune,
    arrondissement: resolved.arrondissement ?? null,
  };
  return {
    schemaVersion: TERRITORIAL_LEGEND_ATTRIBUTION_SCHEMA_VERSION,
    source: "geo.api.gouv.fr",
    cogYear: TERRITORIAL_LEGEND_COG_YEAR,
    actionId: params.actionId,
    actionDate: params.actionDate,
    resolvedAt: (params.resolvedAt ?? new Date()).toISOString(),
    sourceFingerprint: sourceFingerprint(params.actionId, params.actionDate, territory),
    territory,
  };
}

export function parseTerritorialLegendAttribution(
  value: unknown,
  expected?: { actionId?: string; actionDate?: string },
): TerritorialActionFact["territory"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as {
    schemaVersion?: unknown;
    source?: unknown;
    cogYear?: unknown;
    actionId?: unknown;
    actionDate?: unknown;
    territory?: unknown;
  };
  if (
    record.schemaVersion !== TERRITORIAL_LEGEND_ATTRIBUTION_SCHEMA_VERSION ||
    record.source !== "geo.api.gouv.fr" ||
    record.cogYear !== TERRITORIAL_LEGEND_COG_YEAR ||
    (expected?.actionId !== undefined && record.actionId !== expected.actionId) ||
    (expected?.actionDate !== undefined && record.actionDate !== expected.actionDate) ||
    !record.territory ||
    typeof record.territory !== "object" ||
    Array.isArray(record.territory)
  ) return null;

  const territory = record.territory as {
    country?: unknown;
    region?: unknown;
    department?: unknown;
    commune?: unknown;
    arrondissement?: unknown;
  };
  const country = readPart(territory.country);
  const region = readPart(territory.region);
  const department = readPart(territory.department);
  const commune = readPart(territory.commune);
  const arrondissement = territory.arrondissement == null
    ? null
    : readPart(territory.arrondissement);
  if (!country || !region || !department || !commune || (territory.arrondissement != null && !arrondissement)) {
    return null;
  }
  return { country, region, department, commune, arrondissement };
}
