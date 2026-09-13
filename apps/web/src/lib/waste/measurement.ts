export const ACTION_WASTE_MEASUREMENT_METHODS = [
  "balance_suspendue",
  "balance_au_sol",
  "estimation_visuelle",
  "autre",
  "inconnue",
] as const;

export type ActionWasteMeasurementMethod =
  (typeof ACTION_WASTE_MEASUREMENT_METHODS)[number];

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
  differencePercent: number | null;
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
): WasteBreakdownCoherence {
  if (!isKnownKg(wasteKg) || !breakdown) {
    return {
      status: "not_comparable",
      totalBreakdownKg: null,
      differencePercent: null,
    };
  }

  const values = CANONICAL_BREAKDOWN_KEYS.map((key) => breakdown[key]);
  if (!values.every(isKnownKg)) {
    return {
      status: "not_comparable",
      totalBreakdownKg: null,
      differencePercent: null,
    };
  }

  const totalBreakdownKg = values.reduce((sum, value) => sum + value, 0);
  const differencePercent =
    wasteKg === 0
      ? totalBreakdownKg === 0
        ? 0
        : 100
      : (Math.abs(totalBreakdownKg - wasteKg) / wasteKg) * 100;

  return {
    status: differencePercent > 20 ? "warning" : "coherent",
    totalBreakdownKg,
    differencePercent,
  };
}
