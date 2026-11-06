import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  computeButtsCount,
  estimateButtsWeightKg,
  isCigaretteButtsMassConversionVersion,
} from "@/lib/impact/impact-terrain-2026";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  aggregateCigaretteButtsLots,
  calculateCigaretteButtsLot,
  calculateCigaretteButtsLotsTotalCount,
  CIGARETTE_BUTTS_CONVERSION_RESOLUTION_POLICY_VERSION,
  CIGARETTE_BUTTS_LOT_SOURCES,
  CIGARETTE_BUTTS_PER_VOLUME_LITER,
  CIGARETTE_BUTTS_PER_VOLUME_LITER_V1,
  CIGARETTE_BUTTS_PER_VOLUME_LITER_V2,
  CIGARETTE_BUTTS_PROVENANCES,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2,
  CigaretteButtsLotsTotalLimitError,
  CigaretteButtsUnknownConversionVersionError,
  getCigaretteButtsLotsTotalLimitMessage,
  getCigaretteButtsVolumeFactor,
  isCigaretteButtsVolumeConversionVersion,
  MAX_CIGARETTE_BUTTS_COUNT,
  MAX_CIGARETTE_BUTTS_LOTS,
  MAX_INDIVIDUAL_CIGARETTE_BUTTS_COUNT,
  projectCurrentCigaretteButts,
  isCigaretteButtsLotResultStructurallyValid,
  resolveCigaretteButtsLotsMassProvenance,
  resolveCigaretteButtsLotSnapshotStatus,
  resolveLotRecalculationStatus,
  type ActionCigaretteButtsMeasurements,
  type CigaretteButtsInputSource,
  type CigaretteButtsLotInput,
  type CigaretteButtsLotSource,
  type CigaretteButtsMeasurementInput,
  type CigaretteButtsProvenance,
  type CigaretteButtsRecalculationStatus,
  type RawCigaretteButtsMeasurementInput,
} from "./cigarette-butts-engine";
import {
  normalizeClearedCigaretteButtsMeasurements,
  type MeasurementClearFlags,
} from "./cigarette-butts-clearing";

export {
  aggregateCigaretteButtsLots,
  calculateCigaretteButtsLot,
  calculateCigaretteButtsLotsTotalCount,
  CIGARETTE_BUTTS_CONVERSION_RESOLUTION_POLICY_VERSION,
  CIGARETTE_BUTTS_LOT_SOURCES,
  CIGARETTE_BUTTS_PER_VOLUME_LITER,
  CIGARETTE_BUTTS_PER_VOLUME_LITER_V1,
  CIGARETTE_BUTTS_PER_VOLUME_LITER_V2,
  CIGARETTE_BUTTS_PROVENANCES,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2,
  CigaretteButtsLotsTotalLimitError,
  CigaretteButtsUnknownConversionVersionError,
  getCigaretteButtsLotsTotalLimitMessage,
  getCigaretteButtsVolumeFactor,
  isCigaretteButtsVolumeConversionVersion,
  MAX_CIGARETTE_BUTTS_COUNT,
  MAX_CIGARETTE_BUTTS_LOTS,
  MAX_INDIVIDUAL_CIGARETTE_BUTTS_COUNT,
  projectCurrentCigaretteButts,
  isCigaretteButtsLotResultStructurallyValid,
  resolveCigaretteButtsLotsMassProvenance,
  resolveCigaretteButtsLotSnapshotStatus,
  resolveLotRecalculationStatus,
};

export type {
  ActionCigaretteButtsMeasurements,
  CigaretteButtsConversionOptions,
  CigaretteButtsInputSource,
  CigaretteButtsLotInput,
  CigaretteButtsLotSource,
  CigaretteButtsLotResult,
  CigaretteButtsLotsSummary,
  CigaretteButtsMeasurementInput,
  CigaretteButtsProvenance,
  CigaretteButtsRecalculationStatus,
  CigaretteButtsVolumeConversionVersion,
  CurrentCigaretteButtsProjection,
  RawCigaretteButtsMeasurementInput,
} from "./cigarette-butts-engine";

