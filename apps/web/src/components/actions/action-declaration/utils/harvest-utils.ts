export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatKg(value: number): string {
  if (!Number.isFinite(value)) {
    return "0,0";
  }

  return value < 1
    ? value.toFixed(2).replace(".", ",")
    : value.toFixed(1).replace(".", ",");
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.trunc(value)));
}

export function formatSignedPercent(value: number): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function deriveGaugeMax(
  values: Array<number | null | undefined>,
  minimum = 1,
): number {
  const positiveValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  const reference =
    positiveValues.length > 0 ? Math.max(...positiveValues) : minimum;
  return Math.max(minimum, Number((reference * 1.35).toFixed(2)));
}

export const HARVEST_WASTE_SLIDER_INITIAL_MAX_KG = 20;
export const HARVEST_WASTE_SLIDER_EXTENSION_KG = 20;
export const HARVEST_BUTTS_SLIDER_INITIAL_MAX_COUNT = 5_000;
export const HARVEST_BUTTS_SLIDER_EXTENSION_COUNT = 5_000;

/**
 * Keeps the range compact for ordinary actions while making a persisted value
 * immediately reachable without changing the value itself.
 */
export function resolveHarvestSliderMax(
  value: number | null | undefined,
  initialMax: number,
  extension: number,
  absoluteMax: number,
): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= initialMax) {
    return initialMax;
  }

  return Math.min(
    absoluteMax,
    Math.max(initialMax, Math.ceil(value / extension) * extension),
  );
}

export function extendHarvestSliderMax(
  currentMax: number,
  selectedValue: number,
  extension: number,
  absoluteMax: number,
): number {
  if (selectedValue < currentMax || currentMax >= absoluteMax) return currentMax;
  return Math.min(absoluteMax, currentMax + extension);
}

export type WasteComparisonTone = "emerald" | "orange" | "slate";

export type WasteComparison = {
  currentPerVolunteer: number | null;
  benchmarkPerVolunteer: number | null;
  deltaPercent: number | null;
  tone: WasteComparisonTone;
};

export function deriveWasteComparison(params: {
  wasteKg: number | null;
  volunteersCount?: number | null;
  operationalUnits?: number | null;
  benchmarkPerVolunteer: number | null;
  benchmarkSourceCount: number;
}): WasteComparison {
  const hasValidWaste =
    params.wasteKg !== null &&
    Number.isFinite(params.wasteKg) &&
    params.wasteKg >= 0;
  const denominator =
    params.operationalUnits !== undefined
      ? params.operationalUnits
      : params.volunteersCount ?? null;
  const hasValidDenominator =
    denominator !== null &&
    Number.isFinite(denominator) &&
    denominator > 0;
  const hasValidBenchmark =
    params.benchmarkSourceCount >= 2 &&
    params.benchmarkPerVolunteer !== null &&
    Number.isFinite(params.benchmarkPerVolunteer) &&
    params.benchmarkPerVolunteer >= 0;

  const currentPerVolunteer =
    hasValidWaste && hasValidDenominator
      ? params.wasteKg! / denominator!
      : null;
  const benchmarkPerVolunteer = hasValidBenchmark ? params.benchmarkPerVolunteer : null;
  const deltaPercent =
    currentPerVolunteer !== null &&
    benchmarkPerVolunteer !== null &&
    benchmarkPerVolunteer > 0
      ? ((currentPerVolunteer - benchmarkPerVolunteer) / benchmarkPerVolunteer) * 100
      : null;

  return {
    currentPerVolunteer,
    benchmarkPerVolunteer,
    deltaPercent,
    // The arrow only communicates direction. It must not grade the action or
    // imply that collecting more or fewer waste is intrinsically better.
    tone: "slate",
  };
}
