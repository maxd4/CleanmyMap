import type { ActionDataContract } from "@/lib/actions/data-contract";
import { buildZones } from "@/lib/pilotage/overview.zones";
import { buildDateFloor, areaFromLabel } from "@/lib/pilotage/overview.utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";
import {
  buildGemGradeCatalog,
  computeGemProgression,
  type GemGradeDefinition,
} from "./gem-progression";
import { loadActionRowsForUser, loadValidatedActionIdsForUser } from "./progression-data";

export type SensitiveZoneApaisementSummary = {
  eligibleValidatedActions: number;
  sensitiveAreaCount: number;
  sensitiveAreas: string[];
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
};

const SENSITIVE_ZONE_GEM_CONFIG = {
  idPrefix: "sensitive-zone",
  iconVariant: "shield-check",
  tooltip: (definition: GemGradeDefinition) =>
    definition.key.startsWith("pilier-")
      ? "Progression infinie des zones sensibles apaisées"
      : definition.threshold === 0
        ? "Aucune zone sensible apaisée pour le moment"
        : `${definition.threshold} actions validées dans des zones sensibles`,
  visualVariant: (definition: GemGradeDefinition) =>
    definition.threshold < 5 ? "stone" : "precious",
  xp: (definition: GemGradeDefinition) =>
    definition.threshold === 0 ? 0 : 1,
};

export const SENSITIVE_ZONE_GEM_GRADES = buildGemGradeCatalog(
  SENSITIVE_ZONE_GEM_CONFIG,
);

export function deriveSensitiveAreasFromContracts(
  contracts: ActionDataContract[],
  now = new Date(),
): string[] {
  const criticalZones = buildZones(contracts, 120, now)
    .filter((zone) => zone.urgency === "critique")
    .map((zone) => zone.area);

  return [...new Set(criticalZones)];
}

export function computeSensitiveZoneApaisementSummary(params: {
  rows: Pick<ActionRow, "id" | "location_label" | "status">[];
  validatedActionIds: Set<string>;
  sensitiveAreas: Iterable<string>;
}): SensitiveZoneApaisementSummary {
  const sensitiveAreaSet = new Set(
    [...params.sensitiveAreas]
      .map((area) => area.trim())
      .filter((area) => area.length > 0),
  );

  const eligibleValidatedActions = params.rows.filter((row) => {
    if (row.status !== "approved") {
      return false;
    }
    if (!params.validatedActionIds.has(row.id)) {
      return false;
    }
    return sensitiveAreaSet.has(areaFromLabel(row.location_label || ""));
  });

  const gradeState = computeGemProgression(
    eligibleValidatedActions.length,
    SENSITIVE_ZONE_GEM_CONFIG,
  );

  return {
    eligibleValidatedActions: eligibleValidatedActions.length,
    sensitiveAreaCount: sensitiveAreaSet.size,
    sensitiveAreas: [...sensitiveAreaSet].sort((left, right) =>
      left.localeCompare(right),
    ),
    currentGrade: gradeState.currentGrade,
    nextGrade: gradeState.nextGrade,
    progressPercent: gradeState.progressPercent,
    currentLabel: gradeState.currentLabel,
    nextLabel: gradeState.nextLabel,
  };
}

async function loadSensitiveZoneInputs(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    userRows?: ActionRow[];
    validatedActionIds?: Set<string>;
    sensitiveAreas?: string[];
    now?: Date;
  },
): Promise<{
  loadedRows: ActionRow[];
  loadedValidatedActionIds: Set<string>;
  sensitiveAreas: string[];
}> {
  const loadedRows = options?.userRows ?? (await loadActionRowsForUser(supabase, userId));
  const loadedValidatedActionIds =
    options?.validatedActionIds ??
    (await loadValidatedActionIdsForUser(supabase, userId));
  const sensitiveAreas =
    options?.sensitiveAreas ??
    (await loadSensitiveZoneAreasFromContracts(supabase, options?.now ?? new Date()));

  return {
    loadedRows,
    loadedValidatedActionIds,
    sensitiveAreas,
  };
}

async function loadSensitiveZoneAreasFromContracts(
  supabase: SupabaseClient,
  now: Date,
): Promise<string[]> {
  const { fetchUnifiedActionContracts } = await import(
    "@/lib/actions/unified-source"
  );
  const zoneContractsResult = await fetchUnifiedActionContracts(supabase, {
    limit: 6000,
    status: "approved",
    floorDate: buildDateFloor(240),
    requireCoordinates: false,
    types: ["action"],
  });
  return deriveSensitiveAreasFromContracts(zoneContractsResult?.items ?? [], now);
}

export async function loadSensitiveZoneApaisementSummary(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    userRows?: ActionRow[];
    validatedActionIds?: Set<string>;
    sensitiveAreas?: string[];
    now?: Date;
  },
): Promise<SensitiveZoneApaisementSummary> {
  const { loadedRows, loadedValidatedActionIds, sensitiveAreas } =
    await loadSensitiveZoneInputs(supabase, userId, options);

  return computeSensitiveZoneApaisementSummary({
    rows: loadedRows,
    validatedActionIds: loadedValidatedActionIds,
    sensitiveAreas,
  });
}

export function createFallbackSensitiveZoneApaisementSummary(): SensitiveZoneApaisementSummary {
  return computeSensitiveZoneApaisementSummary({
    rows: [],
    validatedActionIds: new Set<string>(),
    sensitiveAreas: [],
  });
}
