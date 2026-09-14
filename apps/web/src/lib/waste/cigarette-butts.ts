import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  BUTTS_PER_KG_REFERENCE,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  CONDITION_WEIGHT_FACTORS,
  computeButtsCount,
  estimateButtsWeightKg,
} from "@/lib/impact/impact-terrain-2026";

export const MAX_CIGARETTE_BUTTS_COUNT = 5_000_000;

export const CIGARETTE_BUTTS_PROVENANCES = [
  "counted",
  "measured",
  "weight_converted",
  "volume_converted",
  "estimated",
  "unknown",
] as const;

export type CigaretteButtsProvenance =
  (typeof CIGARETTE_BUTTS_PROVENANCES)[number];

export type ActionCigaretteButtsMeasurements = {
  cigaretteButtsCount: number | null;
  cigaretteButtsMassKg: number | null;
  cigaretteButtsVolumeLiters: number | null;
  cigaretteButtsCondition: ActionMegotsCondition | null;
  cigaretteButtsCountProvenance: CigaretteButtsProvenance;
  cigaretteButtsMassProvenance: CigaretteButtsProvenance;
  cigaretteButtsVolumeProvenance: CigaretteButtsProvenance;
  cigaretteButtsConversionFormulaVersion: string | null;
};

export type CigaretteButtsMeasurementInput = {
  cigaretteButtsCount?: number | null;
  cigaretteButtsMassKg?: number | null;
  cigaretteButtsVolumeLiters?: number | null;
  cigaretteButtsCondition?: ActionMegotsCondition | null;
  cigaretteButtsCountProvenance?: CigaretteButtsProvenance;
  cigaretteButtsMassProvenance?: CigaretteButtsProvenance;
  cigaretteButtsVolumeProvenance?: CigaretteButtsProvenance;
  cigaretteButtsConversionFormulaVersion?: string | null;
  deriveMissingFromMassOrCount?: boolean;
};

export type RawCigaretteButtsMeasurementInput = Pick<
  CigaretteButtsMeasurementInput,
  | "cigaretteButtsCount"
  | "cigaretteButtsMassKg"
  | "cigaretteButtsVolumeLiters"
  | "cigaretteButtsCondition"
>;

