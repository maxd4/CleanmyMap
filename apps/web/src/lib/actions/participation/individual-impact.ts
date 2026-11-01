import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  computeButtsCount,
  estimateButtsWeightKg,
  isCigaretteButtsMassConversionVersion,
} from "@/lib/impact/impact-terrain-2026";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  aggregateCigaretteButtsLots,
  type CigaretteButtsLotInput,
  type CigaretteButtsLotResult,
  type CigaretteButtsLotsSummary,
  MAX_INDIVIDUAL_CIGARETTE_BUTTS_COUNT,
  isCigaretteButtsVolumeConversionVersion,
} from "@/lib/waste/cigarette-butts";

export const WASTE_MOISTURE_NORMALIZATION_VERSION =
  "impact-terrain-2026-waste-moisture-v1" as const;

const WASTE_MOISTURE_CONDITIONS = ["sec", "humide", "mouille"] as const;
type WasteMoistureCondition = (typeof WASTE_MOISTURE_CONDITIONS)[number];
type IndividualButtsProvenance = "counted" | "measured" | "derived" | "unknown";

export type StoredIndividualCigaretteButtsLots = {
  lots: CigaretteButtsLotInput[];
  results: CigaretteButtsLotResult[];
  summary: CigaretteButtsLotsSummary;
};

type IndividualImpactFields = {
  wasteKg: number | null;
  wasteCondition: WasteMoistureCondition | null;
  wasteMeasurementMethod: string | null;
  wasteNormalizationVersion: string | null;
  cigaretteButtsCount: number | null;
  cigaretteButtsMassKg: number | null;
  cigaretteButtsCondition: ActionMegotsCondition | null;
  cigaretteButtsProvenance: IndividualButtsProvenance | null;
  cigaretteButtsConversionVersion: string | null;
  cigaretteButtsLots?: StoredIndividualCigaretteButtsLots | null;
  measuredBy: string | null;
  measuredAt: string | null;
};

export type IndividualImpactMeasurement = IndividualImpactFields & {
  equivalentSecKg: number | null;
  comparableButtsCount: number | null;
  comparableButtsProvenance: "counted" | "derived" | null;
};

export type IndividualImpactMeasurementInput = {
  wasteKg?: number | null;
  wasteCondition?: WasteMoistureCondition | null;
  wasteMeasurementMethod?: string | null;
  cigaretteButtsCount?: number | null;
  cigaretteButtsMassKg?: number | null;
  cigaretteButtsCondition?: ActionMegotsCondition | null;
  cigaretteButtsLots?: CigaretteButtsLotInput[] | null;
  cigaretteButtsProvenance?: IndividualButtsProvenance | null;
  cigaretteButtsConversionVersion?: string | null;
  measuredBy?: string | null;
  measuredAt?: string | null;
};

export type StoredIndividualImpactBuildOptions = {
  /**
   * Snapshot already persisted by the server. It is never rebuilt from raw
   * lot inputs during a PATCH that does not replace the lots explicitly.
   */
  preservedCigaretteButtsLots?: StoredIndividualCigaretteButtsLots | null;
};

export type StoredIndividualImpactMeasurement = IndividualImpactFields;

export type IndividualImpactRow = {
  individual_waste_kg?: number | string | null;
  individual_waste_condition?: string | null;
  individual_waste_measurement_method?: string | null;
  individual_waste_normalization_version?: string | null;
  individual_cigarette_butts_count?: number | string | null;
  individual_cigarette_butts_mass_kg?: number | string | null;
  individual_cigarette_butts_condition?: string | null;
  individual_cigarette_butts_provenance?: string | null;
  individual_cigarette_butts_conversion_version?: string | null;
  individual_cigarette_butts_lots?: unknown | null;
  individual_impact_measured_by?: string | null;
  individual_impact_measured_at?: string | null;
};

export type IndividualImpactReadOptions = {
  /**
   * Rebuilds derived cigarette-butt values from retained raw lot/scalar
   * sources. Ordinary reads keep the persisted snapshot so historical views
   * do not silently change when the current scientific method changes.
   */
  recalculateDerived?: boolean;
};

