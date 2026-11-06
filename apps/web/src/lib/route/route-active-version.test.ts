import { describe, expect, it } from "vitest";
import { buildRoutePlannerSnapshot } from "./route-calibration";
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation, isOperationalRoute } from "./route-operational";
import {
  buildActionRouteVersionCalculation,
  buildActionRouteVersioning,
} from "./route-active-version";
import { initializeActionRouteVersioning } from "@/lib/actions/route-version-persistence";
import { buildRoutePollutionPotential } from "./route-pollution-potential";
import { evaluateRoutePollutionRelevance } from "./route-pollution-relevance";
import { isRoutePlannerSnapshot } from "./route-planner-snapshot-validation";

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
    const pollutionRelevance = evaluateRoutePollutionRelevance(pollutionPotential);
    const snapshot = buildRoutePlannerSnapshot({
      ...createRoutePlannerSnapshotInput(2),
      pollutionPotential,
      pollutionRelevance,
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
      pollutionRelevance,
    });
    expect(operationalRoute.plannerRiskContext?.projectionVersionId).toBe("projection-1");
    expect(operationalRoute.pollutionPotential?.status).toBe("unavailable");
    expect(operationalRoute.pollutionRelevance?.policyVersion).toBe("route-pollution-relevance-v1");
    expect(snapshot.pollutionPotential?.schemaVersion).toBe("route-pollution-potential-v1");
    expect(snapshot.pollutionRelevance?.warning).toBe("unavailable");
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

  it("rejects an out-of-domain potential in both snapshot and operational consumers", () => {
    const pollutionPotential = buildRoutePollutionPotential({
      projection: null,
      candidates: [],
      groups: [],
      pickupPreference: "balanced",
      routeTopology: "loop",
      travelBudgetMinutes: 60,
      referenceCatalog: null,
    });
    const invalidPotential = {
      ...pollutionPotential,
      global: { ...pollutionPotential.global, value: 101 },
    };
    const snapshot = buildRoutePlannerSnapshot({
      ...createRoutePlannerSnapshotInput(2),
      pollutionPotential: invalidPotential,
    });
    const operationalRoute = createOperationalRouteFromRecommendation({
      generatedAt: snapshot.generatedAt,
      groupCount: snapshot.parameters.groupCount,
      routeGeometry: snapshot.geometry,
      stops: snapshot.selectedStops,
      groupRoutes: [],
      pollutionPotential: invalidPotential,
    });

    expect(isRoutePlannerSnapshot(snapshot)).toBe(false);
    expect(isOperationalRoute(operationalRoute)).toBe(false);
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
