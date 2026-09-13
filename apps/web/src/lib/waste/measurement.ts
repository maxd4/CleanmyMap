export const ACTION_WASTE_MEASUREMENT_METHODS = [
  "balance_suspendue",
  "balance_au_sol",
  "estimation_visuelle",
  "autre",
  "inconnue",
] as const;

export type ActionWasteMeasurementMethod =
  (typeof ACTION_WASTE_MEASUREMENT_METHODS)[number];

/** Resolution used by the current kilogram inputs and their coherence check. */
export const ACTION_WASTE_MASS_RESOLUTION_KG = 0.1;

/** Canonical field contract for waste other than cigarette butts. */
export type CanonicalWasteBreakdown = {
  recyclablesKg?: number | null;
  glassKg?: number | null;
  householdWasteKg?: number | null;
  otherWasteKg?: number | null;
  unusualObjects?: string | null;
  specialHandlingWaste?: string | null;
};

export type WasteBreakdownCoherence = {
  status: "not_comparable" | "coherent" | "warning";
  totalBreakdownKg: number | null;
  differenceKg: number | null;
  differencePercent: number | null;
};

export type WasteBreakdownComparisonOptions = {
  resolutionKg?: number;
};

const CANONICAL_BREAKDOWN_KEYS = [
  "recyclablesKg",
  "glassKg",
  "householdWasteKg",
  "otherWasteKg",
] as const satisfies readonly (keyof CanonicalWasteBreakdown)[];

function isKnownKg(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
/**
 * Compare only a complete, explicitly measured breakdown with the total.
 * Missing categories stay unknown and are never interpreted as zero.
 */
export function compareWasteBreakdownToTotal(
  wasteKg: number | null | undefined,
  breakdown: CanonicalWasteBreakdown | null | undefined,
  options: WasteBreakdownComparisonOptions = {},
): WasteBreakdownCoherence {
  const resolutionKg = options.resolutionKg ?? ACTION_WASTE_MASS_RESOLUTION_KG;
  if (!isKnownKg(wasteKg) || !breakdown || !isValidResolution(resolutionKg)) {
    return {
      status: "not_comparable",
      totalBreakdownKg: null,
      differenceKg: null,
      differencePercent: null,
    };
  }

  const values = CANONICAL_BREAKDOWN_KEYS.map((key) => breakdown[key]);
  if (!values.every(isKnownKg)) {
    return {
      status: "not_comparable",
      totalBreakdownKg: null,
      differenceKg: null,
      differencePercent: null,
    };
  }

  const knownValues = values.filter(isKnownKg);

  const totalBreakdownKg = knownValues.reduce((sum, value) => sum + value, 0);
  const differenceKg = Math.abs(totalBreakdownKg - wasteKg);
  const differencePercent =
    wasteKg === 0
      ? totalBreakdownKg === 0
        ? 0
        : 100
      : (Math.abs(totalBreakdownKg - wasteKg) / wasteKg) * 100;

  const breakdownInterval = sumQuantificationIntervals(knownValues, resolutionKg);
  const totalInterval = quantificationInterval(wasteKg, resolutionKg);
  const tolerance = Number.EPSILON *
    Math.max(1, breakdownInterval.max, totalInterval.max) * 16;
  const intervalsOverlap =
    breakdownInterval.max + tolerance >= totalInterval.min &&
    totalInterval.max + tolerance >= breakdownInterval.min;

  return {
    status: intervalsOverlap ? "coherent" : "warning",
    totalBreakdownKg,
    differenceKg,
    differencePercent,
  };
}

function isValidResolution(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function quantificationInterval(value: number, resolutionKg: number): {
  min: number;
  max: number;
} {
  return {
    min: Math.max(0, value - resolutionKg / 2),
    max: value + resolutionKg / 2,
  };
}

function sumQuantificationIntervals(
  values: number[],
  resolutionKg: number,
): { min: number; max: number } {
  return values.reduce(
    (interval, value) => {
      const valueInterval = quantificationInterval(value, resolutionKg);
      return {
        min: interval.min + valueInterval.min,
        max: interval.max + valueInterval.max,
      };
    },
    { min: 0, max: 0 },
  );
}
