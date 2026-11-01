import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  computeButtsCount,
  estimateButtsWeightKg,
  isCigaretteButtsMassConversionVersion,
  type CigaretteButtsMassConversionVersion,
} from "@/lib/impact/impact-terrain-2026";

export const MAX_CIGARETTE_BUTTS_COUNT = 5_000_000;
export const MAX_INDIVIDUAL_CIGARETTE_BUTTS_COUNT = 500_000_000;
export const MAX_CIGARETTE_BUTTS_LOTS = 100;
/** Historical volume proxy retained for snapshots written before v2. */
export const CIGARETTE_BUTTS_PER_VOLUME_LITER_V1 = 600;
/** Current volume proxy: an estimative 700 butts/L, not a universal density. */
export const CIGARETTE_BUTTS_PER_VOLUME_LITER_V2 = 700;
export const CIGARETTE_BUTTS_PER_VOLUME_LITER =
  CIGARETTE_BUTTS_PER_VOLUME_LITER_V2;
export const CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 =
  "cleanmymap-butts-volume-v1" as const;
export const CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2 =
  "cleanmymap-butts-volume-v2" as const;
export const CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION =
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2;
/** Explicit historical versions are never replaced by the current version. */
export const CIGARETTE_BUTTS_CONVERSION_RESOLUTION_POLICY_VERSION =
  "cleanmymap-butts-conversion-resolution-v1" as const;
export type CigaretteButtsVolumeConversionVersion =
  | typeof CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1
  | typeof CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2;

const CIGARETTE_BUTTS_VOLUME_FACTORS_PER_LITER: Record<
  CigaretteButtsVolumeConversionVersion,
  number
> = {
  [CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1]:
    CIGARETTE_BUTTS_PER_VOLUME_LITER_V1,
  [CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2]:
    CIGARETTE_BUTTS_PER_VOLUME_LITER_V2,
};

export function isCigaretteButtsVolumeConversionVersion(
  value: unknown,
): value is CigaretteButtsVolumeConversionVersion {
  return value === CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 ||
    value === CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V2;
}

export class CigaretteButtsUnknownConversionVersionError extends Error {
  constructor(
    public readonly source: "mass" | "volume",
    public readonly version: string,
  ) {
    super(`Version de conversion ${source} inconnue: ${version}`);
    this.name = "CigaretteButtsUnknownConversionVersionError";
  }
}

function resolveVolumeConversionVersion(
  version: string | null | undefined,
): CigaretteButtsVolumeConversionVersion {
  if (version == null) return CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION;
  if (!isCigaretteButtsVolumeConversionVersion(version)) {
    throw new CigaretteButtsUnknownConversionVersionError("volume", version);
  }
  return version;
}

function resolveMassConversionVersion(
  version: string | null | undefined,
): CigaretteButtsMassConversionVersion {
  if (version == null) return CIGARETTE_BUTTS_MASS_CONVERSION_VERSION;
  if (!isCigaretteButtsMassConversionVersion(version)) {
    throw new CigaretteButtsUnknownConversionVersionError("mass", version);
  }
  return version;
}

export function getCigaretteButtsVolumeFactor(
  version: string | null | undefined = CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
): number {
  return CIGARETTE_BUTTS_VOLUME_FACTORS_PER_LITER[
    resolveVolumeConversionVersion(version)
  ];
}

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

export type CigaretteButtsRecalculationStatus =
  | "recalculable"
  | "not_recalculable"
  | "not_applicable";

/**
 * Identifies which field was manually observed in the form. `unknown` is
 * reserved for historical pairs whose original source cannot be reconstructed.
 */
export type CigaretteButtsInputSource = "count" | "mass" | "unknown" | null;

export const CIGARETTE_BUTTS_LOT_SOURCES = [
  "count",
  "mass_kg",
  "volume_l",
] as const;

export type CigaretteButtsLotSource =
  (typeof CIGARETTE_BUTTS_LOT_SOURCES)[number];

