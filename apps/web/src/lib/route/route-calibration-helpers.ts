import {
  ACTION_DATA_MEASURE_LIMITS,
} from "@/lib/actions/quality/data-quality-types";
import type {
  ActionCigaretteButtsMeasurements,
  CigaretteButtsProvenance,
} from "@/lib/waste/cigarette-butts";
import type { ActionWasteMeasurementMethod } from "@/lib/waste/measurement";
import type { ActionVolunteerParticipation } from "@/lib/actions/volunteer-participation";
import type { OperationalRoute } from "./route-operational";
import type {
  ApprovedActionForCalibration,
  RouteCalibrationMeasurementProvenance,
  RoutePlannerSnapshot,
} from "./route-calibration-types";

export function resolveNullableParticipantsCount(
  participation: ActionVolunteerParticipation | null,
  legacyVolunteersCount: number | null,
): number | null {
  if (participation?.participantsCount !== null && participation?.participantsCount !== undefined) {
    return finiteNonNegativeNullable(participation.participantsCount)
      ? Math.trunc(participation.participantsCount)
      : null;
  }
  return finiteNonNegativeNullable(legacyVolunteersCount)
    ? Math.trunc(legacyVolunteersCount)
    : null;
}

export function resolveWasteProvenance(
  wasteKg: number | null,
  method: ActionWasteMeasurementMethod | null | undefined,
): RouteCalibrationMeasurementProvenance {
  if (!finiteNonNegativeNullable(wasteKg)) return "missing";
  if (method === "estimation_visuelle") return "estimated";
  if (method === "balance_suspendue" || method === "balance_au_sol") {
    return "measured";
  }
  return "unknown";
}

export function resolveCigaretteButtsProvenance(
  measurements: ActionCigaretteButtsMeasurements,
): CigaretteButtsProvenance | "missing" {
  if (measurements.cigaretteButtsCount !== null) {
    return measurements.cigaretteButtsCountProvenance;
  }
  if (measurements.cigaretteButtsMassKg !== null) {
    return measurements.cigaretteButtsMassProvenance;
  }
  if (measurements.cigaretteButtsVolumeLiters !== null) {
    return measurements.cigaretteButtsVolumeProvenance;
  }
  return "missing";
}

export function resolveOperationalRouteDistanceKm(operationalRoute: OperationalRoute | null): number | null {
  if (!operationalRoute || operationalRoute.routes.length === 0) return null;
  const distances = operationalRoute.routes.map((route) => route.geometry.distanceKm);
  return distances.every((distance) => finiteNonNegativeNullable(distance))
    ? distances.reduce((total, distance) => total + distance, 0)
    : null;
}

export function resolveMissingDatasetFields(input: {
  action: ApprovedActionForCalibration;
  participantsCount: number | null;
  cigaretteButtsMeasurements: ActionCigaretteButtsMeasurements | null;
  plannerSnapshot: RoutePlannerSnapshot | null;
  operationalRoute: OperationalRoute | null;
}): string[] {
  const missing: string[] = [];
  if (!finiteNonNegativeNullable(input.action.wasteKg)) missing.push("ordinaryWaste.wasteKg");
  const cigaretteButtsAvailable =
    finiteNonNegativeNullable(input.action.cigaretteButts) ||
    input.cigaretteButtsMeasurements?.cigaretteButtsCount != null;
  if (!cigaretteButtsAvailable) missing.push("cigaretteButts.count");
  if (!isPlausibleDuration(input.action.durationMinutes)) missing.push("durationMinutes");
  if (input.participantsCount === null) missing.push("participantsCount");
  if (!input.plannerSnapshot) missing.push("plannerSnapshot");
  if (!input.operationalRoute) missing.push("operationalRoute");
  if (!input.action.placeType && !input.action.preparationData?.placeType) {
    missing.push("placeType");
  }
  return missing;
}

export function coverage(available: number, total: number): {
  available: number;
  total: number;
  rate: number | null;
} {
  return {
    available,
    total,
    rate: total === 0 ? null : available / total,
  };
}

export function isPlausibleDuration(value: number | null | undefined): value is number {
  return (
    finiteNonNegativeNullable(value) &&
    value <= ACTION_DATA_MEASURE_LIMITS.durationMinutesMax
  );
}

export function hasRepeatedKeyWithDifferentValue<T>(
  samples: readonly T[],
  key: (sample: T) => string,
  value: (sample: T) => number | string,
): boolean {
  const valuesByKey = new Map<string, Set<number | string>>();
  for (const sample of samples) {
    const values = valuesByKey.get(key(sample)) ?? new Set<number | string>();
    values.add(value(sample));
    valuesByKey.set(key(sample), values);
  }
  return [...valuesByKey.values()].some((values) => values.size > 1);
}

export function finiteNonNegativeNullable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
