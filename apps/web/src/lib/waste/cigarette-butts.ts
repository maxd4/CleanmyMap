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
  const existingMeasurements = options.existingMeasurements;
  const effectiveInput = mergeExistingMeasurementInput(input, existingMeasurements);
  const clearFlags = readMeasurementClearFlags(input, existingMeasurements);
  const cleared = normalizeClearedMeasurements(effectiveInput, existingMeasurements, clearFlags);
  if (cleared) return cleared;
  const inputSource = resolveUserInputSource(effectiveInput, existingMeasurements);
  const explicitInputSource = hasExplicitInputSource(effectiveInput, existingMeasurements);
  const sourceSpecificInput = buildSourceSpecificInput(effectiveInput, inputSource, explicitInputSource);
  const normalized = normalizeCigaretteButtsMeasurements({
    cigaretteButtsCount: sourceSpecificInput.cigaretteButtsCount,
    cigaretteButtsMassKg: sourceSpecificInput.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters: sourceSpecificInput.cigaretteButtsVolumeLiters,
    cigaretteButtsCondition: sourceSpecificInput.cigaretteButtsCondition,
    deriveMissingFromMassOrCount: sourceSpecificInput.deriveMissingFromMassOrCount,
  });
  preserveHistoricalMeasurementProvenance(
    normalized,
    existingMeasurements,
    inputSource,
    clearFlags,
    explicitInputSource,
  );
  return applyExplicitMeasurementNulls(normalized, input, options);
}

type MeasurementClearFlags = {
  countExplicitlyCleared: boolean;
  massExplicitlyCleared: boolean;
  volumeExplicitlyCleared: boolean;
  volumeClearRequested: boolean;
};

function mergeExistingMeasurementInput(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements | null | undefined,
): RawCigaretteButtsMeasurementInput {
  if (!existing) return input;
  return {
    ...input,
    cigaretteButtsCount: input.cigaretteButtsCount !== undefined ? input.cigaretteButtsCount : existing.cigaretteButtsCount,
    cigaretteButtsMassKg: input.cigaretteButtsMassKg !== undefined ? input.cigaretteButtsMassKg : existing.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters: input.cigaretteButtsVolumeLiters !== undefined ? input.cigaretteButtsVolumeLiters : existing.cigaretteButtsVolumeLiters,
    cigaretteButtsCondition: input.cigaretteButtsCondition !== undefined ? input.cigaretteButtsCondition : existing.cigaretteButtsCondition,
  };
}

function readMeasurementClearFlags(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements | null | undefined,
): MeasurementClearFlags {
  return {
    countExplicitlyCleared: Boolean(existing && input.cigaretteButtsCount === null && existing.cigaretteButtsCount !== null),
    massExplicitlyCleared: Boolean(existing && input.cigaretteButtsMassKg === null && existing.cigaretteButtsMassKg !== null),
    volumeExplicitlyCleared: Boolean(existing && input.cigaretteButtsVolumeLiters === null && existing.cigaretteButtsVolumeLiters !== null),
    volumeClearRequested: Boolean(existing && input.cigaretteButtsVolumeLiters === null),
  };
}

function normalizeClearedMeasurements(
  effectiveInput: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements | null | undefined,
  flags: MeasurementClearFlags,
): ActionCigaretteButtsMeasurements | null {
  if (!existing) return null;
  if (flags.volumeExplicitlyCleared && !flags.countExplicitlyCleared && !flags.massExplicitlyCleared) {
    return normalizeVolumeClearedMeasurements(effectiveInput, existing);
  }
  if (!flags.countExplicitlyCleared && !flags.massExplicitlyCleared) return null;
  const persistedSource = inferCigaretteButtsInputSource(existing);
  const orphanedCount = flags.massExplicitlyCleared && persistedSource === "mass" && effectiveInput.cigaretteButtsCount === existing.cigaretteButtsCount;
  const orphanedMass = flags.countExplicitlyCleared && persistedSource === "count" && effectiveInput.cigaretteButtsMassKg === existing.cigaretteButtsMassKg;
  return normalizePartiallyClearedMeasurements(
    effectiveInput,
    existing,
    flags,
    orphanedCount,
    orphanedMass,
  );
}

function normalizeVolumeClearedMeasurements(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements,
): ActionCigaretteButtsMeasurements {
  const result = normalizeCigaretteButtsMeasurements({ ...input, deriveMissingFromMassOrCount: false });
  if (result.cigaretteButtsCount === existing.cigaretteButtsCount) result.cigaretteButtsCountProvenance = existing.cigaretteButtsCountProvenance;
  if (result.cigaretteButtsMassKg === existing.cigaretteButtsMassKg) result.cigaretteButtsMassProvenance = existing.cigaretteButtsMassProvenance;
  result.cigaretteButtsVolumeProvenance = "unknown";
  result.cigaretteButtsConversionFormulaVersion = existing.cigaretteButtsConversionFormulaVersion;
  return result;
}

function normalizePartiallyClearedMeasurements(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements,
  flags: MeasurementClearFlags,
  orphanedCount: boolean,
  orphanedMass: boolean,
): ActionCigaretteButtsMeasurements {
  const result = normalizeCigaretteButtsMeasurements({
    ...input,
    cigaretteButtsCount: orphanedCount ? null : input.cigaretteButtsCount,
    cigaretteButtsMassKg: orphanedMass ? null : input.cigaretteButtsMassKg,
    deriveMissingFromMassOrCount: false,
  });
  preserveUnclearedMeasurementProvenance(result, existing, flags);
  result.cigaretteButtsConversionFormulaVersion = null;
  return result;
}

