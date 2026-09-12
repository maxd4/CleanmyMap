import { describe, expect, it } from "vitest";
import type { ActionPreparationData } from "@/lib/actions/types";
import {
  buildCalibrationDataset,
  buildRouteCalibrationContext,
  estimateRouteCleanupDuration,
  preserveHistoricalRouteCalibrationContext,
  type RouteCalibrationContext,
} from "./route-calibration";

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

describe("route calibration infrastructure", () => {
  it("serializes the versioned context without aggregating target pressures", () => {
    const original = context();
    const serialized = JSON.parse(JSON.stringify(original));

    expect(serialized).toEqual(original);
    expect(serialized.version).toBe("action-route-calibration-v1");
    expect(serialized.candidates[0].cleanupWorkload.ordinaryWaste.observedPresence).toBe(true);
    expect(serialized.candidates[0].cleanupWorkload.cigaretteButts.observedPresence).toBe(false);
  });

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
    ]);

    expect(dataset.samples[0]?.historicalWorkload[0]?.cleanupWorkload).toEqual(workload);
    expect(dataset.samples[0]?.historicalWorkload[0]?.cleanupWorkload.status).toBe("presence_only");
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
      "ordinary_waste_has_no_variation",
      "workload_has_no_diversity",
      "workload_and_volunteers_are_not_dissociable",
      "historical_runtime_bridge_missing",
      "independent_validation_unavailable",
    ]);
  });

  it("fails closed when no calibrated artifact is active", () => {
    const estimate = estimateRouteCleanupDuration({ context: context() });

    expect(estimate.minutes).toBeNull();
    expect(estimate.uncertaintyMinutes).toBeNull();
    expect(estimate.calibrationStatus).toBe("data_insufficient");
    expect(estimate.provenance.artifactVersion).toBeNull();
  });
});

function historicalPreparation(routeCalibrationContext: RouteCalibrationContext): ActionPreparationData {
  return { actionTitle: "Ancien titre", routeCalibrationContext };
}
