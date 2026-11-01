import { describe, expect, it } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
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
import {
  buildActionInsertPayload,
  buildCreateActionGeometry,
} from "./store-create-contract";
import type { CreateActionPayload } from "./types";
import { createRoutePlannerSnapshotInput } from "@/lib/route/route-calibration-test-fixtures";
import { createDefaultRouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";

function buildGuidedActionFixture() {
  const planningMode = createDefaultRouteTerritorialGuidedMode(10, 2);
  const origin = { latitude: 48.8445, longitude: 2.3512, source: "map" as const };
  const groupDefinitions = [
    { label: "Panthéon", waypoint: { latitude: 48.8462, longitude: 2.3464 } },
    { label: "Jardin des Plantes", waypoint: { latitude: 48.843, longitude: 2.356 } },
  ];
  const groupRoutes = groupDefinitions.map((definition, index) => {
    const waypoint = {
      id: `guided-${index + 1}-waypoint-1`,
      label: `${definition.label} · passage 1`,
      ...definition.waypoint,
      order: 0,
    };
    const sector = {
      center: definition.waypoint,
      radiusKm: 1,
    };
    const routeGeometry = createFallbackRouteGeometry([
      [origin.latitude, origin.longitude],
      [waypoint.latitude, waypoint.longitude],
      [origin.latitude, origin.longitude],
    ]);
    const guidedRouting = {
      availability: "fallback-estimated" as const,
      loopVerified: true,
      originVerified: true,
      waypointOrderVerified: true,
      waypointIds: [waypoint.id],
      sectorDeviationKm: 0,
      sectorWithinBounds: true,
      warning: "Fournisseur réel non appelé dans la fixture CI.",
      budget: {
        ...planningMode.budget,
        travelMinutes: 10,
        collectionMinutesAvailable: 45,
        withinBudget: true,
      },
    };
    return {
      groupIndex: index + 1,
      label: definition.label,
      volunteerCount: 5,
      candidateIds: [],
      reservedCandidateIds: [],
      targetCount: 0,
      travelDistanceKm: routeGeometry.distanceKm,
      travelMinutes: routeGeometry.durationMinutes,
      travelBudgetMinutes: planningMode.budget.travelMaxMinutes,
      withinBudget: true,
      routeGeometry,
      operationalBudget: null,
      plannedSector: sector,
      plannedWaypoints: [waypoint],
      guidedBudget: planningMode.budget,
      guidedSegments: [{
        kind: "origin-link" as const,
        fromWaypointId: null,
        toWaypointId: waypoint.id,
        distanceKm: 1,
        estimatedMinutes: 10,
        estimated: true,
      }],
      guidedRouting,
    };
  });
  const snapshot = buildRoutePlannerSnapshot({
    ...createRoutePlannerSnapshotInput(),
    generatedAt: "2026-10-01T09:00:00.000Z",
    planningMode,
    origin,
    volunteers: 10,
    groupCount: 2,
    travelBudgetMinutes: planningMode.budget.totalMinutes,
    routeGeometry: groupRoutes[0]!.routeGeometry,
    travelDistanceKm: groupRoutes.reduce((sum, group) => sum + group.travelDistanceKm, 0),
    travelMinutes: groupRoutes.reduce((sum, group) => sum + group.travelMinutes, 0),
    groups: groupRoutes,
    guidedBudget: planningMode.budget,
    plannerWarnings: ["Fournisseur réel non appelé dans la fixture CI."],
  });
  const routeCalibrationContext = buildRouteCalibrationContext({
    generatedAt: snapshot.generatedAt,
    routeEngineVersion: snapshot.engineVersion,
    volunteersExpected: 10,
    groupCount: 2,
    candidates: [],
    plannerSnapshot: snapshot,
  });
  const operationalRoute = createOperationalRouteFromRecommendation({
    generatedAt: snapshot.generatedAt,
    groupCount: 2,
    routeGeometry: snapshot.geometry,
    stops: [],
    guidedBudget: planningMode.budget,
    trace: { warnings: ["Fournisseur réel non appelé dans la fixture CI."] },
    groupRoutes: groupRoutes.map((group) => ({ ...group, stops: [] })),
  });
  return { planningMode, snapshot, routeCalibrationContext, operationalRoute };
}

const routeContext = buildRouteCalibrationContext({
  generatedAt: "2026-09-01T09:00:00.000Z",
  routeEngineVersion: "route-planner-v2",
  volunteersExpected: 3,
  groupCount: 1,
  candidates: [],
  plannerSnapshot: buildRoutePlannerSnapshot(createRoutePlannerSnapshotInput()),
});

const payload: CreateActionPayload = {
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
    accessibilityStatus: "conditions_reported",
    materialsProvided: "Sacs disponibles au départ.",
    suggestedMaterials: ["gloves", "bags"],
    preparationChecklist: [
      { key: "materials_checked", label: "Matériel vérifié", checked: true },
    ],
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
    expect(row.preparation_data).toMatchObject({
      accessibilityStatus: "conditions_reported",
      materialsProvided: "Sacs disponibles au départ.",
      suggestedMaterials: ["gloves", "bags"],
      preparationChecklist: [{ key: "materials_checked", checked: true }],
    });
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

  it("integrates the deterministic Panthéon/Jardin des Plantes guided action with two groups and no admissible report", () => {
    const fixture = buildGuidedActionFixture();
    const guidedPayload: CreateActionPayload = {
      ...payload,
      actionDate: "2026-10-01",
      locationLabel: "Départ commun Panthéon / Jardin des Plantes",
      volunteersCount: 10,
      durationMinutes: 90,
      routeCalibrationContext: fixture.routeCalibrationContext,
      preparationData: {
        ...payload.preparationData,
        actionDate: "2026-10-01",
        estimatedDurationMinutes: 90,
        volunteersExpected: 10,
        operationalRoute: fixture.operationalRoute,
        routeCalibrationContext: fixture.routeCalibrationContext,
      },
    };

    const contract = toContractCreatePayload(guidedPayload);
    const parsed = createActionSchema.safeParse(contract);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const row = buildActionInsertPayload({
      userId: "user-guided-test",
      payload: parsed.data,
      status: "pending",
      persistedGeometry: buildCreateActionGeometry(parsed.data, null),
      finalDrawing: null,
    });
    const stored = row.preparation_data.operationalRoute;
    expect(stored?.routes).toHaveLength(2);
    expect(stored?.routes.map((route) => ({
      label: route.label,
      volunteerCount: route.volunteerCount,
      waypoint: route.plannedWaypoints?.[0]?.label,
      sector: route.plannedSector?.center,
      observedStops: route.plannerTechnicalStops,
    }))).toEqual([
      expect.objectContaining({ label: "Panthéon", volunteerCount: 5, waypoint: "Panthéon · passage 1", observedStops: [] }),
      expect.objectContaining({ label: "Jardin des Plantes", volunteerCount: 5, waypoint: "Jardin des Plantes · passage 1", observedStops: [] }),
    ]);
    expect(stored?.guidedBudget).toEqual(fixture.planningMode.budget);
    expect(stored?.plannerWarnings).toEqual(["Fournisseur réel non appelé dans la fixture CI."]);
    expect(row.preparation_data.routeCalibrationContext?.plannerSnapshot?.parameters).toMatchObject({
      volunteers: 10,
      groupCount: 2,
      planningMode: fixture.planningMode,
    });

    const readContract = buildActionDataContract({
      id: "action-guided-test",
      type: "action",
      status: "pending",
      source: "web_form",
      observedAt: "2026-10-01",
      locationLabel: guidedPayload.locationLabel,
      latitude: 48.8445,
      longitude: 2.3512,
      preparationData: row.preparation_data,
    });
    expect(readContract.metadata.preparationData?.operationalRoute?.routes).toHaveLength(2);
    expect(readContract.metadata.preparationData?.operationalRoute?.routes[0]?.plannerTechnicalStops).toEqual([]);

    const preserved = preserveHistoricalRouteCalibrationContext(row.preparation_data, {
      actionTitle: "Titre modifié sans recalcul",
      routeCalibrationContext: fixture.routeCalibrationContext,
    });
    expect(preserved.operationalRoute?.routes).toHaveLength(2);
    expect(preserved.operationalRoute?.routes[0]?.plannedWaypoints?.[0]?.label).toBe("Panthéon · passage 1");
    expect(preserved.routeCalibrationContext).toEqual(row.preparation_data.routeCalibrationContext);
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
