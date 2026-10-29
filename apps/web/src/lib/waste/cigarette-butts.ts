import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
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

/**
 * Identifies which field was manually observed in the form. `unknown` is
 * reserved for historical pairs whose original source cannot be reconstructed.
 */
export type CigaretteButtsInputSource = "count" | "mass" | "unknown" | null;

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
  cigaretteButtsInputSource?: CigaretteButtsInputSource;
  deriveMissingFromMassOrCount?: boolean;
};

export type RawCigaretteButtsMeasurementInput = Pick<
  CigaretteButtsMeasurementInput,
  | "cigaretteButtsCount"
  | "cigaretteButtsMassKg"
  | "cigaretteButtsVolumeLiters"
  | "cigaretteButtsCondition"
> & {
  /** Client hint only; the server recomputes provenance and conversions. */
  cigaretteButtsInputSource?: CigaretteButtsInputSource;
};

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
    /** Persisted server metadata used to protect historical provenance. */
    existingMeasurements?: ActionCigaretteButtsMeasurements | null;
  } = {},
): ActionCigaretteButtsMeasurements {
  const inputSource = resolveUserInputSource(input, options.existingMeasurements);
  const explicitInputSource =
    input.cigaretteButtsInputSource !== undefined ||
    options.existingMeasurements !== null &&
    options.existingMeasurements !== undefined;
  const sourceSpecificInput = explicitInputSource
    ? inputSource === "mass"
      ? {
          ...input,
          cigaretteButtsCount: null,
          deriveMissingFromMassOrCount: true,
        }
      : inputSource === "count"
        ? {
            ...input,
            cigaretteButtsMassKg: null,
            deriveMissingFromMassOrCount: true,
          }
        : {
            ...input,
            deriveMissingFromMassOrCount: false,
          }
    : {
        ...input,
        deriveMissingFromMassOrCount: true,
      };
  const normalized = normalizeCigaretteButtsMeasurements({
    cigaretteButtsCount: sourceSpecificInput.cigaretteButtsCount,
    cigaretteButtsMassKg: sourceSpecificInput.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters: sourceSpecificInput.cigaretteButtsVolumeLiters,
    cigaretteButtsCondition: sourceSpecificInput.cigaretteButtsCondition,
    deriveMissingFromMassOrCount: sourceSpecificInput.deriveMissingFromMassOrCount,
  });

  const existingMeasurements = options.existingMeasurements;
  if (
    existingMeasurements &&
    inputSource === "unknown" &&
    sameCountAndMass(normalized, existingMeasurements)
  ) {
    normalized.cigaretteButtsCountProvenance =
      existingMeasurements.cigaretteButtsCountProvenance;
    normalized.cigaretteButtsMassProvenance =
      existingMeasurements.cigaretteButtsMassProvenance;
    normalized.cigaretteButtsConversionFormulaVersion =
      existingMeasurements.cigaretteButtsConversionFormulaVersion;
  } else if (inputSource === "unknown" && explicitInputSource) {
    // An ambiguous pair must remain explicitly unqualified. In particular,
    // do not turn non-null historical values into counted/measured values.
    normalized.cigaretteButtsCountProvenance = "unknown";
    normalized.cigaretteButtsMassProvenance = "unknown";
    normalized.cigaretteButtsConversionFormulaVersion = null;
  }

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

function sameMeasurementValue(left: number | null, right: number | null): boolean {
  return left === right;
}

function sameCountAndMass(
  left: Pick<ActionCigaretteButtsMeasurements, "cigaretteButtsCount" | "cigaretteButtsMassKg">,
  right: Pick<ActionCigaretteButtsMeasurements, "cigaretteButtsCount" | "cigaretteButtsMassKg">,
): boolean {
  return (
    sameMeasurementValue(left.cigaretteButtsCount, right.cigaretteButtsCount) &&
    sameMeasurementValue(left.cigaretteButtsMassKg, right.cigaretteButtsMassKg)
  );
}

function resolveUserInputSource(
  input: RawCigaretteButtsMeasurementInput,
  existingMeasurements: ActionCigaretteButtsMeasurements | null | undefined,
): CigaretteButtsInputSource {
  if (!existingMeasurements) {
    return input.cigaretteButtsInputSource ?? "unknown";
  }

  const persistedSource = inferCigaretteButtsInputSource(existingMeasurements);
  const countChanged =
    input.cigaretteButtsCount !== undefined &&
    !sameMeasurementValue(
      normalizeCount(input.cigaretteButtsCount),
      existingMeasurements.cigaretteButtsCount,
    );
  const massChanged =
    input.cigaretteButtsMassKg !== undefined &&
    !sameMeasurementValue(
      normalizeNullableNonNegative(input.cigaretteButtsMassKg),
      existingMeasurements.cigaretteButtsMassKg,
    );

  // A changed field is evidence of a new form edit; the client hint only
  // disambiguates the case where the form synchronously changed both fields.
  if (countChanged && !massChanged) {
    return persistedSource === "mass" && input.cigaretteButtsInputSource !== "count"
      ? "mass"
      : "count";
  }
  if (massChanged && !countChanged) {
    return persistedSource === "count" && input.cigaretteButtsInputSource !== "mass"
      ? "count"
      : "mass";
  }
  if (countChanged && massChanged) {
    if (input.cigaretteButtsInputSource === "count") return "count";
    if (input.cigaretteButtsInputSource === "mass") return "mass";
  }

  // A condition-only edit must follow the persisted source. An ambiguous
  // historical pair stays ambiguous, regardless of a forged payload hint.
  return persistedSource;
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

export function inferCigaretteButtsInputSource(
  measurements: ActionCigaretteButtsMeasurements | null | undefined,
): CigaretteButtsInputSource {
  if (!measurements) return null;

  const hasCount = measurements.cigaretteButtsCount !== null;
  const hasMass = measurements.cigaretteButtsMassKg !== null;
  if (!hasCount && !hasMass) return null;

  if (
    hasCount &&
    measurements.cigaretteButtsCountProvenance === "counted" &&
    measurements.cigaretteButtsMassProvenance === "weight_converted"
  ) {
    return "count";
  }
  if (
    hasMass &&
    measurements.cigaretteButtsMassProvenance === "measured" &&
    measurements.cigaretteButtsCountProvenance === "weight_converted"
  ) {
    return "mass";
  }

  // A pair with two independently observed values, or an older record without
  // enough provenance, must not be rewritten by a later condition change.
  return "unknown";
}

export {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
};