function finiteNonNegative(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeNullableInteger(value: unknown): number | null {
  const parsed = finiteNonNegative(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalizeWasteCondition(value: unknown): WasteMoistureCondition | null {
  return WASTE_MOISTURE_CONDITIONS.includes(value as WasteMoistureCondition)
    ? (value as WasteMoistureCondition)
    : null;
}

function normalizeButtsCondition(value: unknown): ActionMegotsCondition | null {
  return value === "propre" || value === "humide" || value === "mouille"
    ? value
    : null;
}

function wasteFactor(condition: WasteMoistureCondition): number {
  return condition === "sec"
    ? 1
    : condition === "humide"
      ? 0.7
      : 0.4;
}

function projectionCondition(
  results: CigaretteButtsLotResult[],
): ActionMegotsCondition | null {
  const conditions = new Set(results.map((result) => result.condition));
  return conditions.size === 1 ? results[0]?.condition ?? null : null;
}

function projectionVersion(
  results: CigaretteButtsLotResult[],
): string | null {
  const versions = new Set(
    results.flatMap((result) => [
      result.massConversionFormulaVersion,
      result.volumeConversionFormulaVersion,
    ]).filter((version): version is string => Boolean(version)),
  );
  return versions.size === 1 ? [...versions][0] ?? null : null;
}

function buildStoredCigaretteButtsLots(
  lots: CigaretteButtsLotInput[],
): StoredIndividualCigaretteButtsLots | null {
  if (lots.length === 0) return null;
  const aggregate = aggregateCigaretteButtsLots(lots, {
    totalCountLimit: MAX_INDIVIDUAL_CIGARETTE_BUTTS_COUNT,
  });
  return aggregate.lots.length > 0 ? aggregate : null;
}

function isStoredCigaretteButtsLots(
  value: unknown,
): value is StoredIndividualCigaretteButtsLots {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredIndividualCigaretteButtsLots>;
  return Array.isArray(candidate.lots) &&
    candidate.lots.length > 0 &&
    Array.isArray(candidate.results) &&
    Boolean(candidate.summary && typeof candidate.summary === "object") &&
    typeof candidate.summary?.totalCount === "number" &&
    Number.isFinite(candidate.summary.totalCount) &&
    candidate.summary.totalCount >= 0;
}

export function buildStoredIndividualImpactMeasurement(
  input: IndividualImpactMeasurementInput,
  options: StoredIndividualImpactBuildOptions = {},
): StoredIndividualImpactMeasurement {
  const wasteKg = finiteNonNegative(input.wasteKg);
  const wasteCondition = normalizeWasteCondition(input.wasteCondition);
  const cigaretteButtsCount = normalizeNullableInteger(input.cigaretteButtsCount);
  const cigaretteButtsMassKg = finiteNonNegative(input.cigaretteButtsMassKg);
  const cigaretteButtsCondition = normalizeButtsCondition(input.cigaretteButtsCondition);
  const cigaretteButtsLots = options.preservedCigaretteButtsLots !== undefined
    ? options.preservedCigaretteButtsLots
    : input.cigaretteButtsLots
      ? buildStoredCigaretteButtsLots(input.cigaretteButtsLots)
      : null;
  const lotResults = cigaretteButtsLots?.results ?? [];
  const hasButts = cigaretteButtsLots !== null || cigaretteButtsCount !== null || cigaretteButtsMassKg !== null;

  return {
    wasteKg,
    wasteCondition: wasteKg === null ? null : wasteCondition,
    wasteMeasurementMethod: wasteKg === null ? null : input.wasteMeasurementMethod?.trim() || null,
    wasteNormalizationVersion: wasteKg === null ? null : WASTE_MOISTURE_NORMALIZATION_VERSION,
    cigaretteButtsCount: cigaretteButtsLots?.summary.totalCount ?? cigaretteButtsCount,
    cigaretteButtsMassKg: cigaretteButtsLots?.summary.totalMassKg ?? cigaretteButtsMassKg,
    cigaretteButtsCondition: cigaretteButtsLots
      ? projectionCondition(lotResults)
      : hasButts ? cigaretteButtsCondition : null,
    cigaretteButtsLots,
    cigaretteButtsProvenance: input.cigaretteButtsProvenance !== undefined
      ? input.cigaretteButtsProvenance
      : cigaretteButtsLots
        ? (cigaretteButtsLots.summary.estimatedCount === 0 ? "counted" : "derived")
      : cigaretteButtsCount !== null
        ? "counted"
        : cigaretteButtsMassKg !== null
          ? "measured"
          : null,
    cigaretteButtsConversionVersion: cigaretteButtsLots && input.cigaretteButtsConversionVersion !== undefined
      ? input.cigaretteButtsConversionVersion
      : cigaretteButtsLots
        ? projectionVersion(lotResults)
      : input.cigaretteButtsConversionVersion ??
          (cigaretteButtsCount === null && cigaretteButtsMassKg !== null
            ? CIGARETTE_BUTTS_MASS_CONVERSION_VERSION
            : null),
    measuredBy: input.measuredBy?.trim() || null,
    measuredAt: input.measuredAt ?? null,
  };
}

export function toIndividualImpactMeasurement(
  row: IndividualImpactRow | null | undefined,
  options: IndividualImpactReadOptions = {},
): IndividualImpactMeasurement | null {
  if (!row) return null;
  const stored = buildStoredIndividualImpactMeasurement({
    wasteKg: finiteNonNegative(row.individual_waste_kg),
    wasteCondition: normalizeWasteCondition(row.individual_waste_condition),
    wasteMeasurementMethod: row.individual_waste_measurement_method,
    cigaretteButtsCount: normalizeNullableInteger(row.individual_cigarette_butts_count),
    cigaretteButtsMassKg: finiteNonNegative(row.individual_cigarette_butts_mass_kg),
    cigaretteButtsCondition: normalizeButtsCondition(row.individual_cigarette_butts_condition),
    cigaretteButtsProvenance: normalizeIndividualButtsProvenance(row.individual_cigarette_butts_provenance),
    cigaretteButtsConversionVersion: row.individual_cigarette_butts_conversion_version ?? null,
    measuredBy: row.individual_impact_measured_by,
    measuredAt: row.individual_impact_measured_at,
  });
  const persistedLots = isStoredCigaretteButtsLots(row.individual_cigarette_butts_lots)
    ? row.individual_cigarette_butts_lots
    : null;
  const recalculatedLots = options.recalculateDerived && persistedLots && canRecalculatePersistedLots(persistedLots)
    ? aggregateCigaretteButtsLots(persistedLots.lots, {
        totalCountLimit: MAX_INDIVIDUAL_CIGARETTE_BUTTS_COUNT,
      })
    : null;
  const canonicalStored = recalculatedLots
    ? {
        ...stored,
        cigaretteButtsCount: recalculatedLots.summary.totalCount,
        cigaretteButtsMassKg: recalculatedLots.summary.totalMassKg,
        cigaretteButtsCondition: projectionCondition(recalculatedLots.results),
        cigaretteButtsLots: recalculatedLots,
        cigaretteButtsConversionVersion: projectionVersion(recalculatedLots.results),
      }
    : persistedLots
      ? { ...stored, cigaretteButtsLots: persistedLots }
      : options.recalculateDerived
        ? recalculateLegacyDerivedButts(stored)
        : stored;
  const hasMeasurement = canonicalStored.wasteKg !== null || canonicalStored.cigaretteButtsLots !== null || canonicalStored.cigaretteButtsCount !== null || canonicalStored.cigaretteButtsMassKg !== null;
  if (!hasMeasurement) return null;

  const equivalentSecKg =
    canonicalStored.wasteKg !== null && canonicalStored.wasteCondition !== null
      ? canonicalStored.wasteKg * wasteFactor(canonicalStored.wasteCondition)
      : null;
  const comparableButtsCount =
    canonicalStored.cigaretteButtsLots?.summary.totalCount ??
    canonicalStored.cigaretteButtsCount ??
    (canonicalStored.cigaretteButtsMassKg !== null && canonicalStored.cigaretteButtsCondition !== null &&
    isCigaretteButtsMassConversionVersion(canonicalStored.cigaretteButtsConversionVersion)
      ? computeButtsCount(
          canonicalStored.cigaretteButtsMassKg,
          canonicalStored.cigaretteButtsCondition,
          canonicalStored.cigaretteButtsConversionVersion,
        )
      : null);

  return {
    ...canonicalStored,
    equivalentSecKg,
    comparableButtsCount,
    comparableButtsProvenance:
      canonicalStored.cigaretteButtsLots
        ? canonicalStored.cigaretteButtsLots.summary.estimatedCount === 0
          ? "counted"
          : comparableButtsCount !== null ? "derived" : null
        : canonicalStored.cigaretteButtsCount !== null
          ? canonicalStored.cigaretteButtsProvenance === "counted"
            ? "counted"
            : canonicalStored.cigaretteButtsProvenance === "derived"
              ? "derived"
              : null
          : comparableButtsCount !== null
            ? "derived"
            : null,
  };
}

function normalizeIndividualButtsProvenance(
  value: unknown,
): IndividualButtsProvenance | null | undefined {
  if (value === undefined) return undefined;
  return value === "counted" || value === "measured" || value === "derived" || value === "unknown"
    ? value
    : null;
}

function canRecalculatePersistedLots(
  persistedLots: StoredIndividualCigaretteButtsLots,
): boolean {
  return persistedLots.results.length === persistedLots.lots.length && persistedLots.lots.every((lot) => {
    const result = persistedLots.results.find((candidate) => candidate.id === lot.id);
    if (!result || result.source !== lot.source || result.value !== lot.value || result.condition !== lot.condition) {
      return false;
    }
    if (result.source === "volume_l") {
      return result.rawVolumeLiters !== null &&
        isCigaretteButtsMassConversionVersion(result.massConversionFormulaVersion) &&
        isCigaretteButtsVolumeConversionVersion(result.volumeConversionFormulaVersion);
    }
    if (result.source === "mass_kg" && result.rawMassKg === null) return false;
    return isCigaretteButtsMassConversionVersion(result.massConversionFormulaVersion);
  });
}

function recalculateLegacyDerivedButts(
  stored: StoredIndividualImpactMeasurement,
): StoredIndividualImpactMeasurement {
  if (
    stored.cigaretteButtsMassKg !== null &&
    stored.cigaretteButtsCondition !== null &&
    stored.cigaretteButtsProvenance === "measured" &&
    isCigaretteButtsMassConversionVersion(stored.cigaretteButtsConversionVersion)
  ) {
    const count = computeButtsCount(
      stored.cigaretteButtsMassKg,
      stored.cigaretteButtsCondition,
    );
    return {
      ...stored,
      cigaretteButtsCount: count,
      cigaretteButtsConversionVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    };
  }

  if (
    stored.cigaretteButtsCount !== null &&
    stored.cigaretteButtsCondition !== null &&
    stored.cigaretteButtsProvenance === "counted" &&
    isCigaretteButtsMassConversionVersion(stored.cigaretteButtsConversionVersion)
  ) {
    return {
      ...stored,
      cigaretteButtsMassKg: estimateButtsWeightKg(
        stored.cigaretteButtsCount,
        stored.cigaretteButtsCondition,
      ),
      cigaretteButtsConversionVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    };
  }

  return stored;
}

type AllocationKind = "individual" | "quote_part" | "unavailable";

export type ActionParticipantImpactAttribution = {
  wasteKg: number | null;
  wasteKind: AllocationKind;
  wasteEquivalentSecKg: number | null;
  wasteMohsValue: number | null;
  wasteMohsSource: "equivalent_sec" | "quote_part_collective_raw" | null;
  cigaretteButts: number | null;
  cigaretteButtsKind: AllocationKind;
  cigaretteButtsProvenance: "counted" | "derived" | null;
  wasteInconsistent: boolean;
  cigaretteButtsInconsistent: boolean;
  wasteMohsEligible: boolean;
  cigaretteButtsMohsEligible: boolean;
};

type ConfirmedParticipant = {
  id: string;
  participationStatus: string;
  measurement: IndividualImpactMeasurement | null;
};

function allocateMetric(
  total: number | null,
  participants: ConfirmedParticipant[],
  read: (measurement: IndividualImpactMeasurement) => number | null,
): Map<string, { value: number | null; kind: AllocationKind; exactTotal: number; remaining: number | null; inconsistent: boolean }> {
  const measured = participants.flatMap((participant) => {
    const value = participant.measurement ? read(participant.measurement) : null;
    return value === null ? [] : [{ participantId: participant.id, value }];
  });
  const exactTotal = measured.reduce((sum, item) => sum + item.value, 0);
  const measuredById = new Map(measured.map((item) => [item.participantId, item.value] as const));
  const inconsistent = total !== null && exactTotal > total;
  const missingCount = participants.length - measured.length;
  const remaining = total === null || inconsistent ? null : Math.max(0, total - exactTotal);
  const quotePart = total !== null && measured.length === 0 && participants.length > 0 ? total / participants.length : null;
  const result = new Map<string, { value: number | null; kind: AllocationKind; exactTotal: number; remaining: number | null; inconsistent: boolean }>();

  for (const participant of participants) {
    if (measuredById.has(participant.id)) {
      result.set(participant.id, { value: measuredById.get(participant.id) ?? null, kind: "individual", exactTotal, remaining, inconsistent });
      continue;
    }
    const value = quotePart ?? (remaining !== null && missingCount > 0 ? remaining / missingCount : null);
    result.set(participant.id, { value, kind: value === null ? "unavailable" : "quote_part", exactTotal, remaining, inconsistent });
  }
  return result;
}

function buildParticipantAttribution(
  participant: ConfirmedParticipant,
  waste: ReturnType<typeof allocateMetric>,
  butts: ReturnType<typeof allocateMetric>,
): ActionParticipantImpactAttribution {
  const wasteValue = waste.get(participant.id);
  const buttsValue = butts.get(participant.id);
  const measurement = participant.measurement;
  return {
    ...buildWasteAttribution(wasteValue, measurement),
    ...buildButtsAttribution(buttsValue, measurement),
  };
}

function buildWasteAttribution(
  wasteValue: ReturnType<typeof allocateMetric> extends Map<string, infer TValue> ? TValue | undefined : never,
  measurement: IndividualImpactMeasurement | null,
) {
  const wasteMohs = resolveWasteMohsValue(wasteValue, measurement);
  return {
    wasteKg: nullableValue(wasteValue?.value),
    wasteKind: wasteValue?.kind ?? "unavailable" as const,
    wasteEquivalentSecKg: individualMeasurementValue(wasteValue?.kind, measurement?.equivalentSecKg),
    wasteMohsValue: wasteMohs.value,
    wasteMohsSource: wasteMohs.source,
    wasteInconsistent: Boolean(wasteValue?.inconsistent),
    wasteMohsEligible: !Boolean(wasteValue?.inconsistent) && wasteMohs.source !== null,
  };
}

function buildButtsAttribution(
  buttsValue: ReturnType<typeof allocateMetric> extends Map<string, infer TValue> ? TValue | undefined : never,
  measurement: IndividualImpactMeasurement | null,
) {
  return {
    cigaretteButts: nullableValue(buttsValue?.value),
    cigaretteButtsKind: buttsValue?.kind ?? "unavailable" as const,
    cigaretteButtsProvenance: individualMeasurementValue(buttsValue?.kind, measurement?.comparableButtsProvenance),
    cigaretteButtsInconsistent: Boolean(buttsValue?.inconsistent),
    cigaretteButtsMohsEligible: !Boolean(buttsValue?.inconsistent),
  };
}

function resolveWasteMohsValue(
  wasteValue: ReturnType<typeof allocateMetric> extends Map<string, infer TValue>
    ? TValue | undefined
    : never,
  measurement: IndividualImpactMeasurement | null,
): {
  value: number | null;
  source: "equivalent_sec" | "quote_part_collective_raw" | null;
} {
  if (wasteValue?.kind === "individual") {
    const value = nullableValue(measurement?.equivalentSecKg);
    return { value, source: value === null ? null : "equivalent_sec" };
  }
  if (wasteValue?.kind === "quote_part" && wasteValue.value !== null) {
    return { value: wasteValue.value, source: "quote_part_collective_raw" };
  }
  return { value: null, source: null };
}

function nullableValue<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function individualMeasurementValue<T>(kind: AllocationKind | undefined, value: T | null | undefined): T | null {
  return kind === "individual" ? nullableValue(value) : null;
}

export function allocateActionParticipantImpact(params: {
  totalWasteKg: number | null;
  totalCigaretteButts: number | null;
  participants: ConfirmedParticipant[];
}): Map<string, ActionParticipantImpactAttribution> {
  const participants = params.participants.filter(
    (participant) => participant.participationStatus === "confirmed",
  );
  const waste = allocateMetric(
    finiteNonNegative(params.totalWasteKg),
    participants,
    (measurement) => measurement.wasteKg,
  );
  const butts = allocateMetric(
    normalizeNullableInteger(params.totalCigaretteButts),
    participants,
    (measurement) => measurement.comparableButtsCount,
  );

  return new Map(participants.map((participant) => [
    participant.id,
    buildParticipantAttribution(participant, waste, butts),
  ]));
}

const INDIVIDUAL_IMPACT_COLUMN_LIST = [
  "individual_waste_kg",
  "individual_waste_condition",
  "individual_waste_measurement_method",
  "individual_waste_normalization_version",
  "individual_cigarette_butts_count",
  "individual_cigarette_butts_mass_kg",
  "individual_cigarette_butts_condition",
  "individual_cigarette_butts_provenance",
  "individual_cigarette_butts_conversion_version",
  "individual_cigarette_butts_lots",
  "individual_impact_measured_by",
  "individual_impact_measured_at",
] as const;

export const INDIVIDUAL_IMPACT_SELECT = INDIVIDUAL_IMPACT_COLUMN_LIST.join(", ");
export const REVIEW_SELECT = `id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source, ${INDIVIDUAL_IMPACT_SELECT}`;
