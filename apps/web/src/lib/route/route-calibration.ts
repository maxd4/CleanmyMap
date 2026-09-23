import {
  normalizeActionPreparationData,
} from "./route-operational";
import {
  normalizeVolunteerParticipation,
  resolveEffectiveVolunteerUnits,
} from "@/lib/actions/volunteer-participation";
import {
  finiteNonNegativeNullable,
  hasRepeatedKeyWithDifferentValue,
  isPlausibleDuration,
  resolveCigaretteButtsProvenance,
  resolveMissingDatasetFields,
  resolveNullableParticipantsCount,
  resolveOperationalRouteDistanceKm,
  resolveWasteProvenance,
  coverage,
} from "./route-calibration-helpers";
import {
  isRouteCalibrationContext,
  isServerVerifiedPlannerSnapshotContext,
} from "./route-calibration-validation";
import type {
  ApprovedActionForCalibration,
  RouteCalibrationDataset,
  RouteCalibrationDatasetEntry,
  RouteCalibrationReadiness,
  RouteCalibrationReadinessReason,
  RouteCalibrationSample,
} from "./route-calibration-types";

export {
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_CALIBRATION_STATUSES,
  ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
  ROUTE_PLANNER_SNAPSHOT_VERSION,
} from "./route-calibration-contract";
export type {
  RouteCalibrationStatus,
} from "./route-calibration-contract";
export {
  isRouteCalibrationContext,
  isServerVerifiedPlannerSnapshotContext,
} from "./route-calibration-validation";
export {
  buildRouteCalibrationContext,
  buildRoutePlannerSnapshot,
  buildVerifiedRouteCalibrationContext,
} from "./route-calibration-context";
export { estimateRouteCleanupDuration } from "./route-calibration-duration";
export { preserveHistoricalRouteCalibrationContext } from "./route-calibration-history";
export type {
  ApprovedActionForCalibration,
  RouteCalibrationContext,
  RouteCalibrationContractVersions,
  RouteCalibrationCigaretteButts,
  RouteCalibrationDataset,
  RouteCalibrationDatasetEntry,
  RouteCalibrationDuration,
  RouteCalibrationMeasurementProvenance,
  RouteCalibrationOrdinaryWaste,
  RouteCalibrationQuality,
  RouteCalibrationReadiness,
  RouteCalibrationReadinessReason,
  RouteCalibrationSample,
  RouteCalibrationVolunteerData,
  RoutePlannerSnapshot,
  RouteCleanupDurationEstimate,
} from "./route-calibration-types";

export function buildCalibrationDataset(
  actions: readonly ApprovedActionForCalibration[],
  options: {
    independentValidationAvailable?: boolean;
    requireVerifiedPlannerProvenance?: boolean;
  } = {},
): RouteCalibrationDataset {
  const entries = actions.map((action) =>
    buildCalibrationDatasetEntry(action, options),
  );
  const samples = entries.flatMap((entry) => (entry.status === "included" ? [entry.sample] : []));
  return {
    entries,
    samples,
    exclusions: entries.flatMap((entry) => (entry.status === "excluded" ? [entry] : [])),
    readiness: assessRouteCalibrationReadiness({
      samples,
      runtimeHistoricalBridgeAvailable: samples.length > 0,
      independentValidationAvailable: options.independentValidationAvailable,
    }),
  };
}