export type CigaretteButtsLotInput = {
  id: string;
  source: CigaretteButtsLotSource;
  value: number;
  condition: ActionMegotsCondition;
};

export type CigaretteButtsConversionOptions = {
  volumeConversionVersion?: string | null;
  massConversionVersion?: string | null;
  totalCountLimit?: number;
};

export type CigaretteButtsLotResult = CigaretteButtsLotInput & {
  count: number;
  massKg: number;
  rawMassKg: number | null;
  rawVolumeLiters: number | null;
  countProvenance: CigaretteButtsProvenance;
  massProvenance: CigaretteButtsProvenance;
  massConversionFormulaVersion: string | null;
  volumeConversionFormulaVersion: string | null;
};

export type CigaretteButtsLotsSummary = {
  totalCount: number;
  countedCount: number;
  estimatedCount: number;
  totalMassKg: number;
  measuredMassKg: number;
  estimatedMassKg: number;
  totalVolumeLiters: number;
  countedShare: number | null;
  estimatedShare: number | null;
};

export class CigaretteButtsLotsTotalLimitError extends Error {
  constructor(public readonly totalCount: number, public readonly totalCountLimit: number = MAX_CIGARETTE_BUTTS_COUNT) {
    super(getCigaretteButtsLotsTotalLimitMessage(totalCount, totalCountLimit) ?? "Le total des mégots dépasse la limite autorisée.");
    this.name = "CigaretteButtsLotsTotalLimitError";
  }
}

export type ActionCigaretteButtsMeasurements = {
  cigaretteButtsCount: number | null;
  cigaretteButtsMassKg: number | null;
  cigaretteButtsVolumeLiters: number | null;
  cigaretteButtsCondition: ActionMegotsCondition | null;
  cigaretteButtsCountProvenance: CigaretteButtsProvenance;
  cigaretteButtsMassProvenance: CigaretteButtsProvenance;
  cigaretteButtsVolumeProvenance: CigaretteButtsProvenance;
  cigaretteButtsConversionFormulaVersion: string | null;
  /** Whether a derived value can be recomputed from a retained source. */
  cigaretteButtsRecalculationStatus?: CigaretteButtsRecalculationStatus;
  /** Present only for the explicit multi-lot contract. */
  cigaretteButtsLots?: CigaretteButtsLotInput[];
  /** Server-calculated per-lot evidence retained with the metadata. */
  cigaretteButtsLotResults?: CigaretteButtsLotResult[];
  cigaretteButtsLotsSummary?: CigaretteButtsLotsSummary;
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
  cigaretteButtsLots?: CigaretteButtsLotInput[] | null;
  /** Persisted calculation snapshot; never accepted from raw HTTP input. */
  cigaretteButtsLotResults?: CigaretteButtsLotResult[];
  cigaretteButtsLotsSummary?: CigaretteButtsLotsSummary;
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
  cigaretteButtsLots?: CigaretteButtsLotInput[] | null;
};

function resolveCondition(
  value: ActionMegotsCondition | null | undefined,
): ActionMegotsCondition | null {
  return value === "propre" || value === "humide" || value === "mouille"
    ? value
    : null;
}

function isValidLotInput(value: unknown): value is CigaretteButtsLotInput {
  if (!value || typeof value !== "object") return false;
  const lot = value as Partial<CigaretteButtsLotInput>;
  return (
    typeof lot.id === "string" &&
    lot.id.trim().length > 0 &&
    CIGARETTE_BUTTS_LOT_SOURCES.includes(lot.source as CigaretteButtsLotSource) &&
    typeof lot.value === "number" &&
    Number.isFinite(lot.value) &&
    lot.value >= 0 &&
    (lot.source !== "count" || Number.isInteger(lot.value)) &&
    resolveCondition(lot.condition) !== null
  );
}

