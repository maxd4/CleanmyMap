import { describe, expect, it } from "vitest";
import type { ActionPreparationData } from "@/lib/actions/types";
import {
  buildCalibrationDataset,
  buildRouteCalibrationContext,
  buildRoutePlannerSnapshot,
  buildVerifiedRouteCalibrationContext,
  estimateRouteCleanupDuration,
  isRouteCalibrationContext,
  isServerVerifiedPlannerSnapshotContext,
  preserveHistoricalRouteCalibrationContext,
  type RouteCalibrationContext,
} from "./route-calibration";
import { hashRoutePlannerSnapshot } from "./route-planner-snapshot-hash";

const workload = {
  modelVersion: "route-cleanup-workload-v1" as const,
  candidateId: "spot-1",
  family: "observed" as const,
  status: "presence_only" as const,
  ordinaryWaste: {
    relativePressure: null,
    observedPresence: true,
    confidence: null,
  },
  cigaretteButts: {
    relativePressure: null,
    observedPresence: false,
    confidence: null,
  },
  confidence: { ordinaryWaste: null, cigaretteButts: null },
  provenance: {
    source: "trash_spotter_spots" as const,
    evidenceFamily: "observed" as const,
    observedAt: "2026-09-01T10:00:00.000Z",
    zoneId: null,
    sourceModelVersion: null,
    snapshotId: null,
    sourceProvenance: [],
  },
  exclusionReason: null,
};

function context(overrides: Partial<RouteCalibrationContext> = {}): RouteCalibrationContext {
  return buildRouteCalibrationContext({
    generatedAt: "2026-09-01T09:00:00.000Z",
    routeEngineVersion: "route-planner-v2",
    volunteersExpected: 2,
    groupCount: 1,
    candidates: [{ candidateId: "spot-1", family: "observed", cleanupWorkload: workload }],
    ...overrides,
  });
}