function preserveUnclearedMeasurementProvenance(
  result: ActionCigaretteButtsMeasurements,
  existing: ActionCigaretteButtsMeasurements,
  flags: MeasurementClearFlags,
): void {
  if (!flags.countExplicitlyCleared && result.cigaretteButtsCount === existing.cigaretteButtsCount) result.cigaretteButtsCountProvenance = existing.cigaretteButtsCountProvenance;
  if (!flags.massExplicitlyCleared && result.cigaretteButtsMassKg === existing.cigaretteButtsMassKg) result.cigaretteButtsMassProvenance = existing.cigaretteButtsMassProvenance;
  if (!flags.volumeExplicitlyCleared && result.cigaretteButtsVolumeLiters === existing.cigaretteButtsVolumeLiters) result.cigaretteButtsVolumeProvenance = existing.cigaretteButtsVolumeProvenance;
}

function hasExplicitInputSource(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements | null | undefined,
): boolean {
  return input.cigaretteButtsInputSource !== undefined || existing !== null && existing !== undefined;
}

function buildSourceSpecificInput(
  input: RawCigaretteButtsMeasurementInput,
  source: CigaretteButtsInputSource,
  explicit: boolean,
): RawCigaretteButtsMeasurementInput & { deriveMissingFromMassOrCount: boolean } {
  if (!explicit) return { ...input, deriveMissingFromMassOrCount: true };
  if (source === "mass") return { ...input, cigaretteButtsCount: null, deriveMissingFromMassOrCount: true };
  if (source === "count") return { ...input, cigaretteButtsMassKg: null, deriveMissingFromMassOrCount: true };
  return { ...input, deriveMissingFromMassOrCount: false };
}

function preserveHistoricalMeasurementProvenance(
  normalized: ActionCigaretteButtsMeasurements,
  existing: ActionCigaretteButtsMeasurements | null | undefined,
  inputSource: CigaretteButtsInputSource,
  flags: MeasurementClearFlags,
  explicitInputSource: boolean,
): void {
  if (existing && !flags.volumeClearRequested && normalized.cigaretteButtsVolumeLiters === existing.cigaretteButtsVolumeLiters) {
    normalized.cigaretteButtsVolumeProvenance = existing.cigaretteButtsVolumeProvenance;
  }
  if (existing && inputSource === "unknown" && sameCountAndMass(normalized, existing)) {
    normalized.cigaretteButtsCountProvenance = existing.cigaretteButtsCountProvenance;
    normalized.cigaretteButtsMassProvenance = existing.cigaretteButtsMassProvenance;
    normalized.cigaretteButtsConversionFormulaVersion = existing.cigaretteButtsConversionFormulaVersion;
  } else if (inputSource === "unknown" && explicitInputSource) {
    normalized.cigaretteButtsCountProvenance = "unknown";
    normalized.cigaretteButtsMassProvenance = "unknown";
    normalized.cigaretteButtsConversionFormulaVersion = null;
  }
}

function applyExplicitMeasurementNulls(
  normalized: ActionCigaretteButtsMeasurements,
  input: RawCigaretteButtsMeasurementInput,
  options: { preserveExplicitNulls?: boolean; explicitNullFields?: Array<"cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters"> },
): ActionCigaretteButtsMeasurements {
  if (!options.preserveExplicitNulls && !options.explicitNullFields?.length) return normalized;
  const result = { ...normalized };
  let hadExplicitNull = false;
  const shouldPreserve = (field: "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters") => input[field] === null && (options.preserveExplicitNulls || options.explicitNullFields?.includes(field));
  if (shouldPreserve("cigaretteButtsCount")) { result.cigaretteButtsCount = null; result.cigaretteButtsCountProvenance = "unknown"; hadExplicitNull = true; }
  if (shouldPreserve("cigaretteButtsMassKg")) { result.cigaretteButtsMassKg = null; result.cigaretteButtsMassProvenance = "unknown"; hadExplicitNull = true; }
  if (shouldPreserve("cigaretteButtsVolumeLiters")) { result.cigaretteButtsVolumeLiters = null; result.cigaretteButtsVolumeProvenance = "unknown"; }
  if (hadExplicitNull) result.cigaretteButtsConversionFormulaVersion = null;
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
  const singleFieldSource = resolveSingleChangedInputSource(
    countChanged,
    massChanged,
    persistedSource,
    input.cigaretteButtsInputSource,
  );
  if (singleFieldSource) return singleFieldSource;
  if (countChanged && massChanged) return resolveBothChangedInputSource(input.cigaretteButtsInputSource, persistedSource);

  // A condition-only edit must follow the persisted source. An ambiguous
  // historical pair stays ambiguous, regardless of a forged payload hint.
  return persistedSource;
}

function resolveSingleChangedInputSource(
  countChanged: boolean,
  massChanged: boolean,
  persistedSource: CigaretteButtsInputSource,
  inputSource: CigaretteButtsInputSource | undefined,
): CigaretteButtsInputSource | null {
  if (countChanged && !massChanged) return persistedSource === "mass" && inputSource !== "count" ? "mass" : "count";
  if (massChanged && !countChanged) return persistedSource === "count" && inputSource !== "mass" ? "count" : "mass";
  return null;
}

function resolveBothChangedInputSource(
  inputSource: CigaretteButtsInputSource | undefined,
  persistedSource: CigaretteButtsInputSource,
): CigaretteButtsInputSource {
  if (inputSource === "count" || inputSource === "mass") return inputSource;
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