function normalizeNullableNonNegative(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeCount(value: number | null | undefined): number | null {
  const normalized = normalizeNullableNonNegative(value);
  return normalized === null ? null : Math.trunc(normalized);
}

function canonicalInputSource(
  source: CigaretteButtsInputSource | undefined,
): CigaretteButtsInputSource | undefined {
  return source === "mass" ? "mass_kg" : source;
}

function isScalarInputSource(
  source: CigaretteButtsInputSource | null | undefined,
): source is "count" | "mass" | "mass_kg" | "volume_l" {
  return source === "count" || source === "mass" || source === "mass_kg" || source === "volume_l";
}

function toLotSource(source: CigaretteButtsInputSource): CigaretteButtsLotSource {
  return source === "mass" ? "mass_kg" : source as CigaretteButtsLotSource;
}

/**
 * Calculates all scalar equivalents from the one source the user entered.
 * The lot engine remains the sole owner of mass/count conversions; volume is
 * the inverse of the same versioned volume proxy used by volume lots.
 */
export function calculateCigaretteButtsMeasurementFromSource(input: {
  source: CigaretteButtsLotSource;
  value: number;
  condition: ActionMegotsCondition;
  volumeConversionVersion?: string | null;
  massConversionVersion?: string | null;
}): ActionCigaretteButtsMeasurements {
  const result = calculateCigaretteButtsLot({
    id: "scalar-cigarette-butts",
    source: input.source,
    value: input.value,
    condition: input.condition,
  }, {
    volumeConversionVersion: input.volumeConversionVersion,
    massConversionVersion: input.massConversionVersion,
  });
  const volumeConversionVersion = input.volumeConversionVersion ??
    result.volumeConversionFormulaVersion ?? CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION;
  const volumeLiters = input.source === "volume_l"
    ? input.value
    : result.count / getCigaretteButtsVolumeFactor(volumeConversionVersion);
  return {
    cigaretteButtsCount: result.count,
    cigaretteButtsMassKg: result.massKg,
    cigaretteButtsVolumeLiters: volumeLiters,
    cigaretteButtsCondition: input.condition,
    cigaretteButtsCountProvenance: result.countProvenance,
    cigaretteButtsMassProvenance: result.massProvenance,
    cigaretteButtsVolumeProvenance: input.source === "volume_l" ? "measured" : "volume_converted",
    cigaretteButtsConversionFormulaVersion: result.massConversionFormulaVersion,
    cigaretteButtsInputSource: input.source,
    cigaretteButtsVolumeConversionFormulaVersion: volumeConversionVersion,
    cigaretteButtsRecalculationStatus: "recalculable",
  };
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
  if (input.cigaretteButtsLots !== undefined && input.cigaretteButtsLots !== null) {
    return normalizeMeasurementsFromLots(input.cigaretteButtsLots, input, input);
  }

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

  const canonicalSource = canonicalInputSource(input.cigaretteButtsInputSource);
  return {
    cigaretteButtsCount: count,
    cigaretteButtsMassKg: massKg,
    cigaretteButtsVolumeLiters: volumeLiters,
    cigaretteButtsCondition: condition,
    cigaretteButtsCountProvenance: countProvenance,
    cigaretteButtsMassProvenance: massProvenance,
    cigaretteButtsVolumeProvenance: volumeProvenance,
    cigaretteButtsConversionFormulaVersion: conversionFormulaVersion,
    ...(canonicalSource !== undefined ? { cigaretteButtsInputSource: canonicalSource } : {}),
    ...(input.cigaretteButtsVolumeConversionFormulaVersion !== undefined
      ? { cigaretteButtsVolumeConversionFormulaVersion: input.cigaretteButtsVolumeConversionFormulaVersion }
      : {}),
    cigaretteButtsRecalculationStatus: resolveLegacyRecalculationStatus({
      count,
      massKg,
      volumeLiters,
      condition,
      countProvenance,
      massProvenance,
      conversionFormulaVersion,
    }),
  };
}

function normalizeMeasurementsFromLots(
  lots: CigaretteButtsLotInput[],
  persisted?: Pick<
    ActionCigaretteButtsMeasurements,
    "cigaretteButtsLotResults" | "cigaretteButtsLotsSummary"
  >,
  fallbackInput?: CigaretteButtsMeasurementInput,
): ActionCigaretteButtsMeasurements {
  const persistedSnapshot = isPersistedCigaretteButtsLotSnapshotForInputs(lots, persisted);
  if (!persistedSnapshot && hasPersistedLotSnapshot(persisted)) {
    return preserveUnrecalculableLotSnapshot(lots, persisted, fallbackInput ?? {});
  }
  const aggregated = persistedSnapshot
    ? {
        lots: lots.map((lot) => ({ ...lot, id: lot.id.trim() })),
        results: persisted.cigaretteButtsLotResults!,
        summary: persisted.cigaretteButtsLotsSummary!,
      }
    : aggregateCigaretteButtsLots(lots);
  const { summary } = aggregated;
  const hasLots = aggregated.lots.length > 0;
  const countProvenance = !hasLots
    ? "unknown"
    : summary.estimatedCount === 0
      ? "counted"
      : summary.countedCount === 0
        ? aggregated.results.every((result) => result.source === "volume_l")
          ? "volume_converted"
          : "weight_converted"
        : "estimated";
  const lotMassProvenance = !hasLots
    ? "unknown"
    : resolveCigaretteButtsLotsMassProvenance(aggregated.results);
  const massProvenance = lotMassProvenance === "estimated"
    ? "weight_converted"
    : lotMassProvenance;
  const formulaVersions = new Set(
    aggregated.results.flatMap((result) => [
      result.massConversionFormulaVersion,
      result.volumeConversionFormulaVersion,
    ]).filter((version): version is string => Boolean(version)),
  );
  const hasVolumeLot = aggregated.results.some(
    (result) => result.source === "volume_l",
  );
  return {
    cigaretteButtsCount: hasLots ? summary.totalCount : null,
    cigaretteButtsMassKg: hasLots ? summary.totalMassKg : null,
    cigaretteButtsVolumeLiters: hasVolumeLot
      ? summary.totalVolumeLiters
      : null,
    cigaretteButtsCondition: hasLots
      ? aggregated.results[0]?.condition ?? null
      : null,
    cigaretteButtsCountProvenance: countProvenance,
    cigaretteButtsMassProvenance: massProvenance,
    cigaretteButtsVolumeProvenance: hasVolumeLot
      ? "measured"
      : "unknown",
    cigaretteButtsConversionFormulaVersion:
      formulaVersions.size === 1 ? [...formulaVersions][0]! : null,
    cigaretteButtsRecalculationStatus: resolveLotRecalculationStatus(
      aggregated.results,
    ),
    cigaretteButtsLots: aggregated.lots,
    cigaretteButtsLotResults: aggregated.results,
    cigaretteButtsLotsSummary: summary,
  };
}

function resolveLegacyRecalculationStatus(params: {
  count: number | null;
  massKg: number | null;
  volumeLiters: number | null;
  condition: ActionMegotsCondition | null;
  countProvenance: CigaretteButtsProvenance;
  massProvenance: CigaretteButtsProvenance;
  conversionFormulaVersion: string | null;
}): CigaretteButtsRecalculationStatus {
  const hasSource =
    params.count !== null || params.massKg !== null || params.volumeLiters !== null;
  if (!hasSource) return "not_applicable";
  if (params.countProvenance === "counted" && params.massProvenance === "measured") {
    return "not_applicable";
  }
  const hasRecomputableDerivedValue =
    params.condition !== null &&
    isCigaretteButtsMassConversionVersion(params.conversionFormulaVersion) &&
    ((params.massProvenance === "measured" &&
      params.countProvenance === "weight_converted" &&
      params.massKg !== null) ||
      (params.countProvenance === "counted" &&
        params.massProvenance === "weight_converted" &&
        params.count !== null));
  return hasRecomputableDerivedValue ? "recalculable" : "not_recalculable";
}

export function isPersistedCigaretteButtsLotSnapshotForInputs(
  lots: CigaretteButtsLotInput[],
  persisted: Pick<
    ActionCigaretteButtsMeasurements,
    "cigaretteButtsLotResults" | "cigaretteButtsLotsSummary"
  > | undefined,
): persisted is Required<
  Pick<
    ActionCigaretteButtsMeasurements,
    "cigaretteButtsLotResults" | "cigaretteButtsLotsSummary"
  >
> {
  const results = persisted?.cigaretteButtsLotResults;
  const summary = persisted?.cigaretteButtsLotsSummary;
  if (!results || !summary || results.length !== lots.length) return false;
  if (!Number.isFinite(summary.totalCount) || summary.totalCount < 0) return false;
  if (summary.totalMassKg !== null &&
    (!Number.isFinite(summary.totalMassKg) || summary.totalMassKg < 0)) return false;
  if (!Number.isFinite(summary.measuredMassKg) || summary.measuredMassKg < 0) return false;
  if (summary.estimatedMassKg !== null &&
    (!Number.isFinite(summary.estimatedMassKg) || summary.estimatedMassKg < 0)) return false;
  return lots.every((lot, index) => {
    const result = results[index];
    if (!result) return false;
    return isCigaretteButtsLotResultStructurallyValid(lot, result);
  });
}

function hasPersistedLotSnapshot(
  persisted: Pick<
    ActionCigaretteButtsMeasurements,
    "cigaretteButtsLotResults" | "cigaretteButtsLotsSummary"
  > | undefined,
): boolean {
  return persisted?.cigaretteButtsLotResults !== undefined ||
    persisted?.cigaretteButtsLotsSummary !== undefined;
}

function preserveUnrecalculableLotSnapshot(
  lots: CigaretteButtsLotInput[],
  persisted: Pick<
    ActionCigaretteButtsMeasurements,
    "cigaretteButtsLotResults" | "cigaretteButtsLotsSummary"
  > | undefined,
  fallbackInput: CigaretteButtsMeasurementInput,
): ActionCigaretteButtsMeasurements {
  const normalizedLots = lots.map((lot) => ({ ...lot, id: lot.id.trim() }));
  const results = persisted?.cigaretteButtsLotResults ?? [];
  const summary = persisted?.cigaretteButtsLotsSummary;
  const count = summary?.totalCount ?? normalizeCount(fallbackInput.cigaretteButtsCount);
  const massKg = summary
    ? summary.totalMassKg
    : normalizeNullableNonNegative(fallbackInput.cigaretteButtsMassKg);
  const hasDerivedLot = normalizedLots.some((lot) => lot.source !== "count");
  const hasVolumeLot = normalizedLots.some((lot) => lot.source === "volume_l");
  const formulaVersions = new Set(
    results.flatMap((result) => [
      result.massConversionFormulaVersion,
      result.volumeConversionFormulaVersion,
    ]).filter((version): version is string => Boolean(version)),
  );
  return {
    cigaretteButtsCount: count,
    cigaretteButtsMassKg: massKg,
    cigaretteButtsVolumeLiters: hasVolumeLot
      ? summary?.totalVolumeLiters ?? normalizeNullableNonNegative(fallbackInput.cigaretteButtsVolumeLiters)
      : null,
    cigaretteButtsCondition: results[0]?.condition ?? normalizedLots[0]?.condition ??
      resolveCondition(fallbackInput.cigaretteButtsCondition),
    cigaretteButtsCountProvenance: normalizedLots.length > 0 &&
      normalizedLots.every((lot) => lot.source === "count")
      ? "counted"
      : "unknown",
    cigaretteButtsMassProvenance: results.length === 0 && massKg !== null
      ? resolveProvenance(fallbackInput.cigaretteButtsMassProvenance, "unknown")
      : "unknown",
    cigaretteButtsVolumeProvenance: hasVolumeLot
      ? resolveProvenance(fallbackInput.cigaretteButtsVolumeProvenance, "measured")
      : "unknown",
    cigaretteButtsConversionFormulaVersion: formulaVersions.size === 1
      ? [...formulaVersions][0]!
      : fallbackInput.cigaretteButtsConversionFormulaVersion ?? null,
    cigaretteButtsRecalculationStatus: hasDerivedLot
      ? "not_recalculable"
      : "not_applicable",
    cigaretteButtsLots: normalizedLots,
    cigaretteButtsLotResults: results,
    cigaretteButtsLotsSummary: summary,
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
    explicitMeasurementFields?: Array<
      "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters"
    >;
    /** Persisted server metadata used to protect historical provenance. */
    existingMeasurements?: ActionCigaretteButtsMeasurements | null;
  } = {},
): ActionCigaretteButtsMeasurements {
  if (input.cigaretteButtsLots !== undefined) {
    return normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: input.cigaretteButtsLots ?? [],
    });
  }

  const existingMeasurements = options.existingMeasurements;
  const effectiveInput = mergeExistingMeasurementInput(input, existingMeasurements);
  const clearFlags = readMeasurementClearFlags(input, existingMeasurements);
  const explicitMeasurementFields = options.explicitMeasurementFields ??
    inferExplicitMeasurementFields(input);
  const inputSource = resolveUserInputSource(
    effectiveInput,
    existingMeasurements,
    explicitMeasurementFields,
  );
  const cleared = normalizeClearedCigaretteButtsMeasurements(
    effectiveInput,
    existingMeasurements,
    clearFlags,
    normalizeCigaretteButtsMeasurements,
    inferCigaretteButtsInputSource,
    inputSource,
  );
  if (cleared) return cleared;
  const explicitInputSource = hasExplicitInputSource(effectiveInput, existingMeasurements);
  const scalarSource = isScalarInputSource(inputSource) ? toLotSource(inputSource) : null;
  const scalarValue = scalarSource === "count"
    ? normalizeCount(effectiveInput.cigaretteButtsCount)
    : scalarSource === "mass_kg"
      ? normalizeNullableNonNegative(effectiveInput.cigaretteButtsMassKg)
      : scalarSource === "volume_l"
        ? normalizeNullableNonNegative(effectiveInput.cigaretteButtsVolumeLiters)
        : null;
  const scalarCondition = resolveCondition(effectiveInput.cigaretteButtsCondition);
  const existingScalarSource = isScalarInputSource(inferCigaretteButtsInputSource(existingMeasurements))
    ? toLotSource(inferCigaretteButtsInputSource(existingMeasurements))
    : null;
  const sameScalarValuesAsExisting = existingMeasurements !== null && existingMeasurements !== undefined &&
    sameMeasurementValue(normalizeCount(effectiveInput.cigaretteButtsCount), existingMeasurements.cigaretteButtsCount) &&
    sameMeasurementValue(normalizeNullableNonNegative(effectiveInput.cigaretteButtsMassKg), existingMeasurements.cigaretteButtsMassKg) &&
    sameMeasurementValue(normalizeNullableNonNegative(effectiveInput.cigaretteButtsVolumeLiters), existingMeasurements.cigaretteButtsVolumeLiters);
  if (
    existingMeasurements &&
    scalarSource &&
    scalarCondition === existingMeasurements.cigaretteButtsCondition &&
    sameScalarValuesAsExisting &&
    existingScalarSource === scalarSource
  ) {
    return existingMeasurements;
  }
  if (scalarSource && scalarValue !== null && scalarCondition) {
    const reuseHistoricalVersions = existingMeasurements !== null &&
      existingMeasurements !== undefined &&
      sameScalarValuesAsExisting &&
      existingScalarSource === scalarSource;
    return calculateCigaretteButtsMeasurementFromSource({
      source: scalarSource,
      value: scalarValue,
      condition: scalarCondition,
      volumeConversionVersion: reuseHistoricalVersions
        ? existingMeasurements.cigaretteButtsVolumeConversionFormulaVersion
        : undefined,
      massConversionVersion: reuseHistoricalVersions
        ? existingMeasurements.cigaretteButtsConversionFormulaVersion
        : undefined,
    });
  }
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
  if (source === "mass" || source === "mass_kg") return { ...input, cigaretteButtsCount: null, deriveMissingFromMassOrCount: true };
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
    normalized.cigaretteButtsVolumeConversionFormulaVersion =
      existing.cigaretteButtsVolumeConversionFormulaVersion;
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
  explicitMeasurementFields: readonly string[] = [],
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
  const volumeChanged =
    input.cigaretteButtsVolumeLiters !== undefined &&
    !sameMeasurementValue(
      normalizeNullableNonNegative(input.cigaretteButtsVolumeLiters),
      existingMeasurements.cigaretteButtsVolumeLiters,
    );
  const explicitSource = input.cigaretteButtsInputSource;
  if (isScalarInputSource(explicitSource)) {
    const sourceValueChanged = explicitSource === "count"
      ? countChanged
      : explicitSource === "mass" || explicitSource === "mass_kg"
        ? massChanged
        : volumeChanged;
    const canonicalPersistedSource = canonicalInputSource(persistedSource);
    const sourceField = scalarMeasurementField(explicitSource);
    const sourceWasSubmitted = sourceField !== null && explicitMeasurementFields.includes(sourceField);
    const persistedField = scalarMeasurementField(persistedSource);
    const persistedSourceWasCleared = persistedField !== null && (
      persistedField === "cigaretteButtsCount"
        ? input.cigaretteButtsCount === null
        : persistedField === "cigaretteButtsMassKg"
          ? input.cigaretteButtsMassKg === null
          : input.cigaretteButtsVolumeLiters === null
    );
    const sourceValue = sourceField === "cigaretteButtsCount"
      ? normalizeCount(input.cigaretteButtsCount)
      : sourceField === "cigaretteButtsMassKg"
        ? normalizeNullableNonNegative(input.cigaretteButtsMassKg)
        : sourceField === "cigaretteButtsVolumeLiters"
          ? normalizeNullableNonNegative(input.cigaretteButtsVolumeLiters)
          : null;
    if (
      sourceValue !== null &&
      (
        sourceValueChanged ||
        canonicalPersistedSource === canonicalInputSource(explicitSource) ||
        (sourceWasSubmitted && persistedSourceWasCleared && persistedField !== sourceField)
      )
    ) {
      return explicitSource;
    }
  }
  const singleFieldSource = resolveSingleChangedInputSource(
    countChanged,
    massChanged,
    volumeChanged,
  );
  if (singleFieldSource) return singleFieldSource;
  if (countChanged || massChanged || volumeChanged) {
    return resolveBothChangedInputSource(input.cigaretteButtsInputSource, persistedSource);
  }

  // A condition-only edit must follow the persisted source. An ambiguous
  // historical pair stays ambiguous, regardless of a forged payload hint.
  return persistedSource;
}

