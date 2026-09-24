import type { GemGrade } from "./types";

export type GemGradeDefinition = {
  key: string;
  label: string;
  threshold: number;
};

export type GemFamilyConfig = {
  idPrefix: string;
  iconVariant: string;
  tooltip: (definition: GemGradeDefinition) => string;
  visualVariant?: (definition: GemGradeDefinition) => string;
  xp?: (definition: GemGradeDefinition) => number;
};

export type GemProgressionState = {
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
};

export const CANONICAL_GEM_GRADE_DEFINITIONS: readonly GemGradeDefinition[] = [
  { key: "observateur", label: "Observateur", threshold: 0 },
  { key: "quartz", label: "Quartz", threshold: 1 },
  { key: "topaze", label: "Topaze", threshold: 3 },
  { key: "saphir", label: "Saphir", threshold: 5 },
  { key: "rubis", label: "Rubis", threshold: 8 },
  { key: "emeraude", label: "Émeraude", threshold: 10 },
  { key: "diamant", label: "Diamant", threshold: 15 },
  { key: "opale", label: "Opale", threshold: 20 },
];

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

function buildGemGrade(
  config: GemFamilyConfig,
  definition: GemGradeDefinition,
): GemGrade {
  return {
    id: `${config.idPrefix}-${definition.key}`,
    label: definition.label,
    threshold: definition.threshold,
    iconVariant: config.iconVariant,
    visualVariant:
      config.visualVariant?.(definition) ??
      (definition.threshold < 5 ? "stone" : "precious"),
    tooltip: config.tooltip(definition),
    xp: config.xp?.(definition) ?? (definition.threshold === 0 ? 0 : 1),
  };
}

export function buildGemGradeCatalog(config: GemFamilyConfig): GemGrade[] {
  return CANONICAL_GEM_GRADE_DEFINITIONS.map((definition) =>
    buildGemGrade(config, definition),
  );
}

function buildPilierGrade(
  config: GemFamilyConfig,
  index: number,
  threshold: number,
): GemGrade {
  const safeIndex = Math.max(2, Math.trunc(index));
  const definition = {
    key: `pilier-${safeIndex}`,
    label: `Pilier ${toRomanNumeral(safeIndex)}`,
    threshold,
  };

  return buildGemGrade(config, definition);
}

export function computeGemProgression(
  current: number,
  config: GemFamilyConfig,
): GemProgressionState {
  const safeCurrent = Math.max(0, Math.trunc(current));
  const baseGrades = buildGemGradeCatalog(config);

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
      buildPilierGrade(config, 2, firstPilierThreshold);
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
  const currentGrade = buildPilierGrade(config, pilierIndex, currentThreshold);
  const nextGrade = buildPilierGrade(config, pilierIndex + 1, nextThreshold);
  const progressCurrent = Math.max(
    0,
    Math.min(safeCurrent - currentThreshold, nextThreshold - currentThreshold),
  );

  return {
    currentGrade,
    nextGrade,
    progressPercent: Math.round(
      (progressCurrent / (nextThreshold - currentThreshold)) * 100,
    ),
    currentLabel: currentGrade.label,
    nextLabel: nextGrade.label,
  };
}
