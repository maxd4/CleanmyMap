import type { ActionRow } from "./progression-types";
import type { GemGrade } from "./types";

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

const MONTHLY_REGULARITY_GEM_GRADES: GemGrade[] = [
  {
    id: "monthly-regularity-observateur",
    label: "Observateur",
    threshold: 0,
    iconVariant: "calendar-days",
    visualVariant: "stone",
    tooltip: "Aucune série mensuelle active",
    xp: 0,
  },
  {
    id: "monthly-regularity-quartz",
    label: "Quartz",
    threshold: 1,
    iconVariant: "calendar-days",
    visualVariant: "stone",
    tooltip: "1 mois consécutif avec participation",
    xp: 1,
  },
  {
    id: "monthly-regularity-topaze",
    label: "Topaze",
    threshold: 2,
    iconVariant: "calendar-days",
    visualVariant: "stone",
    tooltip: "2 mois consécutifs avec participation",
    xp: 1,
  },
  {
    id: "monthly-regularity-saphir",
    label: "Saphir",
    threshold: 3,
    iconVariant: "calendar-days",
    visualVariant: "precious",
    tooltip: "3 mois consécutifs avec participation",
    xp: 1,
  },
  {
    id: "monthly-regularity-rubis",
    label: "Rubis",
    threshold: 5,
    iconVariant: "calendar-days",
    visualVariant: "precious",
    tooltip: "5 mois consécutifs avec participation",
    xp: 1,
  },
  {
    id: "monthly-regularity-emeraude",
    label: "Émeraude",
    threshold: 8,
    iconVariant: "calendar-days",
    visualVariant: "precious",
    tooltip: "8 mois consécutifs avec participation",
    xp: 1,
  },
  {
    id: "monthly-regularity-diamant",
    label: "Diamant",
    threshold: 10,
    iconVariant: "calendar-days",
    visualVariant: "precious",
    tooltip: "10 mois consécutifs avec participation",
    xp: 1,
  },
  {
    id: "monthly-regularity-opale",
    label: "Opale",
    threshold: 15,
    iconVariant: "calendar-days",
    visualVariant: "precious",
    tooltip: "15 mois consécutifs avec participation",
    xp: 1,
  },
] as const;

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
    id: `monthly-regularity-pilier-${safeIndex}`,
    label: `Pilier ${toRomanNumeral(safeIndex)}`,
    threshold,
    iconVariant: "calendar-days",
    visualVariant: "precious",
    tooltip: "Progression infinie de la régularité mensuelle",
    xp: 1,
  };
}

function computeGemProgression(current: number): {
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
} {
  const safeCurrent = Math.max(0, Math.trunc(current));
  const baseGrades = [...MONTHLY_REGULARITY_GEM_GRADES];

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

  const gradeState = computeGemProgression(currentStreak);

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

export { MONTHLY_REGULARITY_GEM_GRADES };
