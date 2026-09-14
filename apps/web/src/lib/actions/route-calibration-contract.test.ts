import { describe, expect, it } from "vitest";
import { toContractCreatePayload } from "./contracts/contract-builders";
import { createActionSchema } from "@/lib/validation/action";
import {
  buildActionDataContract,
} from "./contracts/contract-model";
import {
  buildRouteCalibrationContext,
  buildRoutePlannerSnapshot,
  preserveHistoricalRouteCalibrationContext,
} from "@/lib/route/route-calibration";
import {
  createOperationalRouteFromRecommendation,
  removeOperationalRouteLoop,
  updateOperationalRouteZone,
} from "@/lib/route/route-operational";
import { buildActionInsertPayload, buildCreateActionGeometry } from "./store";

const routeContext = buildRouteCalibrationContext({
  generatedAt: "2026-09-01T09:00:00.000Z",
  routeEngineVersion: "route-planner-v2",
  volunteersExpected: 3,
  groupCount: 1,
  candidates: [],
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
    groups: [{
      groupIndex: 1,
      volunteerCount: 3,
      candidateIds: [],
      reservedCandidateIds: [],
      targetCount: 0,
      travelDistanceKm: 0,
      travelMinutes: 0,
      travelBudgetMinutes: 60,
      withinBudget: true,
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
  }),
});

const payload = {
  associationName: "Action spontanée",
  organizerType: "association" as const,
  actionDate: "2026-09-02",
  locationLabel: "Paris",
  wasteKg: 0,
  cigaretteButts: 0,
  volunteersCount: 3,
  durationMinutes: 60,
  routeCalibrationContext: routeContext,
  preparationData: {
    operationalRoute: createOperationalRouteFromRecommendation({
      generatedAt: "2026-09-01T09:00:00.000Z",
      groupCount: 1,
      routeGeometry: routeContext.plannerSnapshot!.geometry,
      stops: [],
      groupRoutes: [],
    }),
  },
};

describe("route calibration action handoff", () => {
  it("carries the exact route context into preparationData", () => {
    const contract = toContractCreatePayload(payload);

    expect(contract.metadata.preparationData?.routeCalibrationContext).toEqual(routeContext);
    expect(contract.metadata.preparationData?.operationalRoute?.version).toBe("operational-route-v1");
    expect(contract.metadata.preparationData).not.toHaveProperty("actualRoute");
  });

  it("validates the context at the action API boundary", () => {
    const contract = toContractCreatePayload(payload);
    const parsed = createActionSchema.safeParse(contract);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.preparationData?.routeCalibrationContext).toEqual(routeContext);
      expect(parsed.data.preparationData?.operationalRoute?.routes).toHaveLength(1);
      expect(parsed.data.preparationData).not.toHaveProperty("actualRoute");
    }
  });

  it("keeps the context on the legacy-compatible creation path", () => {
    const parsed = createActionSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.preparationData?.routeCalibrationContext).toEqual(routeContext);
    }
  });

  it("round trips the immutable snapshot through the API and action store payload", () => {
    const contract = toContractCreatePayload(payload);
    const parsed = createActionSchema.safeParse(contract);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const row = buildActionInsertPayload({
      userId: "user-test",
      payload: parsed.data,
      status: "pending",
      persistedGeometry: buildCreateActionGeometry(parsed.data, null),
      finalDrawing: null,
    });

    expect(row.preparation_data.routeCalibrationContext).toEqual(routeContext);
    expect(row.preparation_data).toHaveProperty("operationalRoute");
    expect(row.preparation_data).not.toHaveProperty("actualRoute");
    expect(row.preparation_data.routeCalibrationContext?.plannerSnapshot).toMatchObject({
      version: "route-planner-snapshot-v1",
      parameters: { travelBudgetMinutes: 60, maxStops: 3 },
    });

    const readContract = buildActionDataContract({
      id: "action-test-1",
      type: "action",
      status: "pending",
      source: "web_form",
      observedAt: "2026-09-02",
      locationLabel: "Paris",
      latitude: null,
      longitude: null,
      preparationData: row.preparation_data,
    });
    expect(readContract.metadata.preparationData).toEqual(row.preparation_data);
    expect(readContract.metadata.preparationData?.routeCalibrationContext).toEqual(
      routeContext,
    );
    expect(readContract.metadata.preparationData?.operationalRoute).toEqual(
      row.preparation_data.operationalRoute,
    );
    expect(readContract.metadata.preparationData).not.toHaveProperty("actualRoute");
  });

  it("allows the operational route to change without rewriting the planner snapshot", () => {
    const contract = toContractCreatePayload(payload);
    const parsed = createActionSchema.safeParse(contract);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const current = parsed.data.preparationData;
    const updatedOperationalRoute = current?.operationalRoute
      ? removeOperationalRouteLoop(
          updateOperationalRouteZone(current.operationalRoute, "midpoint", {
            label: "Mi-parcours ajusté",
          }),
          "planner-group-1",
        )
      : null;
    const next = preserveHistoricalRouteCalibrationContext(current, {
      operationalRoute: updatedOperationalRoute ?? undefined,
      routeCalibrationContext: routeContext,
    });

    expect(next.operationalRoute?.zones.midpoint.label).toBe("Mi-parcours ajusté");
    expect(next.operationalRoute?.routes).toEqual([]);
    expect(next.routeCalibrationContext).toEqual(current?.routeCalibrationContext);
    expect(next.routeCalibrationContext?.plannerSnapshot).toEqual(
      current?.routeCalibrationContext?.plannerSnapshot,
    );
  });

  it("carries final geometry provenance through the contract boundary", () => {
    const routedPayload = {
      ...payload,
      geometrySource: "routed" as const,
      manualDrawing: {
        kind: "polyline" as const,
        coordinates: [
          [48.85, 2.35] as [number, number],
          [48.851, 2.351] as [number, number],
        ],
      },
    };

    const contract = toContractCreatePayload(routedPayload);
    expect(contract.geometry?.geometrySource).toBe("routed");

    const parsed = createActionSchema.safeParse(contract);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.geometrySource).toBe("routed");
    }
  });
});