function buildCalibrationDatasetEntry(
  action: ApprovedActionForCalibration,
  options: { requireVerifiedPlannerProvenance?: boolean },
): RouteCalibrationDatasetEntry {
  if (action.status !== "approved") {
    return { status: "excluded", actionId: action.id, reason: "not_approved" };
  }

  const context = action.preparationData?.routeCalibrationContext;
  if (!context) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "missing_historical_context",
    };
  }
  if (!isRouteCalibrationContext(context)) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "invalid_historical_context",
    };
  }
  const requireVerifiedPlannerProvenance =
    options.requireVerifiedPlannerProvenance ?? true;
  if (
    requireVerifiedPlannerProvenance &&
    !isServerVerifiedPlannerSnapshotContext(context)
  ) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "unverified_historical_context",
    };
  }

  const plannerSnapshot = context.plannerSnapshot
    ? structuredClone(context.plannerSnapshot)
    : null;
  const preparationData = action.preparationData
    ? normalizeActionPreparationData(action.preparationData)
    : null;
  const operationalRoute = preparationData?.operationalRoute
    ? structuredClone(preparationData.operationalRoute)
    : null;
  const volunteerInput = action.volunteerParticipation ??
    preparationData?.volunteerParticipation ??
    null;
  const normalizedVolunteers = volunteerInput
    ? normalizeVolunteerParticipation(volunteerInput)
    : null;
  const volunteerData = normalizedVolunteers ?? {
    childrenCount: null,
    adultCount: null,
    retiredCount: null,
    participantsCount: null,
    effectiveVolunteerUnits: null,
    effectiveVolunteerUnitsFormulaVersion: null,
  };
  const participantsCount = resolveNullableParticipantsCount(
    normalizedVolunteers,
    action.volunteersCount,
  );
  const effectiveVolunteerUnits = resolveEffectiveVolunteerUnits(normalizedVolunteers);
  const ordinaryWasteProvenance = resolveWasteProvenance(
    action.wasteKg,
    action.wasteMeasurementMethod,
  );
  const cigaretteButtsMeasurements = action.cigaretteButtsMeasurements
    ? structuredClone(action.cigaretteButtsMeasurements)
    : null;
  const cigaretteButtsProvenance = cigaretteButtsMeasurements
    ? resolveCigaretteButtsProvenance(cigaretteButtsMeasurements)
    : action.cigaretteButts === null
      ? "missing"
      : "unknown";
  const durationMinutes = isPlausibleDuration(action.durationMinutes)
    ? action.durationMinutes
    : null;
  const missing = resolveMissingDatasetFields({
    action,
    participantsCount,
    cigaretteButtsMeasurements,
    plannerSnapshot,
    operationalRoute,
  });

  return {
    status: "included",
    sample: {
      actionId: action.id,
      historicalWorkload: context.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        family: candidate.family,
        cleanupWorkload: structuredClone(candidate.cleanupWorkload),
      })),
      volunteersPresent: participantsCount,
      durationMinutes,
      wasteKg: finiteNonNegativeNullable(action.wasteKg) ? action.wasteKg : null,
      cigaretteButts: finiteNonNegativeNullable(action.cigaretteButts)
        ? action.cigaretteButts
        : cigaretteButtsMeasurements?.cigaretteButtsCount ?? null,
      actionDate: action.actionDate,
      locationLabel: action.locationLabel,
      plannerSnapshot,
      operationalRoute,
      placeType: action.placeType ?? preparationData?.placeType ?? null,
      distance: {
        plannerRecommendedKm: finiteNonNegativeNullable(plannerSnapshot?.distance.totalKm)
          ? plannerSnapshot.distance.totalKm
          : null,
        operationalRouteKm: resolveOperationalRouteDistanceKm(operationalRoute),
      },
      duration: {
        totalMinutes: durationMinutes,
        definition: "walking_plus_collection_sorting_weighing",
        source: durationMinutes === null ? "missing" : "action.duration_minutes",
        components: {
          walkingMinutes: null,
          collectionMinutes: null,
          sortingMinutes: null,
          weighingMinutes: null,
        },
      },
      ordinaryWaste: {
        wasteKg: finiteNonNegativeNullable(action.wasteKg) ? action.wasteKg : null,
        measurementMethod: action.wasteMeasurementMethod ?? null,
        provenance: ordinaryWasteProvenance,
        breakdown: action.wasteBreakdown ? structuredClone(action.wasteBreakdown) : null,
      },
      cigaretteButtsMeasurement: {
        measurements: cigaretteButtsMeasurements,
        legacyCount: cigaretteButtsMeasurements ? null : action.cigaretteButts,
        provenance: cigaretteButtsProvenance,
      },
      volunteers: volunteerData,
      participantsCount,
      effectiveVolunteerUnits,
      contractVersions: {
        routeCalibration: context.version,
        plannerSnapshot: plannerSnapshot?.version ?? null,
        operationalRoute: operationalRoute?.version ?? null,
        cleanupWorkload: context.cleanupWorkloadVersion,
        effectiveVolunteerUnits:
          volunteerData.effectiveVolunteerUnitsFormulaVersion,
        cigaretteButtsConversion:
          cigaretteButtsMeasurements?.cigaretteButtsConversionFormulaVersion ?? null,
        dataQuality: action.dataQuality?.version ?? null,
      },
      quality: {
        status: missing.length === 0
          ? "complete"
          : (finiteNonNegativeNullable(action.wasteKg) ||
              finiteNonNegativeNullable(action.cigaretteButts) ||
              cigaretteButtsMeasurements?.cigaretteButtsCount != null)
            ? "partial"
            : "insufficient",
        ordinaryWasteAvailable: finiteNonNegativeNullable(action.wasteKg),
        cigaretteButtsAvailable:
          finiteNonNegativeNullable(action.cigaretteButts) ||
          cigaretteButtsMeasurements?.cigaretteButtsCount != null,
        missing,
        dataQuality: action.dataQuality ? structuredClone(action.dataQuality) : null,
      },
    },
  };
}