function inferExplicitMeasurementFields(
  input: RawCigaretteButtsMeasurementInput,
): Array<"cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters"> {
  const fields = [
    "cigaretteButtsCount",
    "cigaretteButtsMassKg",
    "cigaretteButtsVolumeLiters",
  ] as const;
  return fields.filter((field): field is typeof fields[number] =>
    Object.prototype.hasOwnProperty.call(input, field),
  );
}

function scalarMeasurementField(
  source: CigaretteButtsInputSource,
): "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters" | null {
  if (source === "count") return "cigaretteButtsCount";
  if (source === "mass" || source === "mass_kg") return "cigaretteButtsMassKg";
  if (source === "volume_l") return "cigaretteButtsVolumeLiters";
  return null;
}

function resolveSingleChangedInputSource(
  countChanged: boolean,
  massChanged: boolean,
  volumeChanged: boolean,
): CigaretteButtsInputSource | null {
  if (countChanged && !massChanged && !volumeChanged) return "count";
  if (massChanged && !countChanged && !volumeChanged) return "mass_kg";
  if (volumeChanged && !countChanged && !massChanged) return "volume_l";
  return null;
}

function resolveBothChangedInputSource(
  inputSource: CigaretteButtsInputSource | undefined,
  persistedSource: CigaretteButtsInputSource,
): CigaretteButtsInputSource {
  if (inputSource === "count" || inputSource === "mass" || inputSource === "mass_kg" || inputSource === "volume_l") return inputSource;
  return persistedSource;
}