export function calculateCigaretteButtsLot(
  input: CigaretteButtsLotInput,
  options: CigaretteButtsConversionOptions = {},
): CigaretteButtsLotResult {
  const value = Math.max(0, input.value);
  const massConversionVersion = resolveMassConversionVersion(
    options.massConversionVersion,
  );
  const volumeConversionVersion = resolveVolumeConversionVersion(
    options.volumeConversionVersion,
  );
  const count = input.source === "count"
    ? Math.trunc(value)
    : input.source === "mass_kg"
      ? computeButtsCount(value, input.condition, massConversionVersion)
      : Math.round(value * getCigaretteButtsVolumeFactor(volumeConversionVersion));
  const rawMassKg = input.source === "mass_kg" ? value : null;
  const rawVolumeLiters = input.source === "volume_l" ? value : null;
  const massKg = input.source === "mass_kg"
    ? value
    : estimateButtsWeightKg(count, input.condition, massConversionVersion);

  return {
    ...input,
    value,
    count,
    massKg,
    rawMassKg,
    rawVolumeLiters,
    countProvenance:
      input.source === "count"
        ? "counted"
        : input.source === "mass_kg"
          ? "weight_converted"
          : "volume_converted",
    massProvenance: input.source === "mass_kg" ? "measured" : "weight_converted",
    massConversionFormulaVersion: massConversionVersion,
    volumeConversionFormulaVersion:
      input.source === "volume_l"
        ? volumeConversionVersion
        : null,
  };
}

