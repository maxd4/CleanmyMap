export const MOHS_GRADES = [
  { grade: 1, name: "Talc", emoji: "🪨" },
  { grade: 2, name: "Gypse", emoji: "🪨" },
  { grade: 3, name: "Calcite", emoji: "🪨" },
  { grade: 4, name: "Fluorite", emoji: "💎" },
  { grade: 5, name: "Apatite", emoji: "💎" },
  { grade: 6, name: "Orthose", emoji: "💎" },
  { grade: 7, name: "Quartz", emoji: "🔷" },
  { grade: 8, name: "Topaze", emoji: "🔷" },
  { grade: 9, name: "Corindon", emoji: "✨" },
  { grade: 10, name: "Diamant", emoji: "💠" },
] as const;

export const MOHS_IMPACT_FAMILIES = ["waste", "butts"] as const;
export type MohsImpactFamily = (typeof MOHS_IMPACT_FAMILIES)[number];

const MOHS_STEP_BY_FAMILY: Record<MohsImpactFamily, number> = {
  waste: 20,
  butts: 2_000,
};

const MOHS_XP_PER_GRADE = 0.25;
export const MOHS_MAX_XP = 2.25;
export const MOHS_PROGRESSION_VERSION = "mohs-impact-v1" as const;

export const MOHS_EVENT_TYPE_BY_FAMILY = {
  waste: "infinite_waste_milestone",
  butts: "infinite_butts_milestone",
} as const;

export const MOHS_SOURCE_TABLE = "personal_impact_mohs" as const;

export type MohsGradeInfo = {
  current: (typeof MOHS_GRADES)[number];
  next: (typeof MOHS_GRADES)[number] | null;
  progressPct: number;
  remainingForNext: number;
  currentThreshold: number;
  nextThreshold: number;
  stepPerGrade: number;
  nextXp: number;
};

export type MohsThreshold = {
  family: MohsImpactFamily;
  grade: number;
  threshold: number;
  xp: number;
  sourceId: string;
};

export function getMohsGradeInfo(
  value: number,
  family: MohsImpactFamily,
): MohsGradeInfo {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const stepPerGrade = MOHS_STEP_BY_FAMILY[family];
  const gradeIndex = Math.min(MOHS_GRADES.length - 1, Math.floor(safeValue / stepPerGrade));
  const current = MOHS_GRADES[gradeIndex];
  const next = gradeIndex < MOHS_GRADES.length - 1 ? MOHS_GRADES[gradeIndex + 1] : null;
  const currentThreshold = gradeIndex * stepPerGrade;
  const nextThreshold = (gradeIndex + 1) * stepPerGrade;
  const progressInGrade = safeValue - currentThreshold;
  const progressPct = next
    ? Math.min(100, (progressInGrade / stepPerGrade) * 100)
    : 100;

  return {
    current,
    next,
    progressPct,
    remainingForNext: next ? Math.max(0, nextThreshold - safeValue) : 0,
    currentThreshold,
    nextThreshold,
    stepPerGrade,
    nextXp: next ? MOHS_XP_PER_GRADE : 0,
  };
}

export function getMohsThresholds(
  family: MohsImpactFamily,
  value: number,
): MohsThreshold[] {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const step = MOHS_STEP_BY_FAMILY[family];
  return MOHS_GRADES.slice(1)
    .map((grade) => ({
      family,
      grade: grade.grade,
      threshold: (grade.grade - 1) * step,
      xp: MOHS_XP_PER_GRADE,
      sourceId: `mohs:${family}:grade:${grade.grade}`,
    }))
    .filter((threshold) => safeValue >= threshold.threshold);
}

export type MohsImpactRecord = {
  occurredOn: string;
  wasteValue: number | null;
  buttsValue: number | null;
};

export type MohsThresholdAward = MohsThreshold & { occurredOn: string };

/**
 * Returns the first fact date on which each threshold became eligible. The
 * event identity remains the family/grade source id, independent of replay.
 */
export function buildMohsThresholdAwards(
  records: readonly MohsImpactRecord[],
): MohsThresholdAward[] {
  const ordered = [...records].sort((left, right) =>
    left.occurredOn.localeCompare(right.occurredOn),
  );
  const totals: Record<MohsImpactFamily, number> = { waste: 0, butts: 0 };
  const awarded = new Map<string, MohsThresholdAward>();

  for (const record of ordered) {
    for (const family of MOHS_IMPACT_FAMILIES) {
      const value = family === "waste" ? record.wasteValue : record.buttsValue;
      totals[family] += Number.isFinite(value) && value !== null ? Math.max(0, value) : 0;
      for (const threshold of getMohsThresholds(family, totals[family])) {
        if (!awarded.has(threshold.sourceId)) {
          awarded.set(threshold.sourceId, { ...threshold, occurredOn: record.occurredOn });
        }
      }
    }
  }

  return [...awarded.values()].sort((left, right) =>
    left.family.localeCompare(right.family) || left.grade - right.grade,
  );
}
