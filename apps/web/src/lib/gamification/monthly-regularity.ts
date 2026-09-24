import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";
import {
  buildGemGradeCatalog,
  computeGemProgression,
  type GemGradeDefinition,
} from "./gem-progression";

export type MonthlyRegularityMonthAward = {
  monthKey: string;
  occurredOn: string;
  actionCount: number;
  streak: number;
  xpAwarded: number;
  sourceId: string;
};

export type MonthlyRegularitySummary = {
  currentStreak: number;
  eligibleMonths: number;
  currentMonthHasEligibleAction: boolean;
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
  monthlyAwards: MonthlyRegularityMonthAward[];
};

const MONTHLY_REGULARITY_GEM_CONFIG = {
  idPrefix: "monthly-regularity",
  iconVariant: "calendar-days",
  tooltip: (definition: GemGradeDefinition) =>
    definition.key.startsWith("pilier-")
      ? "Progression infinie de la régularité mensuelle"
      : definition.threshold === 0
        ? "Aucune série mensuelle active"
        : `${definition.threshold} mois consécutifs avec participation`,
  visualVariant: (definition: GemGradeDefinition) =>
    definition.threshold < 5 ? "stone" : "precious",
  xp: (definition: GemGradeDefinition) =>
    definition.threshold === 0 ? 0 : 1,
};

function normalizeIsoDate(raw: string | null | undefined): string {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}

function getMonthKey(raw: string): string {
  return raw.slice(0, 7);
}

function currentMonthKey(referenceDate: Date): string {
  return referenceDate.toISOString().slice(0, 7);
}

function previousMonthKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  if (month <= 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function isConsecutiveMonth(previousKey: string, currentKey: string): boolean {
  return previousMonthKey(currentKey) === previousKey;
}

export const MONTHLY_REGULARITY_GEM_GRADES = buildGemGradeCatalog(
  MONTHLY_REGULARITY_GEM_CONFIG,
);

export function computeMonthlyRegularityAwards(
  rows: Pick<ActionRow, "action_date" | "created_at" | "status">[],
): MonthlyRegularityMonthAward[] {
  const byMonth = new Map<
    string,
    {
      occurredOn: string;
      actionCount: number;
    }
  >();

  for (const row of rows) {
    if (row.status === "rejected") {
      continue;
    }

    const occurredOn = normalizeIsoDate(row.action_date || row.created_at);
    const monthKey = getMonthKey(occurredOn);
    const current = byMonth.get(monthKey) ?? {
      occurredOn,
      actionCount: 0,
    };

    current.actionCount += 1;
    if (occurredOn < current.occurredOn) {
      current.occurredOn = occurredOn;
    }
    byMonth.set(monthKey, current);
  }

  const awards: MonthlyRegularityMonthAward[] = [];
  let previousMonth: string | null = null;
  let streak = 0;

  for (const [monthKey, info] of [...byMonth.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    if (previousMonth === null || !isConsecutiveMonth(previousMonth, monthKey)) {
      streak = 0;
    }
    streak += 1;
    previousMonth = monthKey;
    awards.push({
      monthKey,
      occurredOn: info.occurredOn,
      actionCount: info.actionCount,
      streak,
      xpAwarded: streak,
      sourceId: `monthly-regularity:${monthKey}`,
    });
  }

  return awards;
}

export function computeMonthlyRegularitySummary(
  rows: Pick<ActionRow, "action_date" | "created_at" | "status">[],
  referenceDate = new Date(),
): MonthlyRegularitySummary {
  const awards = computeMonthlyRegularityAwards(rows);
  const eligibleMonthKeys = new Set(awards.map((award) => award.monthKey));
  const referenceMonthKey = currentMonthKey(referenceDate);

  let currentStreak = 0;
  const currentMonthHasEligibleAction = eligibleMonthKeys.has(referenceMonthKey);

  if (currentMonthHasEligibleAction) {
    let cursor = referenceMonthKey;
    while (eligibleMonthKeys.has(cursor)) {
      currentStreak += 1;
      cursor = previousMonthKey(cursor);
    }
  } else {
    currentStreak = 0;
  }

  const gradeState = computeGemProgression(
    currentStreak,
    MONTHLY_REGULARITY_GEM_CONFIG,
  );

  return {
    currentStreak,
    eligibleMonths: awards.length,
    currentMonthHasEligibleAction,
    currentGrade: gradeState.currentGrade,
    nextGrade: gradeState.nextGrade,
    progressPercent: gradeState.progressPercent,
    currentLabel: gradeState.currentLabel,
    nextLabel: gradeState.nextLabel,
    monthlyAwards: awards,
  };
}
