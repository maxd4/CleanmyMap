import { describe, expect, it } from "vitest";
import { buildRoutePlannerSnapshot } from "./route-calibration";
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation } from "./route-operational";
import {
  buildActionRouteVersionCalculation,
  buildActionRouteVersioning,
} from "./route-active-version";
import { initializeActionRouteVersioning } from "@/lib/actions/route-version-persistence";
import { buildRoutePollutionPotential } from "./route-pollution-potential";

describe("action route active version contract", () => {
  it("keeps audit metadata without copying the planner datasets", () => {
    const pollutionPotential = buildRoutePollutionPotential({
      projection: null,
      candidates: [],
      groups: [],
      pickupPreference: "balanced",
      routeTopology: "loop",
      travelBudgetMinutes: 60,
      referenceCatalog: null,
    });
    const snapshot = buildRoutePlannerSnapshot({
      ...createRoutePlannerSnapshotInput(2),
      pollutionPotential,
    });
    const operationalRoute = createOperationalRouteFromRecommendation({
      generatedAt: snapshot.generatedAt,
      groupCount: snapshot.parameters.groupCount,
      routeGeometry: snapshot.geometry,
      stops: snapshot.selectedStops,
      groupRoutes: [],
      plannerRiskContext: {
        schemaVersion: "route-planner-risk-context-v1",
        riskFocus: "all",
        source: "materialized_pedestrian_risk_projection",
        modelVersion: "paris-pressure-risk-v3-urban-morphology",
        projectionKey: "paris-pantheon-jardin-des-plantes",
        projectionVersionId: "projection-1",
        networkVersionId: "network-1",
        predictionStatus: "available",
        consideredSegments: 10,
        selectedSegments: 2,
        generatedAt: snapshot.generatedAt,
      },
      pollutionPotential,
    });
    expect(operationalRoute.plannerRiskContext?.projectionVersionId).toBe("projection-1");
    expect(operationalRoute.pollutionPotential?.status).toBe("unavailable");
    expect(snapshot.pollutionPotential?.schemaVersion).toBe("route-pollution-potential-v1");
    const versioning = buildActionRouteVersioning({
      snapshot,
      operationalRoute,
      appliedAt: snapshot.generatedAt,
      appliedByUserId: "user-1",
      snapshotHash: "a".repeat(64),
    });

    expect(versioning.schemaVersion).toBe("action-route-versioning-v1");
    expect(versioning.active).toMatchObject({
      appliedByUserId: "user-1",
      calculation: {
        snapshotHash: "a".repeat(64),
        parameters: snapshot.parameters,
        engineVersion: snapshot.engineVersion,
      },
    });
    expect(versioning.active.calculation).not.toHaveProperty("candidates");
    expect(versioning.history).toEqual([]);
  });

  it("derives comparison metrics from the canonical snapshot", () => {
    const snapshot = buildRoutePlannerSnapshot(createRoutePlannerSnapshotInput(2));
    const calculation = buildActionRouteVersionCalculation(snapshot);

    expect(calculation.metrics).toEqual({
      distanceKm: snapshot.distance.totalKm,
      walkingMinutes: snapshot.distance.travelMinutes,
      collectionMinutes: null,
      totalMinutes: null,
    });
    expect(calculation.stops).toEqual([]);
    expect(calculation.explanation).toBeNull();
  });

  it("initializes the active version at publication without replacing existing history", () => {
    const snapshot = buildRoutePlannerSnapshot(createRoutePlannerSnapshotInput());
    const operationalRoute = createOperationalRouteFromRecommendation({
      generatedAt: snapshot.generatedAt,
      groupCount: snapshot.parameters.groupCount,
      routeGeometry: snapshot.geometry,
      stops: snapshot.selectedStops,
      groupRoutes: [],
    });
    const preparationData = initializeActionRouteVersioning({
      preparationData: {
        routeCalibrationContext: {
          version: "action-route-calibration-v2",
          generatedAt: snapshot.generatedAt,
          routeEngineVersion: snapshot.engineVersion,
          cleanupWorkloadVersion: snapshot.cleanupWorkloadVersion,
          volunteersExpected: snapshot.parameters.volunteers,
          groupCount: snapshot.parameters.groupCount,
          candidates: [],
          plannerSnapshot: snapshot,
        },
        operationalRoute,
      },
      appliedAt: "2026-09-27T10:00:00.000Z",
      appliedByUserId: "owner-1",
    });

    expect(preparationData.routeVersioning?.active.appliedByUserId).toBe("owner-1");
    expect(initializeActionRouteVersioning({
      preparationData,
      appliedAt: "2026-09-27T11:00:00.000Z",
      appliedByUserId: "other-user",
    })).toBe(preparationData);
  });
});
