import type { ActionDataContract } from "@/lib/actions/data-contract";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { buildZones } from "@/lib/pilotage/overview.zones";
import { buildDateFloor, areaFromLabel } from "@/lib/pilotage/overview.utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";
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

const SENSITIVE_ZONE_GEM_GRADES: GemGrade[] = [
  {
    id: "sensitive-zone-observateur",
    label: "Observateur",
    threshold: 0,
    iconVariant: "shield-check",
    visualVariant: "stone",
    tooltip: "Aucune zone sensible apaisée pour le moment",
    xp: 0,
  },
  {
    id: "sensitive-zone-quartz",
    label: "Quartz",
    threshold: 1,
    iconVariant: "shield-check",
    visualVariant: "stone",
    tooltip: "1 action validée dans une zone sensible",
    xp: 1,
  },
  {
    id: "sensitive-zone-topaze",
    label: "Topaze",
    threshold: 3,
    iconVariant: "shield-check",
    visualVariant: "stone",
    tooltip: "3 actions validées dans des zones sensibles",
    xp: 1,
  },
  {
    id: "sensitive-zone-saphir",
    label: "Saphir",
    threshold: 5,
    iconVariant: "shield-check",
    visualVariant: "precious",
    tooltip: "5 actions validées dans des zones sensibles",
    xp: 1,
  },
  {
    id: "sensitive-zone-rubis",
    label: "Rubis",
    threshold: 8,
    iconVariant: "shield-check",
    visualVariant: "precious",
    tooltip: "8 actions validées dans des zones sensibles",
    xp: 1,
  },
  {
    id: "sensitive-zone-emeraude",
    label: "Émeraude",
    threshold: 10,
    iconVariant: "shield-check",
    visualVariant: "precious",
    tooltip: "10 actions validées dans des zones sensibles",
    xp: 1,
  },
  {
    id: "sensitive-zone-diamant",
    label: "Diamant",
    threshold: 15,
    iconVariant: "shield-check",
    visualVariant: "precious",
    tooltip: "15 actions validées dans des zones sensibles",
    xp: 1,
  },
  {
    id: "sensitive-zone-opale",
    label: "Opale",
    threshold: 20,
    iconVariant: "shield-check",
    visualVariant: "precious",
    tooltip: "20 actions validées dans des zones sensibles",
    xp: 1,
  },
] as const;

function toRomanNumeral(value: number): string {
  if (!Number.isFinite(value) || value < 1) {
    return "I";
  }

  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = Math.max(1, Math.trunc(value));
  let result = "";
  for (const [threshold, glyph] of numerals) {
    while (remaining >= threshold) {
      result += glyph;
      remaining -= threshold;
    }
  }
  return result || "I";
}

function buildPilierGrade(index: number, threshold: number): GemGrade {
  const safeIndex = Math.max(2, Math.trunc(index));
  return {
    id: `sensitive-zone-pilier-${safeIndex}`,
    label: `Pilier ${toRomanNumeral(safeIndex)}`,
    threshold,
    iconVariant: "shield-check",
    visualVariant: "precious",
    tooltip: "Progression infinie des zones sensibles apaisées",
    xp: 1,
  };
}

function computeGradeState(current: number): {
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
} {
  const safeCurrent = Math.max(0, Math.trunc(current));
  const baseGrades = [...SENSITIVE_ZONE_GEM_GRADES];

  if (safeCurrent < baseGrades[1].threshold) {
    return {
      currentGrade: baseGrades[0],
      nextGrade: baseGrades[1],
      progressPercent: 0,
      currentLabel: baseGrades[0].label,
      nextLabel: baseGrades[1].label,
    };
  }

  const lastGemGrade = baseGrades[baseGrades.length - 1];
  const firstPilierThreshold = lastGemGrade.threshold + 5;

  if (safeCurrent < firstPilierThreshold) {
    const currentGrade =
      [...baseGrades].reverse().find((grade) => safeCurrent >= grade.threshold) ??
      baseGrades[0];
    const nextGrade =
      baseGrades.find((grade) => grade.threshold > currentGrade.threshold) ??
      buildPilierGrade(2, firstPilierThreshold);
    const progressStart = currentGrade.threshold;
    const progressEnd = nextGrade.threshold;
    const progressSpan = Math.max(1, progressEnd - progressStart);
    const progressCurrent = Math.max(
      0,
      Math.min(safeCurrent - progressStart, progressSpan),
    );

    return {
      currentGrade,
      nextGrade,
      progressPercent: Math.round((progressCurrent / progressSpan) * 100),
      currentLabel: currentGrade.label,
      nextLabel: nextGrade.label,
    };
  }

  const pilierIndex = Math.floor((safeCurrent - firstPilierThreshold) / 5) + 2;
  const currentThreshold = firstPilierThreshold + (pilierIndex - 2) * 5;
  const nextThreshold = currentThreshold + 5;
  const currentGrade = buildPilierGrade(pilierIndex, currentThreshold);
  const nextGrade = buildPilierGrade(pilierIndex + 1, nextThreshold);
  const progressSpan = Math.max(1, nextThreshold - currentThreshold);
  const progressCurrent = Math.max(
    0,
    Math.min(safeCurrent - currentThreshold, progressSpan),
  );

  return {
    currentGrade,
    nextGrade,
    progressPercent: Math.round((progressCurrent / progressSpan) * 100),
    currentLabel: currentGrade.label,
    nextLabel: nextGrade.label,
  };
}

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

  const gradeState = computeGradeState(eligibleValidatedActions.length);

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
  const [loadedRows, loadedValidatedActionIds, zoneContractsResult] = await Promise.all([
    options?.userRows ? Promise.resolve(options.userRows) : loadActionRowsForUser(supabase, userId),
    options?.validatedActionIds
      ? Promise.resolve(options.validatedActionIds)
      : loadValidatedActionIdsForUser(supabase, userId),
    options?.sensitiveAreas
      ? Promise.resolve(null)
      : fetchUnifiedActionContracts(supabase, {
          limit: 6000,
          status: "approved",
          floorDate: buildDateFloor(240),
          requireCoordinates: false,
          types: ["action"],
        }),
  ]);

  const sensitiveAreas =
    options?.sensitiveAreas ?? deriveSensitiveAreasFromContracts(zoneContractsResult?.items ?? [], options?.now ?? new Date());

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

export { SENSITIVE_ZONE_GEM_GRADES };
