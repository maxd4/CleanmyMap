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

/** Existing technical ceiling shared by the action measurement contracts. */
export const ACTION_MEASUREMENT_MAX_KG = 100_000;

/** Canonical field contract for waste other than cigarette butts. */
export type CanonicalWasteBreakdown = {
  recyclablesKg?: number | null;
  glassKg?: number | null;
  householdWasteKg?: number | null;
  otherWasteKg?: number | null;
  unusualObjects?: string | null;
  specialHandlingWaste?: string | null;
};

export type WasteCharacterizationCoherence = {
  status: "not_comparable" | "coherent" | "warning";
  totalCharacterizedKg: number | null;
  excessKg: number | null;
};

export type WasteBreakdownCoherence = {
  status: "not_comparable" | "coherent" | "warning";
  totalBreakdownKg: number | null;
  differenceKg: number | null;
  differencePercent: number | null;
};

export type WasteBreakdownComparisonOptions = {
  /** Null means the historical measurement resolution is not demonstrable. */
  resolutionKg?: number | null;
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

/** Checks grid membership without silently rounding an incoming measurement. */
export function isAlignedToWasteMassResolution(
  value: number,
  resolution: number,
): boolean {
  if (!isKnownKg(value) || !isValidResolution(resolution)) return false;
  const quotient = value / resolution;
  const nearestGridPoint = Math.round(quotient);
  const tolerance = Number.EPSILON *
    Math.max(1, Math.abs(quotient), Math.abs(value), Math.abs(resolution)) * 32;
  return Math.abs(quotient - nearestGridPoint) <= tolerance;
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
  const resolutionKg = options.resolutionKg === undefined
    ? ACTION_WASTE_MASS_RESOLUTION_KG
    : options.resolutionKg;
  if (
    !isKnownKg(wasteKg) ||
    !breakdown ||
    resolutionKg === null ||
    !isValidResolution(resolutionKg)
  ) {
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

  if (
    !isAlignedToWasteMassResolution(wasteKg, resolutionKg) ||
    !values.every((value) => isAlignedToWasteMassResolution(value, resolutionKg))
  ) {
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

/**
 * A characterization is a partial observation. Missing rows are unknown, so
 * only an excess over the declared total can be incoherent.
 */
export function compareWasteCharacterizationToTotal(
  wasteKg: number | null | undefined,
  characterization: Record<string, number | null | undefined> | null | undefined,
  options: WasteBreakdownComparisonOptions = {},
): WasteCharacterizationCoherence {
  const resolutionKg = options.resolutionKg === undefined
    ? ACTION_WASTE_MASS_RESOLUTION_KG
    : options.resolutionKg;
  if (
    typeof wasteKg !== "number" ||
    !Number.isFinite(wasteKg) ||
    wasteKg < 0 ||
    !characterization ||
    resolutionKg === null ||
    !isValidResolution(resolutionKg)
  ) {
    return {
      status: "not_comparable",
      totalCharacterizedKg: null,
      excessKg: null,
    };
  }
  const totalKg: number = wasteKg;

  const values = Object.values(characterization);
  if (values.some((value) => value !== null && value !== undefined && !isKnownKg(value))) {
    return {
      status: "not_comparable",
      totalCharacterizedKg: null,
      excessKg: null,
    };
  }
  const knownValues = values.filter(isKnownKg);
  if (knownValues.length === 0) {
    return {
      status: "not_comparable",
      totalCharacterizedKg: null,
      excessKg: null,
    };
  }

  const totalCharacterizedKg = knownValues.reduce((sum, value) => sum + value, 0);
  const excessKg = Math.max(0, totalCharacterizedKg - totalKg);
  const characterizationInterval = sumQuantificationIntervals(knownValues, resolutionKg);
  const totalInterval = quantificationInterval(totalKg, resolutionKg);
  const tolerance = Number.EPSILON *
    Math.max(1, characterizationInterval.max, totalInterval.max) * 16;
  const status = characterizationInterval.min > totalInterval.max + tolerance
    ? "warning"
    : "coherent";

  return { status, totalCharacterizedKg, excessKg };
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
