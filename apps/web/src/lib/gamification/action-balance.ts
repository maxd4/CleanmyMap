import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";
import {
  loadActionRowsForUser,
  loadValidatedActionIdsForUser,
} from "./progression-data";

export type ActionBalanceContext =
  | "spontaneous"
  | "association"
  | "enterprise";

type ActionBalanceRow = Pick<
  ActionRow,
  "id" | "action_date" | "created_at" | "status" | "notes"
>;

export type ActionBalanceCycleAward = {
  cycleIndex: number;
  requiredPerType: number;
  xpAwarded: number;
  sourceId: string;
  occurredOn: string;
};

export type ActionBalanceSummary = {
  spontaneous: number;
  association: number;
  enterprise: number;
  totalValidated: number;
  balancedCycles: number;
  totalXpAwarded: number;
  currentCycleTarget: number;
  currentCycleProgress: number;
  currentCycleXpReward: number;
  missingCounts: {
    spontaneous: number;
    association: number;
    enterprise: number;
  };
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
  awards: ActionBalanceCycleAward[];
};

const ACTION_BALANCE_GEM_GRADES: GemGrade[] = [
  {
    id: "action-balance-observateur",
    label: "Observateur",
    threshold: 0,
    iconVariant: "sliders-horizontal",
    visualVariant: "stone",
    tooltip: "Aucun cycle équilibré encore",
    xp: 0,
  },
  {
    id: "action-balance-quartz",
    label: "Quartz",
    threshold: 1,
    iconVariant: "sliders-horizontal",
    visualVariant: "stone",
    tooltip: "1 cycle équilibré complet",
    xp: 1,
  },
  {
    id: "action-balance-topaze",
    label: "Topaze",
    threshold: 2,
    iconVariant: "sliders-horizontal",
    visualVariant: "stone",
    tooltip: "2 cycles équilibrés complets",
    xp: 1,
  },
  {
    id: "action-balance-saphir",
    label: "Saphir",
    threshold: 3,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "3 cycles équilibrés complets",
    xp: 1,
  },
  {
    id: "action-balance-rubis",
    label: "Rubis",
    threshold: 5,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "5 cycles équilibrés complets",
    xp: 1,
  },
  {
    id: "action-balance-emeraude",
    label: "Émeraude",
    threshold: 8,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "8 cycles équilibrés complets",
    xp: 1,
  },
  {
    id: "action-balance-diamant",
    label: "Diamant",
    threshold: 10,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "10 cycles équilibrés complets",
    xp: 1,
  },
  {
    id: "action-balance-opale",
    label: "Opale",
    threshold: 15,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "15 cycles équilibrés complets",
    xp: 1,
  },
] as const;

const SPONTANEOUS_ASSOCIATION_KEY = "action spontanee";

function normalizeAssociationName(raw: string | null | undefined): string {
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
    id: `action-balance-pilier-${safeIndex}`,
    label: `Pilier ${toRomanNumeral(safeIndex)}`,
    threshold,
    iconVariant: "sliders-horizontal",
    visualVariant: "precious",
    tooltip: "Progression infinie de l équilibre des contextes",
    xp: 1,
  };
}

function computeGradeState(completedCycles: number): {
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
} {
  const safeCurrent = Math.max(0, Math.trunc(completedCycles));
  const baseGrades = [...ACTION_BALANCE_GEM_GRADES];

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

function compareActionRows(left: ActionBalanceRow, right: ActionBalanceRow): number {
  const leftActionDate = (left.action_date ?? left.created_at ?? "").slice(0, 10);
  const rightActionDate = (right.action_date ?? right.created_at ?? "").slice(0, 10);
  if (leftActionDate !== rightActionDate) {
    return leftActionDate.localeCompare(rightActionDate);
  }

  const leftCreatedAt = left.created_at ?? "";
  const rightCreatedAt = right.created_at ?? "";
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt.localeCompare(rightCreatedAt);
  }

  return left.id.localeCompare(right.id);
}

export function getActionBalanceContext(
  row: Pick<ActionRow, "notes">,
): ActionBalanceContext {
  const associationName = extractActionMetadataFromNotes(row.notes).associationName;
  const normalized = normalizeAssociationName(associationName);

  if (normalized === SPONTANEOUS_ASSOCIATION_KEY) {
    return "spontaneous";
  }
  if (normalized.startsWith("entreprise")) {
    return "enterprise";
  }
  return "association";
}

export function computeActionBalanceSummary(
  rows: ActionBalanceRow[],
  validatedActionIds: Set<string>,
): ActionBalanceSummary {
  const eligibleRows = rows
    .filter((row) => row.status === "approved" && validatedActionIds.has(row.id))
    .slice()
    .sort(compareActionRows);

  let spontaneous = 0;
  let association = 0;
  let enterprise = 0;
  let completedCycles = 0;
  let totalXpAwarded = 0;
  const awards: ActionBalanceCycleAward[] = [];

  for (const row of eligibleRows) {
    const context = getActionBalanceContext(row);
    if (context === "spontaneous") {
      spontaneous += 1;
    } else if (context === "enterprise") {
      enterprise += 1;
    } else {
      association += 1;
    }

    const target = completedCycles + 1;
    if (spontaneous < target || association < target || enterprise < target) {
      continue;
    }

    completedCycles += 1;
    totalXpAwarded += target;
    awards.push({
      cycleIndex: completedCycles,
      requiredPerType: target,
      xpAwarded: target,
      sourceId: row.id,
      occurredOn: (row.action_date ?? row.created_at).slice(0, 10),
    });

    spontaneous = 0;
    association = 0;
    enterprise = 0;
  }

  const gradeState = computeGradeState(completedCycles);

  return {
    spontaneous,
    association,
    enterprise,
    totalValidated: eligibleRows.length,
    balancedCycles: completedCycles,
    totalXpAwarded,
    currentCycleTarget: completedCycles + 1,
    currentCycleProgress: Math.min(spontaneous, association, enterprise),
    currentCycleXpReward: completedCycles + 1,
    missingCounts: {
      spontaneous: Math.max(0, completedCycles + 1 - spontaneous),
      association: Math.max(0, completedCycles + 1 - association),
      enterprise: Math.max(0, completedCycles + 1 - enterprise),
    },
    currentGrade: gradeState.currentGrade,
    nextGrade: gradeState.nextGrade,
    progressPercent: Math.round(
      (Math.min(spontaneous, association, enterprise) /
        Math.max(1, completedCycles + 1)) *
        100,
    ),
    currentLabel: gradeState.currentLabel,
    nextLabel: gradeState.nextLabel,
    awards,
  };
}

export const computeActionBalanceCounts = computeActionBalanceSummary;

export async function loadActionBalanceSummary(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    actionRows?: ActionBalanceRow[];
    validatedActionIds?: Set<string>;
  },
): Promise<ActionBalanceSummary> {
  const [actionRows, validatedActionIds] = await Promise.all([
    options?.actionRows ?? loadActionRowsForUser(supabase, userId),
    options?.validatedActionIds ?? loadValidatedActionIdsForUser(supabase, userId),
  ]);

  return computeActionBalanceSummary(actionRows, validatedActionIds);
}
