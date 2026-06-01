import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { loadActionRowsForUser, loadValidatedActionIdsForUser } from "./progression-data";
import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";

export type ActionBalanceContext = "spontaneous" | "association" | "enterprise";

export type ActionBalanceCounts = {
  spontaneous: number;
  association: number;
  enterprise: number;
  totalValidated: number;
  balancedCycles: number;
};

export type ActionBalanceSummary = ActionBalanceCounts & {
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
};

const SPONTANEOUS_KEY = "action spontanee";
const ENTERPRISE_KEY = "entreprise";
const GEM_BASE_GRADES: GemGrade[] = [
  { id: "balance-observateur", label: "Observateur", threshold: 0, iconVariant: "sliders-horizontal", visualVariant: "stone", tooltip: "Aucun cycle équilibré encore", xp: 0 },
  { id: "balance-quartz", label: "Quartz", threshold: 1, iconVariant: "sliders-horizontal", visualVariant: "stone", tooltip: "1 action dans chaque contexte", xp: 1 },
  { id: "balance-topaze", label: "Topaze", threshold: 3, iconVariant: "sliders-horizontal", visualVariant: "stone", tooltip: "3 cycles équilibrés", xp: 1 },
  { id: "balance-saphir", label: "Saphir", threshold: 5, iconVariant: "sliders-horizontal", visualVariant: "precious", tooltip: "5 cycles équilibrés", xp: 1 },
  { id: "balance-rubis", label: "Rubis", threshold: 8, iconVariant: "sliders-horizontal", visualVariant: "precious", tooltip: "8 cycles équilibrés", xp: 1 },
  { id: "balance-emeraude", label: "Émeraude", threshold: 10, iconVariant: "sliders-horizontal", visualVariant: "precious", tooltip: "10 cycles équilibrés", xp: 1 },
  { id: "balance-diamant", label: "Diamant", threshold: 15, iconVariant: "sliders-horizontal", visualVariant: "precious", tooltip: "15 cycles équilibrés", xp: 1 },
  { id: "balance-opale", label: "Opale", threshold: 20, iconVariant: "sliders-horizontal", visualVariant: "precious", tooltip: "20 cycles équilibrés", xp: 1 },
];

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

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
    id: `balance-pilier-${safeIndex}`,
    label: `Pilier ${toRomanNumeral(safeIndex)}`,
    threshold,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "Progression infinie de l équilibre des contextes",
    xp: 1,
  };
}

export function getActionBalanceContext(row: Pick<ActionRow, "notes">): ActionBalanceContext | null {
  const associationName = extractActionMetadataFromNotes(row.notes).associationName;
  const normalized = normalizeText(associationName);

  if (!normalized) {
    return null;
  }

  if (normalized === SPONTANEOUS_KEY) {
    return "spontaneous";
  }

  if (normalized === ENTERPRISE_KEY || normalized.startsWith("entreprise -")) {
    return "enterprise";
  }

  if (normalized === "sans association") {
    return null;
  }

  return "association";
}

export function computeActionBalanceCounts(
  rows: ActionRow[],
  validatedActionIds: Set<string>,
): ActionBalanceCounts {
  const counts = {
    spontaneous: 0,
    association: 0,
    enterprise: 0,
    totalValidated: 0,
    balancedCycles: 0,
  };

  for (const row of rows) {
    if (row.status !== "approved" || !validatedActionIds.has(row.id)) {
      continue;
    }

    const context = getActionBalanceContext(row);
    if (!context) {
      continue;
    }

    counts[context] += 1;
    counts.totalValidated += 1;
  }

  counts.balancedCycles = Math.min(
    counts.spontaneous,
    counts.association,
    counts.enterprise,
  );

  return counts;
}

function getActionBalanceGrades(current: number): {
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  nextThreshold: number;
} {
  const safeCurrent = Math.max(0, Math.trunc(current));

  if (safeCurrent < GEM_BASE_GRADES[1].threshold) {
    return {
      currentGrade: GEM_BASE_GRADES[0],
      nextGrade: GEM_BASE_GRADES[1],
      nextThreshold: GEM_BASE_GRADES[1].threshold,
    };
  }

  const baseGradesWithoutObserver = GEM_BASE_GRADES.slice(1);
  const lastGemGrade = baseGradesWithoutObserver[baseGradesWithoutObserver.length - 1];
  const firstPilierThreshold = lastGemGrade.threshold + 5;

  if (safeCurrent < firstPilierThreshold) {
    const currentGrade =
      [...baseGradesWithoutObserver].reverse().find((grade) => safeCurrent >= grade.threshold) ??
      baseGradesWithoutObserver[0];
    const nextGrade =
      baseGradesWithoutObserver.find((grade) => grade.threshold > currentGrade.threshold) ??
      buildPilierGrade(2, firstPilierThreshold);
    return {
      currentGrade,
      nextGrade,
      nextThreshold: nextGrade.threshold,
    };
  }

  const pilierIndex = Math.floor((safeCurrent - firstPilierThreshold) / 5) + 2;
  const currentThreshold = firstPilierThreshold + (pilierIndex - 2) * 5;
  const nextThreshold = currentThreshold + 5;
  return {
    currentGrade: buildPilierGrade(pilierIndex, currentThreshold),
    nextGrade: buildPilierGrade(pilierIndex + 1, nextThreshold),
    nextThreshold,
  };
}

export function computeActionBalanceSummary(
  rows: ActionRow[],
  validatedActionIds: Set<string>,
): ActionBalanceSummary {
  const counts = computeActionBalanceCounts(rows, validatedActionIds);
  const gradeState = getActionBalanceGrades(counts.balancedCycles);
  const progressTarget = Math.max(1, gradeState.nextThreshold - gradeState.currentGrade.threshold);
  const progressCurrent = Math.max(
    0,
    Math.min(
      counts.balancedCycles - gradeState.currentGrade.threshold,
      progressTarget,
    ),
  );

  return {
    ...counts,
    currentGrade: gradeState.currentGrade,
    nextGrade: gradeState.nextGrade,
    progressPercent: Math.round((progressCurrent / progressTarget) * 100),
    currentLabel: gradeState.currentGrade.label,
    nextLabel: gradeState.nextGrade?.label ?? null,
  };
}

export const ACTION_BALANCE_GEM_GRADES = GEM_BASE_GRADES;

export async function loadActionBalanceSummary(
  supabase: Parameters<typeof loadActionRowsForUser>[0],
  userId: string,
): Promise<ActionBalanceSummary> {
  const [rows, validatedActionIds] = await Promise.all([
    loadActionRowsForUser(supabase, userId),
    loadValidatedActionIdsForUser(supabase, userId),
  ]);

  return computeActionBalanceSummary(rows, validatedActionIds);
}