export function hasCigaretteButtsMeasurement(
  measurements: Pick<RawCigaretteButtsMeasurementInput, "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters" | "cigaretteButtsLots"> | null | undefined,
): boolean {
  if (!measurements) return false;
  if (measurements.cigaretteButtsLots !== undefined) return Boolean(measurements.cigaretteButtsLots?.length);
  return [measurements.cigaretteButtsCount, measurements.cigaretteButtsMassKg, measurements.cigaretteButtsVolumeLiters]
    .some((value) => value !== null && value !== undefined);
}

export function inferCigaretteButtsInputSource(
  measurements: ActionCigaretteButtsMeasurements | null | undefined,
): CigaretteButtsInputSource {
  if (!measurements) return null;
  if (measurements.cigaretteButtsLots !== undefined) return null;

  if (measurements.cigaretteButtsInputSource !== undefined && measurements.cigaretteButtsInputSource !== null) {
    return canonicalInputSource(measurements.cigaretteButtsInputSource) ?? null;
  }

  const hasCount = measurements.cigaretteButtsCount !== null;
  const hasMass = measurements.cigaretteButtsMassKg !== null;
  const hasVolume = measurements.cigaretteButtsVolumeLiters !== null;
  if (!hasCount && !hasMass && !hasVolume) return null;

  if (
    hasVolume &&
    measurements.cigaretteButtsVolumeProvenance === "measured" &&
    measurements.cigaretteButtsCountProvenance === "volume_converted"
  ) {
    return "volume_l";
  }

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
