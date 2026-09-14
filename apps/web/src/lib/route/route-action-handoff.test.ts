import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumePlannerActionHandoff,
  ROUTE_ACTION_HANDOFF_STORAGE_KEY,
  writePlannerActionHandoff,
} from "./route-action-handoff";

const operationalRoute = {
  version: "operational-route-v1" as const,
  initializedAt: "2026-09-14T10:00:00.000Z",
  updatedAt: "2026-09-14T10:00:00.000Z",
  source: "planner" as const,
  state: "planner_copy" as const,
  plannerGroupCount: 1,
  routes: [],
  zones: {
    departure: { label: null, coordinate: null },
    midpoint: { label: null, coordinate: null },
    arrival: { label: null, coordinate: null },
  },
};

function installStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  return values;
}

afterEach(() => vi.unstubAllGlobals());

describe("planner action handoff", () => {
  it("is one-shot and does not retain an expired handoff", () => {
    const storage = installStorage();
    writePlannerActionHandoff({
      operationalRoute,
      routeCalibrationContext: null,
      plannerProof: null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(consumePlannerActionHandoff()?.operationalRoute).toEqual(operationalRoute);
    expect(consumePlannerActionHandoff()).toBeNull();

    storage.set(ROUTE_ACTION_HANDOFF_STORAGE_KEY, JSON.stringify({
      operationalRoute,
      routeCalibrationContext: null,
      plannerProof: null,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    }));
    expect(consumePlannerActionHandoff()).toBeNull();
    expect(storage.has(ROUTE_ACTION_HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it("reads a legacy actualRoute handoff and returns the canonical key", () => {
    const storage = installStorage();
    storage.set(ROUTE_ACTION_HANDOFF_STORAGE_KEY, JSON.stringify({
      actualRoute: {
        version: "actual-route-v1",
        initializedAt: operationalRoute.initializedAt,
        source: "planner",
        plannerGroupCount: 1,
        routes: [],
        zones: operationalRoute.zones,
      },
      routeCalibrationContext: null,
      plannerProof: null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }));

    expect(consumePlannerActionHandoff()?.operationalRoute.version).toBe(
      "operational-route-v1",
    );
  });

  it("keeps the known pre-action prefill while rejecting malformed values", () => {
    const storage = installStorage();
    writePlannerActionHandoff({
      operationalRoute,
      routeCalibrationContext: null,
      plannerProof: null,
      preparationData: {
        actionDate: "2026-09-20",
        estimatedDurationMinutes: 45,
        volunteersExpected: 4,
      },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(consumePlannerActionHandoff()?.preparationData).toEqual({
      actionDate: "2026-09-20",
      estimatedDurationMinutes: 45,
      volunteersExpected: 4,
    });

    storage.set(ROUTE_ACTION_HANDOFF_STORAGE_KEY, JSON.stringify({
      operationalRoute,
      routeCalibrationContext: null,
      plannerProof: null,
      preparationData: { volunteersExpected: "invented" },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }));
    expect(consumePlannerActionHandoff()).toBeNull();
  });
});
