import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";
import {
  computeGemProgression,
  type GemGradeDefinition,
} from "./gem-progression";

export type ActionBalanceContext =
  | "spontaneous"
  | "association"
  | "enterprise";

export type ActionBalanceRow = Pick<
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

const ACTION_BALANCE_GEM_CONFIG = {
  idPrefix: "action-balance",
  iconVariant: "sliders-horizontal",
  tooltip: (definition: GemGradeDefinition) =>
    definition.key.startsWith("pilier-")
      ? "Progression infinie de l équilibre des contextes"
      : definition.threshold === 0
        ? "Aucun cycle équilibré encore"
        : `${definition.threshold} cycles équilibrés complets`,
  visualVariant: (definition: GemGradeDefinition) =>
    definition.threshold < 5 ? "stone" : "precious",
  xp: (definition: GemGradeDefinition) =>
    definition.threshold === 0 ? 0 : 1,
};

const SPONTANEOUS_ASSOCIATION_KEY = "action spontanee";

function normalizeAssociationName(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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
  const seenActionIds = new Set<string>();
  const eligibleRows = rows
    .filter((row) => {
      if (row.status !== "approved" || !validatedActionIds.has(row.id)) {
        return false;
      }
      if (seenActionIds.has(row.id)) {
        return false;
      }
      seenActionIds.add(row.id);
      return true;
    })
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

    spontaneous -= target;
    association -= target;
    enterprise -= target;
  }

  const gradeState = computeGemProgression(
    completedCycles,
    ACTION_BALANCE_GEM_CONFIG,
  );

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