export function assessRouteCalibrationReadiness(input: {
  samples: readonly RouteCalibrationSample[];
  runtimeHistoricalBridgeAvailable?: boolean;
  independentValidationAvailable?: boolean;
}): RouteCalibrationReadiness {
  const sampleCount = input.samples.length;
  const wasteSamples = input.samples.filter((sample) => sample.wasteKg !== null);
  const buttsSamples = input.samples.filter((sample) => sample.cigaretteButts !== null);
  const plannerSnapshotSamples = input.samples.filter(
    (sample) => sample.plannerSnapshot !== null,
  );
  const workloadSignatures = new Set(
    input.samples.map((sample) => JSON.stringify(sample.historicalWorkload)),
  );
  const wasteValues = new Set(wasteSamples.map((sample) => sample.wasteKg));
  const buttsValues = new Set(buttsSamples.map((sample) => sample.cigaretteButts));
  const volunteerValues = new Set(
    input.samples
      .map((sample) => sample.volunteersPresent)
      .filter((value): value is number => value !== null),
  );
  const placeTypes = new Set(
    input.samples
      .map((sample) => sample.placeType)
      .filter((value): value is string => Boolean(value)),
  );
  const volunteerCompositions = new Set(
    input.samples
      .map((sample) => JSON.stringify({
        childrenCount: sample.volunteers.childrenCount,
        adultCount: sample.volunteers.adultCount,
        retiredCount: sample.volunteers.retiredCount,
      }))
      .filter((value) => value !== JSON.stringify({
        childrenCount: null,
        adultCount: null,
        retiredCount: null,
      })),
  );
  const repeatedWorkloadWithDifferentVolunteers = hasRepeatedKeyWithDifferentValue(
    input.samples,
    (sample) => JSON.stringify(sample.historicalWorkload),
    (sample) => String(sample.volunteersPresent),
  );
  const repeatedVolunteersWithDifferentWorkload = hasRepeatedKeyWithDifferentValue(
    input.samples,
    (sample) => String(sample.volunteersPresent),
    (sample) => JSON.stringify(sample.historicalWorkload),
  );
  const reasons: RouteCalibrationReadinessReason[] = [];

  if (sampleCount === 0) reasons.push("no_samples");
  if (wasteSamples.length === 0) {
    reasons.push("ordinary_waste_has_no_coverage");
  } else if (wasteValues.size < 2) {
    reasons.push("ordinary_waste_has_no_variation");
  }
  if (buttsSamples.length === 0) {
    reasons.push("cigarette_butts_has_no_coverage");
  } else if (buttsValues.size < 2) {
    reasons.push("cigarette_butts_has_no_variation");
  }
  if (placeTypes.size < 2) reasons.push("place_type_has_no_diversity");
  if (volunteerCompositions.size < 2) {
    reasons.push("volunteer_composition_has_no_diversity");
  }
  if (workloadSignatures.size < 2) reasons.push("workload_has_no_diversity");
  if (
    !repeatedWorkloadWithDifferentVolunteers ||
    !repeatedVolunteersWithDifferentWorkload ||
    volunteerValues.size < 2
  ) {
    reasons.push("workload_and_volunteers_are_not_dissociable");
  }
  if (!input.runtimeHistoricalBridgeAvailable) {
    reasons.push("historical_runtime_bridge_missing");
  }
  if (plannerSnapshotSamples.length < sampleCount) {
    reasons.push("planner_snapshot_coverage_insufficient");
  }
  if (!input.independentValidationAvailable) {
    reasons.push("independent_validation_unavailable");
  }

  return {
    calibrationStatus: reasons.length === 0 ? "ready" : "data_insufficient",
    reasons,
    sampleCount,
    axisCoverage: {
      ordinaryWaste: coverage(wasteSamples.length, sampleCount),
      cigaretteButts: coverage(buttsSamples.length, sampleCount),
    },
    diversity: {
      ordinaryWaste: wasteValues.size,
      cigaretteButts: buttsValues.size,
      placeTypes: placeTypes.size,
      volunteerCompositions: volunteerCompositions.size,
      historicalWorkloads: workloadSignatures.size,
    },
    plannerSnapshotCoverage: coverage(plannerSnapshotSamples.length, sampleCount),
  };
}