describe("route calibration context and validation", () => {
  it("serializes the versioned context without aggregating target pressures", () => {
    const original = context();
    const serialized = JSON.parse(JSON.stringify(original));

    expect(serialized).toEqual(original);
    expect(serialized.version).toBe("action-route-calibration-v2");
    expect(serialized.candidates[0].cleanupWorkload.ordinaryWaste.observedPresence).toBe(true);
    expect(serialized.candidates[0].cleanupWorkload.cigaretteButts.observedPresence).toBe(false);
  });

  it("dispatches cleanup workload validation by its supported model version", () => {
    const unsupported = {
      ...context(),
      candidates: [{
        candidateId: "spot-1",
        family: "observed" as const,
        cleanupWorkload: {
          ...workload,
          modelVersion: "route-cleanup-workload-v2",
        },
      }],
    };

    expect(isRouteCalibrationContext(unsupported)).toBe(false);
  });

  it("keeps already persisted v1 contexts readable", () => {
    const legacy = {
      ...context(),
      version: "action-route-calibration-v1" as const,
    };

    expect(isRouteCalibrationContext(legacy)).toBe(true);
  });

  it("rejects malformed snapshots without changing the public boolean contract", () => {
    const validContext = context({
      plannerSnapshot: buildRoutePlannerSnapshot({
        generatedAt: "2026-09-01T09:00:00.000Z",
        engineVersion: "route-planner-v2",
        selectedCandidates: [],
        selectedStops: [],
        origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
        planningMode: { type: "free" },
        travelBudgetMinutes: 60,
        maxStops: 3,
        priorityVsTravel: 65,
        pickupPreference: "balanced",
        effectiveRiskFocus: "all",
        volunteers: 3,
        groupCount: 1,
        routeGeometry: {
          isLoop: true,
          origin: [48.85, 2.35],
          returnLeg: null,
          coordinates: [],
          distanceKm: 0,
          durationMinutes: 0,
          legs: [],
          provider: "none",
          profile: null,
          mode: "fallback",
          estimated: true,
        },
        travelDistanceKm: 0,
        travelMinutes: 0,
        returnDistanceKm: 0,
        returnMinutes: 0,
        groups: [],
        dataStatus: "empty",
        dataLayers: { observed: "empty", prediction: "unavailable", recommendation: "empty" },
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["spots"],
          warnings: [],
        },
        prediction: null,
      }),
    });
    const snapshot = validContext.plannerSnapshot!;
    const invalidContexts: unknown[] = [
      { ...validContext, plannerSnapshot: null },
      {
        ...validContext,
        plannerSnapshot: { ...snapshot, version: "route-planner-snapshot-unknown" },
      },
      {
        ...validContext,
        plannerSnapshot: {
          ...snapshot,
          parameters: { ...snapshot.parameters, maxStops: 0 },
        },
      },
      {
        ...validContext,
        plannerSnapshot: {
          ...snapshot,
          version: "route-planner-snapshot-unknown",
          distance: { ...snapshot.distance, totalKm: -1 },
        },
      },
    ];

    for (const invalidContext of invalidContexts) {
      expect(isRouteCalibrationContext(invalidContext)).toBe(false);
    }
  });

  it("requires verified v3 provenance by default and keeps an explicit diagnostic opt-out", () => {
    const plannerSnapshot = buildRoutePlannerSnapshot({
      generatedAt: "2026-09-01T09:00:00.000Z",
      engineVersion: "route-planner-v2",
      selectedCandidates: [],
      selectedStops: [],
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      planningMode: { type: "free" },
      travelBudgetMinutes: 60,
      maxStops: 3,
      priorityVsTravel: 65,
      pickupPreference: "balanced",
      effectiveRiskFocus: "all",
      volunteers: 3,
      groupCount: 1,
      routeGeometry: routeGeometry(1.5),
      travelDistanceKm: 1.5,
      travelMinutes: 20,
      returnDistanceKm: 0,
      returnMinutes: 0,
      groups: [{
        groupIndex: 1,
        volunteerCount: 3,
        candidateIds: [],
        reservedCandidateIds: [],
        targetCount: 0,
        travelDistanceKm: 1.5,
        travelMinutes: 20,
        travelBudgetMinutes: 60,
        withinBudget: true,
        routeGeometry: routeGeometry(1.5),
        operationalBudget: null,
      }],
      dataStatus: "empty",
      dataLayers: { observed: "empty", prediction: "unavailable", recommendation: "empty" },
      sourceHealth: { partial: false, failedSources: [], availableSources: ["spots"], warnings: [] },
      prediction: null,
    });
    const legacy = context({ candidates: [], volunteersExpected: 3, plannerSnapshot });
    const verified = buildVerifiedRouteCalibrationContext({
      generatedAt: plannerSnapshot.generatedAt,
      routeEngineVersion: plannerSnapshot.engineVersion,
      volunteersExpected: 3,
      groupCount: 1,
      candidates: [],
      plannerSnapshot,
      plannerSnapshotIntegrity: {
        status: "server_verified",
        proofVersion: "route-planner-proof-v1",
        snapshotHash: hashRoutePlannerSnapshot(plannerSnapshot),
        verifiedAt: plannerSnapshot.generatedAt,
      },
    });
    expect(isRouteCalibrationContext(legacy)).toBe(true);
    expect(isRouteCalibrationContext({ ...legacy, version: "action-route-calibration-v1" })).toBe(true);
    expect(isRouteCalibrationContext(verified)).toBe(true);

    const entries = buildCalibrationDataset([
      {
        id: "legacy",
        status: "approved",
        actionDate: "2026-09-05",
        locationLabel: "Paris",
        wasteKg: 2,
        cigaretteButts: 5,
        volunteersCount: 3,
        durationMinutes: 90,
        preparationData: { routeCalibrationContext: legacy },
      },
      {
        id: "verified",
        status: "approved",
        actionDate: "2026-09-05",
        locationLabel: "Paris",
        wasteKg: 2,
        cigaretteButts: 5,
        volunteersCount: 3,
        durationMinutes: 90,
        preparationData: { routeCalibrationContext: verified },
      },
    ]).entries;
    expect(entries.map((entry) => entry.status === "excluded" ? entry.reason : entry.status)).toEqual([
      "unverified_historical_context",
      "included",
    ]);
    const diagnosticEntries = buildCalibrationDataset([
      {
        id: "legacy-diagnostic",
        status: "approved",
        actionDate: "2026-09-05",
        locationLabel: "Paris",
        wasteKg: 2,
        cigaretteButts: 5,
        volunteersCount: 3,
        durationMinutes: 90,
        preparationData: { routeCalibrationContext: legacy },
      },
    ], { requireVerifiedPlannerProvenance: false }).entries;
    expect(diagnosticEntries[0]?.status).toBe("included");

    const tampered = {
      ...verified,
      plannerSnapshot: {
        ...verified.plannerSnapshot!,
        distance: { ...verified.plannerSnapshot!.distance, totalKm: 1 },
      },
    };
    expect(isRouteCalibrationContext(tampered)).toBe(true);
    expect(isServerVerifiedPlannerSnapshotContext(tampered)).toBe(false);
    expect(buildCalibrationDataset([{
      id: "tampered",
      status: "approved",
      actionDate: "2026-09-05",
      locationLabel: "Paris",
      wasteKg: 2,
      cigaretteButts: 5,
      volunteersCount: 3,
      durationMinutes: 90,
      preparationData: { routeCalibrationContext: tampered },
    }]).exclusions[0]).toMatchObject({
      reason: "unverified_historical_context",
    });
    expect(() => preserveHistoricalRouteCalibrationContext(
      { routeCalibrationContext: verified },
      { routeCalibrationContext: {
        ...verified,
        plannerSnapshotIntegrity: {
          ...verified.plannerSnapshotIntegrity!,
          snapshotHash: "b".repeat(64),
        },
      } },
    )).toThrow("ne peut pas être réécrit");
  });
});