function normalizeNullableNonNegative(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeCount(value: number | null | undefined): number | null {
  const normalized = normalizeNullableNonNegative(value);
  return normalized === null ? null : Math.trunc(normalized);
}

function resolveProvenance(
  value: CigaretteButtsProvenance | undefined,
  fallback: CigaretteButtsProvenance,
): CigaretteButtsProvenance {
  return value && CIGARETTE_BUTTS_PROVENANCES.includes(value) ? value : fallback;
}

function resolveCondition(
  value: ActionMegotsCondition | null | undefined,
): ActionMegotsCondition | null {
  return value === "propre" || value === "humide" || value === "mouille"
    ? value
    : null;
}

/**
 * Normalizes raw cigarette-butt measurements without replacing an explicit
 * value by a derived one. Missing count/mass derivation is opt-in so legacy
 * payloads cannot silently acquire a new measurement.
 */
export function normalizeCigaretteButtsMeasurements(
  input: CigaretteButtsMeasurementInput,
): ActionCigaretteButtsMeasurements {
  let count = normalizeCount(input.cigaretteButtsCount);
  let massKg = normalizeNullableNonNegative(input.cigaretteButtsMassKg);
  const volumeLiters = normalizeNullableNonNegative(
    input.cigaretteButtsVolumeLiters,
  );
  const condition = resolveCondition(input.cigaretteButtsCondition);
  let countProvenance = resolveProvenance(
    input.cigaretteButtsCountProvenance,
    count === null ? "unknown" : "counted",
  );
  let massProvenance = resolveProvenance(
    input.cigaretteButtsMassProvenance,
    massKg === null ? "unknown" : "measured",
  );
  const volumeProvenance = resolveProvenance(
    input.cigaretteButtsVolumeProvenance,
    volumeLiters === null ? "unknown" : "measured",
  );
  let conversionFormulaVersion = input.cigaretteButtsConversionFormulaVersion ?? null;

  if (input.deriveMissingFromMassOrCount && condition) {
    if (count === null && massKg !== null) {
      count = computeButtsCount(massKg, condition);
      countProvenance = "weight_converted";
      conversionFormulaVersion = CIGARETTE_BUTTS_MASS_CONVERSION_VERSION;
    } else if (massKg === null && count !== null) {
      massKg = estimateButtsWeightKg(count, condition);
      massProvenance = "weight_converted";
      conversionFormulaVersion = CIGARETTE_BUTTS_MASS_CONVERSION_VERSION;
    }
  }

  return {
    cigaretteButtsCount: count,
    cigaretteButtsMassKg: massKg,
    cigaretteButtsVolumeLiters: volumeLiters,
    cigaretteButtsCondition: condition,
    cigaretteButtsCountProvenance: countProvenance,
    cigaretteButtsMassProvenance: massProvenance,
    cigaretteButtsVolumeProvenance: volumeProvenance,
    cigaretteButtsConversionFormulaVersion: conversionFormulaVersion,
  };
}

/**
 * Resolves ordinary user input on the server. Provenance and formula version
 * are deliberately not read from the input: they are assigned from the raw
 * measurements and the canonical conversion rule here.
 */
export function normalizeCigaretteButtsMeasurementsFromUserInput(
  input: RawCigaretteButtsMeasurementInput,
  options: {
    preserveExplicitNulls?: boolean;
    explicitNullFields?: Array<
      "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters"
    >;
  } = {},
): ActionCigaretteButtsMeasurements {
  const normalized = normalizeCigaretteButtsMeasurements({
    cigaretteButtsCount: input.cigaretteButtsCount,
    cigaretteButtsMassKg: input.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters: input.cigaretteButtsVolumeLiters,
    cigaretteButtsCondition: input.cigaretteButtsCondition,
    deriveMissingFromMassOrCount: true,
  });

  if (!options.preserveExplicitNulls && !options.explicitNullFields?.length) {
    return normalized;
  }

  const result = { ...normalized };
  let hadExplicitNull = false;
  const shouldPreserveNull = (
    field: "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters",
  ) =>
    input[field] === null &&
    (options.preserveExplicitNulls || options.explicitNullFields?.includes(field));

  if (shouldPreserveNull("cigaretteButtsCount")) {
    result.cigaretteButtsCount = null;
    result.cigaretteButtsCountProvenance = "unknown";
    hadExplicitNull = true;
  }
  if (shouldPreserveNull("cigaretteButtsMassKg")) {
    result.cigaretteButtsMassKg = null;
    result.cigaretteButtsMassProvenance = "unknown";
    hadExplicitNull = true;
  }
  if (shouldPreserveNull("cigaretteButtsVolumeLiters")) {
    result.cigaretteButtsVolumeLiters = null;
    result.cigaretteButtsVolumeProvenance = "unknown";
  }
  if (hadExplicitNull) {
    result.cigaretteButtsConversionFormulaVersion = null;
  }

  return result;
}

export function hasCigaretteButtsMeasurement(
  measurements:
    | Pick<
        RawCigaretteButtsMeasurementInput,
        | "cigaretteButtsCount"
        | "cigaretteButtsMassKg"
        | "cigaretteButtsVolumeLiters"
      >
    | null
    | undefined,
): boolean {
  return Boolean(
    measurements &&
      (measurements.cigaretteButtsCount !== null ||
        measurements.cigaretteButtsMassKg !== null ||
        measurements.cigaretteButtsVolumeLiters !== null),
  );
}

export {
  BUTTS_PER_KG_REFERENCE,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  CONDITION_WEIGHT_FACTORS,
};