export function aggregateCigaretteButtsLots(
  lots: CigaretteButtsLotInput[],
  options: CigaretteButtsConversionOptions = {},
): {
  lots: CigaretteButtsLotInput[];
  results: CigaretteButtsLotResult[];
  summary: CigaretteButtsLotsSummary;
} {
  const seen = new Set<string>();
  const validLots = lots.filter((lot) => {
    const id = lot.id.trim();
    if (!isValidLotInput(lot) || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((lot) => ({ ...lot, id: lot.id.trim() }));
  const results = validLots.map((lot) =>
    calculateCigaretteButtsLot(lot, options),
  );
  const countedCount = results
    .filter((result) => result.countProvenance === "counted")
    .reduce((total, result) => total + result.count, 0);
  const totalCount = results.reduce((total, result) => total + result.count, 0);
  const measuredMassKg = results.reduce(
    (total, result) => total + (result.rawMassKg ?? 0),
    0,
  );
  const totalMassKg = results.reduce((total, result) => total + result.massKg, 0);
  const totalVolumeLiters = results.reduce(
    (total, result) => total + (result.rawVolumeLiters ?? 0),
    0,
  );
  const estimatedCount = totalCount - countedCount;
  const estimatedMassKg = totalMassKg - measuredMassKg;
  if (getCigaretteButtsLotsTotalLimitMessage(totalCount, options.totalCountLimit)) {
    throw new CigaretteButtsLotsTotalLimitError(totalCount, options.totalCountLimit);
  }
  return {
    lots: validLots,
    results,
    summary: {
      totalCount,
      countedCount,
      estimatedCount,
      totalMassKg,
      measuredMassKg,
      estimatedMassKg,
      totalVolumeLiters,
      countedShare: totalCount > 0 ? countedCount / totalCount : null,
      estimatedShare: totalCount > 0 ? estimatedCount / totalCount : null,
    },
  };
}

export type CurrentCigaretteButtsProjection = {
  count: number | null;
  results: CigaretteButtsLotResult[] | null;
  status: CigaretteButtsRecalculationStatus;
  source: "lots" | "historical" | "none";
  volumeConversionVersion: string | null;
};

/**
 * Builds the current public projection without rewriting the stored action
 * measurement. Only retained volume lots move to the current volume proxy;
 * counted lots and mass lots keep their own historical source/version where it
 * is known. A scalar historical value without retained lots is never invented.
 */
export function projectCurrentCigaretteButts(
  measurements: Pick<
    ActionCigaretteButtsMeasurements,
    | "cigaretteButtsCount"
    | "cigaretteButtsCountProvenance"
    | "cigaretteButtsLots"
    | "cigaretteButtsLotResults"
  > | null | undefined,
  historicalCount: number | null = measurements?.cigaretteButtsCount ?? null,
): CurrentCigaretteButtsProjection {
  const normalizedHistoricalCount = normalizeCount(historicalCount);
  const lots = measurements?.cigaretteButtsLots;
  if (!lots || lots.length === 0) {
    if (normalizedHistoricalCount === null) {
      return {
        count: null,
        results: null,
        status: "not_applicable",
        source: "none",
        volumeConversionVersion: null,
      };
    }
    return {
      count: normalizedHistoricalCount,
      results: null,
      status: measurements?.cigaretteButtsCountProvenance === "counted"
        ? "not_applicable"
        : "not_recalculable",
      source: "historical",
      volumeConversionVersion: null,
    };
  }

  const persistedResults = measurements?.cigaretteButtsLotResults ?? [];
  const hasCompletePersistedResults = persistedResults.length === lots.length;
  const persistedStatus = hasCompletePersistedResults
    ? resolveLotRecalculationStatus(persistedResults)
    : "not_recalculable";
  if (persistedResults.length > 0 && persistedStatus === "not_recalculable") {
    return {
      count: normalizedHistoricalCount,
      results: hasCompletePersistedResults ? persistedResults : null,
      status: "not_recalculable",
      source: "historical",
      volumeConversionVersion: null,
    };
  }
  const results = lots.map((lot, index) => {
    const persisted = persistedResults[index];
    return calculateCigaretteButtsLot(lot, {
      massConversionVersion:
        lot.source === "mass_kg" && persisted?.source === lot.source
          ? persisted.massConversionFormulaVersion ?? undefined
          : undefined,
      volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
    });
  });
  const count = results.reduce((total, result) => total + result.count, 0);
  const hasVolumeLot = lots.some((lot) => lot.source === "volume_l");
  if (count > MAX_CIGARETTE_BUTTS_COUNT) {
    return {
      count: normalizedHistoricalCount,
      results: persistedResults.length === lots.length ? persistedResults : null,
      status: "not_recalculable",
      source: "historical",
      volumeConversionVersion: null,
    };
  }
  return {
    count,
    results,
    status: hasVolumeLot ? "recalculable" : "not_applicable",
    source: "lots",
    volumeConversionVersion: hasVolumeLot
      ? CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION
      : null,
  };
}

export function calculateCigaretteButtsLotsTotalCount(
  lots: CigaretteButtsLotInput[],
  options: CigaretteButtsConversionOptions = {},
): number {
  return lots.reduce((total, lot) => total + calculateCigaretteButtsLot(lot, options).count, 0);
}

export function getCigaretteButtsLotsTotalLimitMessage(totalCount: number, totalCountLimit: number = MAX_CIGARETTE_BUTTS_COUNT): string | null {
  return totalCount > totalCountLimit
    ? `Le total calculé des mégots doit rester inférieur ou égal à ${totalCountLimit.toLocaleString("fr-FR")}.`
    : null;
}

export function resolveLotRecalculationStatus(
  results: CigaretteButtsLotResult[],
): CigaretteButtsRecalculationStatus {
  if (results.length === 0) return "not_applicable";
  const recalculable = results.every((result) => {
    if (result.source === "mass_kg") return result.rawMassKg !== null && isCigaretteButtsMassConversionVersion(result.massConversionFormulaVersion);
    if (result.source === "volume_l") return isCigaretteButtsMassConversionVersion(result.massConversionFormulaVersion) && isCigaretteButtsVolumeConversionVersion(result.volumeConversionFormulaVersion);
    return isCigaretteButtsMassConversionVersion(result.massConversionFormulaVersion);
  });
  return recalculable ? "recalculable" : "not_recalculable";
}

function normalizeCount(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
}