describe("route calibration dataset and measurements", () => {
  it("keeps historical provenance and presence-only observations as-is", () => {
    const historical = context();
    const dataset = buildCalibrationDataset([
      {
        id: "action-1",
        status: "approved",
        actionDate: "2026-09-02",
        locationLabel: "Paris",
        wasteKg: 1.5,
        cigaretteButts: 3,
        volunteersCount: 2,
        durationMinutes: 45,
        preparationData: { routeCalibrationContext: historical },
      },
    ], { requireVerifiedPlannerProvenance: false });

    expect(dataset.samples[0]?.historicalWorkload[0]?.cleanupWorkload).toEqual(workload);
    expect(dataset.samples[0]?.historicalWorkload[0]?.cleanupWorkload.status).toBe("presence_only");
  });

  it("keeps an action usable per axis when ordinary waste is missing", () => {
    const dataset = buildCalibrationDataset([
      {
        id: "partial-action",
        status: "approved",
        actionDate: "2026-09-03",
        locationLabel: "Lyon",
        wasteKg: null,
        cigaretteButts: null,
        volunteersCount: null,
        durationMinutes: 75,
        placeType: "quai",
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 12,
          cigaretteButtsMassKg: null,
          cigaretteButtsVolumeLiters: null,
          cigaretteButtsCondition: "propre",
          cigaretteButtsCountProvenance: "counted",
          cigaretteButtsMassProvenance: "unknown",
          cigaretteButtsVolumeProvenance: "unknown",
          cigaretteButtsConversionFormulaVersion: null,
        },
        volunteerParticipation: {
          childrenCount: 2,
          adultCount: 4,
          retiredCount: 2,
          participantsCount: null,
          effectiveVolunteerUnits: null,
          effectiveVolunteerUnitsFormulaVersion: null,
        },
        preparationData: { routeCalibrationContext: context() },
      },
    ], { requireVerifiedPlannerProvenance: false });

    const sample = dataset.samples[0];
    expect(sample).toBeDefined();
    expect(sample?.wasteKg).toBeNull();
    expect(sample?.cigaretteButts).toBe(12);
    expect(sample?.ordinaryWaste.provenance).toBe("missing");
    expect(sample?.cigaretteButtsMeasurement.provenance).toBe("counted");
    expect(sample?.volunteers).toMatchObject({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
      participantsCount: 8,
      effectiveVolunteerUnits: 6,
      effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
    });
    expect(sample?.quality.status).toBe("partial");
    expect(dataset.readiness.axisCoverage).toEqual({
      ordinaryWaste: { available: 0, total: 1, rate: 0 },
      cigaretteButts: { available: 1, total: 1, rate: 1 },
    });
  });

  it("keeps explicitly measured zero distinct from missing data", () => {
    const dataset = buildCalibrationDataset([
      {
        id: "zero-action",
        status: "approved",
        actionDate: "2026-09-04",
        locationLabel: "Marseille",
        wasteKg: 0,
        cigaretteButts: 0,
        volunteersCount: 1,
        durationMinutes: 30,
        wasteMeasurementMethod: "balance_au_sol",
        preparationData: { routeCalibrationContext: context() },
      },
    ], { requireVerifiedPlannerProvenance: false });

    expect(dataset.samples[0]?.wasteKg).toBe(0);
    expect(dataset.samples[0]?.cigaretteButts).toBe(0);
    expect(dataset.samples[0]?.quality.ordinaryWasteAvailable).toBe(true);
    expect(dataset.samples[0]?.quality.cigaretteButtsAvailable).toBe(true);
  });

  it("keeps volunteer effects observable without imposing a returns law", () => {
    const dataset = buildCalibrationDataset([
      {
        id: "volunteers-balanced",
        status: "approved",
        actionDate: "2026-09-06",
        locationLabel: "Paris",
        wasteKg: 4,
        cigaretteButts: 20,
        volunteersCount: null,
        durationMinutes: 60,
        preparationData: {
          routeCalibrationContext: context(),
          volunteerParticipation: {
            childrenCount: 2,
            adultCount: 4,
            retiredCount: 2,
            participantsCount: null,
            effectiveVolunteerUnits: null,
            effectiveVolunteerUnitsFormulaVersion: null,
          },
        },
      },
      {
        id: "volunteers-adults",
        status: "approved",
        actionDate: "2026-09-07",
        locationLabel: "Paris",
        wasteKg: 4,
        cigaretteButts: 20,
        volunteersCount: null,
        durationMinutes: 60,
        preparationData: {
          routeCalibrationContext: context(),
          volunteerParticipation: {
            childrenCount: 0,
            adultCount: 8,
            retiredCount: 0,
            participantsCount: null,
            effectiveVolunteerUnits: null,
            effectiveVolunteerUnitsFormulaVersion: null,
          },
        },
      },
    ], { requireVerifiedPlannerProvenance: false });

    expect(dataset.samples.map((sample) => sample.participantsCount)).toEqual([8, 8]);
    expect(dataset.samples.map((sample) => sample.effectiveVolunteerUnits)).toEqual([6, 8]);
    expect(dataset.samples.map((sample) => sample.wasteKg)).toEqual([4, 4]);
    expect(dataset.samples.map((sample) => sample.cigaretteButts)).toEqual([20, 20]);
  });

  it("does not expose negative or aberrant durations as precise observations", () => {
    const dataset = buildCalibrationDataset([
      {
        id: "negative-duration",
        status: "approved",
        actionDate: "2026-09-08",
        locationLabel: "Paris",
        wasteKg: 1,
        cigaretteButts: 2,
        volunteersCount: 2,
        durationMinutes: -5,
        preparationData: { routeCalibrationContext: context() },
      },
      {
        id: "aberrant-duration",
        status: "approved",
        actionDate: "2026-09-09",
        locationLabel: "Paris",
        wasteKg: 1,
        cigaretteButts: 2,
        volunteersCount: 2,
        durationMinutes: 100_001,
        preparationData: { routeCalibrationContext: context() },
      },
    ], { requireVerifiedPlannerProvenance: false });

    expect(dataset.samples).toHaveLength(2);
    for (const sample of dataset.samples) {
      expect(sample.durationMinutes).toBeNull();
      expect(sample.duration.totalMinutes).toBeNull();
      expect(sample.duration.source).toBe("missing");
      expect(sample.quality.missing).toContain("durationMinutes");
    }
  });

  it("relates planner, operational route and contract provenance without rebuilding history", () => {
    const plannerSnapshot = buildRoutePlannerSnapshot({
      generatedAt: "2026-09-01T09:00:00.000Z",
      engineVersion: "route-planner-v2",
      selectedCandidates: [],
      selectedStops: [],
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      planningMode: { type: "free" },
      travelBudgetMinutes: 60,
      maxStops: 3,
      priorityVsTravel: 65,
      pickupPreference: "balanced",
      effectiveRiskFocus: "all",
      volunteers: 3,
      groupCount: 1,
      routeGeometry: routeGeometry(1.5),
      travelDistanceKm: 1.5,
      travelMinutes: 20,
      returnDistanceKm: 0,
      returnMinutes: 0,
      groups: [{
        groupIndex: 1,
        volunteerCount: 3,
        candidateIds: [],
        reservedCandidateIds: [],
        targetCount: 0,
        travelDistanceKm: 1.5,
        travelMinutes: 20,
        travelBudgetMinutes: 60,
        withinBudget: true,
        routeGeometry: routeGeometry(1.5),
        operationalBudget: null,
      }],
      dataStatus: "empty",
      dataLayers: { observed: "empty", prediction: "unavailable", recommendation: "empty" },
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["spots"],
        warnings: [],
      },
      prediction: null,
    });
    const legacyActualRoute: NonNullable<ActionPreparationData["actualRoute"]> = {
      version: "actual-route-v1",
      initializedAt: "2026-09-01T09:00:00.000Z",
      source: "planner",
      plannerGroupCount: 1,
      routes: [{
        routeId: "real-1",
        groupIndex: 1,
        geometry: routeGeometry(2.25),
        technicalStops: [],
      }],
      zones: {
        departure: { label: null, coordinate: [48.85, 2.35] },
        midpoint: { label: null, coordinate: [48.851, 2.351] },
        arrival: { label: null, coordinate: [48.85, 2.35] },
      },
    };
    const dataset = buildCalibrationDataset([{
      id: "traceable-action",
      status: "approved",
      actionDate: "2026-09-05",
      locationLabel: "Paris",
      wasteKg: 2,
      cigaretteButts: 5,
      volunteersCount: 3,
      durationMinutes: 90,
      placeType: "parc",
      preparationData: {
        routeCalibrationContext: context({
          plannerSnapshot,
          candidates: [],
          volunteersExpected: 3,
        }),
        actualRoute: legacyActualRoute,
      },
    }], { requireVerifiedPlannerProvenance: false });

    expect(dataset.samples[0]?.plannerSnapshot?.distance.totalKm).toBe(1.5);
    expect(dataset.samples[0]?.operationalRoute?.routes[0]?.geometry.distanceKm).toBe(2.25);
    expect(dataset.samples[0]?.distance).toEqual({
      plannerRecommendedKm: 1.5,
      operationalRouteKm: 2.25,
    });
    expect(dataset.samples[0]?.duration).toMatchObject({
      totalMinutes: 90,
      definition: "walking_plus_collection_sorting_weighing",
      source: "action.duration_minutes",
      components: {
        walkingMinutes: null,
        collectionMinutes: null,
        sortingMinutes: null,
        weighingMinutes: null,
      },
    });
    expect(dataset.samples[0]?.contractVersions).toMatchObject({
      routeCalibration: "action-route-calibration-v2",
      plannerSnapshot: "route-planner-snapshot-v1",
      operationalRoute: "operational-route-v1",
    });
  });

  it("excludes legacy actions instead of rebuilding their context from current state", () => {
    const dataset = buildCalibrationDataset([
      {
        id: "legacy-action",
        status: "approved",
        actionDate: "2026-08-01",
        locationLabel: "Paris",
        wasteKg: 10,
        cigaretteButts: 20,
        volunteersCount: 4,
        durationMinutes: 60,
        preparationData: { actionTitle: "Ancienne action" },
      },
    ]);

    expect(dataset.samples).toEqual([]);
    expect(dataset.exclusions).toEqual([
      { status: "excluded", actionId: "legacy-action", reason: "missing_historical_context" },
    ]);
  });
});

