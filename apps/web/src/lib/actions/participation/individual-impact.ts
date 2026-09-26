import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  computeButtsCount,
} from "@/lib/impact/impact-terrain-2026";
import type { ActionMegotsCondition } from "@/lib/actions/types";

export const WASTE_MOISTURE_NORMALIZATION_VERSION =
  "impact-terrain-2026-waste-moisture-v1" as const;

const WASTE_MOISTURE_CONDITIONS = ["sec", "humide", "mouille"] as const;
type WasteMoistureCondition = (typeof WASTE_MOISTURE_CONDITIONS)[number];
type IndividualButtsProvenance = "counted" | "measured" | "derived";

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
  measuredBy?: string | null;
  measuredAt?: string | null;
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
  individual_impact_measured_by?: string | null;
  individual_impact_measured_at?: string | null;
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

export function buildStoredIndividualImpactMeasurement(
  input: IndividualImpactMeasurementInput,
): StoredIndividualImpactMeasurement {
  const wasteKg = finiteNonNegative(input.wasteKg);
  const wasteCondition = normalizeWasteCondition(input.wasteCondition);
  const cigaretteButtsCount = normalizeNullableInteger(input.cigaretteButtsCount);
  const cigaretteButtsMassKg = finiteNonNegative(input.cigaretteButtsMassKg);
  const cigaretteButtsCondition = normalizeButtsCondition(input.cigaretteButtsCondition);
  const hasButts = cigaretteButtsCount !== null || cigaretteButtsMassKg !== null;

  return {
    wasteKg,
    wasteCondition: wasteKg === null ? null : wasteCondition,
    wasteMeasurementMethod: wasteKg === null ? null : input.wasteMeasurementMethod?.trim() || null,
    wasteNormalizationVersion: wasteKg === null ? null : WASTE_MOISTURE_NORMALIZATION_VERSION,
    cigaretteButtsCount,
    cigaretteButtsMassKg,
    cigaretteButtsCondition: hasButts ? cigaretteButtsCondition : null,
    cigaretteButtsProvenance:
      cigaretteButtsCount !== null
        ? "counted"
        : cigaretteButtsMassKg !== null
          ? "measured"
          : null,
    cigaretteButtsConversionVersion:
      cigaretteButtsCount === null && cigaretteButtsMassKg !== null
        ? CIGARETTE_BUTTS_MASS_CONVERSION_VERSION
        : null,
    measuredBy: input.measuredBy?.trim() || null,
    measuredAt: input.measuredAt ?? null,
  };
}

export function toIndividualImpactMeasurement(
  row: IndividualImpactRow | null | undefined,
): IndividualImpactMeasurement | null {
  if (!row) return null;
  const stored = buildStoredIndividualImpactMeasurement({
    wasteKg: finiteNonNegative(row.individual_waste_kg),
    wasteCondition: normalizeWasteCondition(row.individual_waste_condition),
    wasteMeasurementMethod: row.individual_waste_measurement_method,
    cigaretteButtsCount: normalizeNullableInteger(row.individual_cigarette_butts_count),
    cigaretteButtsMassKg: finiteNonNegative(row.individual_cigarette_butts_mass_kg),
    cigaretteButtsCondition: normalizeButtsCondition(row.individual_cigarette_butts_condition),
    measuredBy: row.individual_impact_measured_by,
    measuredAt: row.individual_impact_measured_at,
  });
  const hasMeasurement = stored.wasteKg !== null || stored.cigaretteButtsCount !== null || stored.cigaretteButtsMassKg !== null;
  if (!hasMeasurement) return null;

  const equivalentSecKg =
    stored.wasteKg !== null && stored.wasteCondition !== null
      ? stored.wasteKg * wasteFactor(stored.wasteCondition)
      : null;
  const comparableButtsCount =
    stored.cigaretteButtsCount ??
    (stored.cigaretteButtsMassKg !== null && stored.cigaretteButtsCondition !== null
      ? computeButtsCount(stored.cigaretteButtsMassKg, stored.cigaretteButtsCondition)
      : null);

  return {
    ...stored,
    equivalentSecKg,
    comparableButtsCount,
    comparableButtsProvenance:
      stored.cigaretteButtsCount !== null
        ? "counted"
        : comparableButtsCount !== null
          ? "derived"
          : null,
  };
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
  "individual_impact_measured_by",
  "individual_impact_measured_at",
] as const;

export const INDIVIDUAL_IMPACT_SELECT = INDIVIDUAL_IMPACT_COLUMN_LIST.join(", ");
export const REVIEW_SELECT = `id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source, ${INDIVIDUAL_IMPACT_SELECT}`;