describe("route calibration preservation and readiness", () => {
  it("preserves a historical context through ordinary preparation edits", () => {
    const historical = context();
    const next = preserveHistoricalRouteCalibrationContext(historicalPreparation(historical), {
      actionTitle: "Titre édité",
    });

    expect(next.actionTitle).toBe("Titre édité");
    expect(next.routeCalibrationContext).toEqual(historical);
  });

  it("rejects an explicit historical context rewrite", () => {
    const historical = context();
    expect(() =>
      preserveHistoricalRouteCalibrationContext(historicalPreparation(historical), {
        routeCalibrationContext: context({ volunteersExpected: 9 }),
      }),
    ).toThrow("ne peut pas être réécrit");
  });

  it("returns data_insufficient for the current empty dataset without thresholds", () => {
    const dataset = buildCalibrationDataset([]);
    const readiness = dataset.readiness;

    expect(readiness.calibrationStatus).toBe("data_insufficient");
    expect(readiness.reasons).toEqual([
      "no_samples",
      "ordinary_waste_has_no_coverage",
      "cigarette_butts_has_no_coverage",
      "place_type_has_no_diversity",
      "volunteer_composition_has_no_diversity",
      "workload_has_no_diversity",
      "workload_and_volunteers_are_not_dissociable",
      "historical_runtime_bridge_missing",
      "independent_validation_unavailable",
    ]);
  });

  it("fails closed when no calibrated artifact is active", () => {
    const estimate = estimateRouteCleanupDuration({ context: context() });
    const repeatedEstimate = estimateRouteCleanupDuration({ context: context() });

    expect(estimate.minutes).toBeNull();
    expect(estimate.uncertaintyMinutes).toBeNull();
    expect(estimate.calibrationStatus).toBe("data_insufficient");
    expect(estimate.provenance.artifactVersion).toBeNull();
    expect(repeatedEstimate).toEqual(estimate);
  });
});

function historicalPreparation(routeCalibrationContext: RouteCalibrationContext): ActionPreparationData {
  return { actionTitle: "Ancien titre", routeCalibrationContext };
}

function routeGeometry(distanceKm: number) {
  return {
    isLoop: true,
    origin: [48.85, 2.35] as [number, number],
    returnLeg: null,
    coordinates: [[48.85, 2.35]] as [number, number][],
    distanceKm,
    durationMinutes: 20,
    legs: [],
    provider: "none" as const,
    profile: null,
    mode: "fallback" as const,
    estimated: true,
  };
}
