import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRoutePlannerSnapshot } from "@/lib/route/route-calibration";
import { createRoutePlannerSnapshotInput } from "@/lib/route/route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation } from "@/lib/route/route-operational";
import { createRoutePlannerProof } from "@/lib/route/route-planner-proof";
import {
  createDefaultRouteTerritorialGuidedMode,
  ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
} from "@/lib/route/route-planning-mode";
import { parseJsonSafely } from "@/lib/actions/http-errors";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());
const organizersMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());
const participantSummariesMock = vi.hoisted(() => vi.fn());
const freshnessMock = vi.hoisted(() => vi.fn());
const emitActionUpdateNotificationsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authMock,
  getCurrentUserIdentity: identityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: organizersMock,
}));
vi.mock("@/lib/actions/participation/participant-summaries", () => ({
  loadActionParticipantSummaries: participantSummariesMock,
}));
vi.mock("@/lib/route/route-refresh-signals-loader", () => ({
  loadRouteFreshnessSignal: freshnessMock,
}));
vi.mock("@/lib/actions/action-update-notifications", () => ({
  emitActionUpdateNotifications: emitActionUpdateNotificationsMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: supabaseMock }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => Response.json({ error: "unauthorized" }, { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => Response.json({ error: String(error) }, { status: 500 })),
  validationErrorResponse: vi.fn((details: Record<string, string[]>) => Response.json({ error: details }, { status: 422 })),
}));

function snapshot(
  generatedAt: string,
  distanceKm: number,
  options: { volunteers?: number; groupCount?: number } = {},
) {
  const input = createRoutePlannerSnapshotInput(distanceKm);
  const volunteers = options.volunteers ?? input.volunteers;
  const groupCount = options.groupCount ?? input.groupCount;
  const geometry = input.routeGeometry;
  const baseGroup = input.groups[0]!;
  const quotient = Math.floor(volunteers / groupCount);
  const remainder = volunteers % groupCount;
  return buildRoutePlannerSnapshot({
    ...input,
    generatedAt,
    volunteers,
    groupCount,
    routeGeometry: geometry,
    groups: Array.from({ length: groupCount }, (_, index) => ({
      ...baseGroup,
      groupIndex: index + 1,
      volunteerCount: quotient + (index < remainder ? 1 : 0),
      routeGeometry: geometry,
    })),
  });
}

function guidedSnapshot(
  generatedAt: string,
  volunteers: number,
  groupCount: number,
  options: {
    version?: "route-territorial-guided-v1" | "route-territorial-guided-v2";
    waypointCount?: number;
  } = {},
) {
  const input = createRoutePlannerSnapshotInput(2);
  const defaultMode = createDefaultRouteTerritorialGuidedMode(volunteers, groupCount);
  const groups = defaultMode.groups.map((group, groupIndex) => ({
    ...group,
    waypoints: Array.from({ length: options.waypointCount ?? 2 }, (_, waypointIndex) => ({
      id: `group-${groupIndex + 1}-waypoint-${waypointIndex + 1}`,
      label: `Passage ${groupIndex + 1}.${waypointIndex + 1}`,
      latitude: group.sector.center.latitude + (waypointIndex === 0 ? (groupIndex === 0 ? 0.0004 : -0.0004) : 0.0001),
      longitude: group.sector.center.longitude,
    })),
  }));
  const version = options.version ?? "route-territorial-guided-v2";
  const planningMode = version === ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION
    ? {
        type: "territorial-guided" as const,
        version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
        groups: groups.map((group) => {
          const structuralGroup = { ...group };
          delete structuralGroup.volunteerCount;
          return structuralGroup;
        }),
      }
    : { ...defaultMode, groups };
  const baseGroup = input.groups[0]!;
  return buildRoutePlannerSnapshot({
    ...input,
    generatedAt,
    volunteers,
    groupCount,
    planningMode,
    ...(version === "route-territorial-guided-v2"
      ? { guidedBudget: defaultMode.budget }
      : {}),
    groups: groups.map((group, index) => ({
      ...baseGroup,
      groupIndex: index + 1,
      volunteerCount: group.volunteerCount!,
      routeGeometry: input.routeGeometry,
      label: group.label,
      plannedSector: group.sector,
      plannedWaypoints: group.waypoints.map((waypoint, order) => ({ ...waypoint, order })),
      ...(version === "route-territorial-guided-v2"
        ? { guidedBudget: defaultMode.budget }
        : {}),
    })),
  });
}

function operationalRouteForSnapshot(currentSnapshot: ReturnType<typeof snapshot>) {
  return createOperationalRouteFromRecommendation({
    generatedAt: currentSnapshot.generatedAt,
    groupCount: currentSnapshot.parameters.groupCount,
    routeGeometry: currentSnapshot.geometry,
    stops: currentSnapshot.selectedStops,
    groupRoutes: currentSnapshot.groups.map((group) => ({
      groupIndex: group.groupIndex,
      routeGeometry: group.routeGeometry,
      stops: [],
    })),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function reorderObjectKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reorderObjectKeys) as T;
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nested]) => [key, reorderObjectKeys(nested)]),
  ) as T;
}

function reorderActiveSnapshotParameters(current: ReturnType<typeof actionWithSnapshot>) {
  const calibration = current.preparation_data.routeCalibrationContext;
  if (!calibration?.plannerSnapshot) throw new Error("Expected an active planner snapshot");
  calibration.plannerSnapshot = {
    ...calibration.plannerSnapshot,
    parameters: reorderObjectKeys(calibration.plannerSnapshot.parameters),
  };
}

function firstMockArgument(mock: { mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> } }): unknown {
  return mock.mock.calls[0]?.[0];
}

function actionWithSnapshot(
  currentSnapshot: ReturnType<typeof snapshot>,
  options: { updatedAt?: string | null } = {},
) {
  const operationalRoute = operationalRouteForSnapshot(currentSnapshot);
  return {
    id: "action-1",
    created_by_clerk_id: "owner-1",
    action_phase: "pre_action",
    status: "approved",
    moderation_visibility: "visible",
    published_at: "2026-09-20T10:00:00.000Z",
    updated_at: options.updatedAt === undefined ? "2026-09-27T09:00:00.000Z" : options.updatedAt,
    action_date: "9999-12-31",
    event_start_time: "10:00",
    location_label: "Paris",
    latitude: 48.85,
    longitude: 2.35,
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: null,
    geometry_confidence: 0.8,
    geometry_source: "routed",
    preparation_data: {
      routeCalibrationContext: {
        version: "route-calibration-v1",
        generatedAt: currentSnapshot.generatedAt,
        routeEngineVersion: currentSnapshot.engineVersion,
        cleanupWorkloadVersion: currentSnapshot.cleanupWorkloadVersion,
        volunteersExpected: currentSnapshot.parameters.volunteers,
        groupCount: currentSnapshot.parameters.groupCount,
        candidates: [],
        plannerSnapshot: currentSnapshot,
      },
      operationalRoute,
      customPreparationKey: "preserve-me",
      pointDeRendezVous: "Paris",
      zoneCiblePrevue: "Paris",
    },
  };
}

type RouteVersionPayload = {
  operationalRoute: ReturnType<typeof operationalRouteForSnapshot>;
  plannerSnapshot: ReturnType<typeof snapshot>;
  plannerProof: ReturnType<typeof createRoutePlannerProof>;
};

function routeVersionPayload(
  plannerSnapshot: ReturnType<typeof snapshot>,
  proofSnapshot = plannerSnapshot,
): RouteVersionPayload {
  return {
    operationalRoute: operationalRouteForSnapshot(plannerSnapshot),
    plannerSnapshot,
    plannerProof: createRoutePlannerProof({ snapshot: proofSnapshot, now: new Date() }),
  };
}

async function postRouteVersion(payload: RouteVersionPayload) {
  const { POST } = await import("./route");
  return POST(new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }), { params: Promise.resolve({ actionId: "action-1" }) });
}

function preparePostScenario(
  currentSnapshot: ReturnType<typeof snapshot>,
  options: {
    confirmedParticipants?: number;
    updatedAt?: string | null;
    updateResult?: { data: unknown; error: unknown };
  } = {},
) {
  const current = actionWithSnapshot(currentSnapshot, { updatedAt: options.updatedAt });
  loadActionMock.mockResolvedValueOnce(current);
  if (options.confirmedParticipants !== undefined) {
    participantSummariesMock.mockResolvedValueOnce([{
      actionId: "action-1",
      activeCount: options.confirmedParticipants,
    }]);
  }
  const supabase = updateClient(options.updateResult ?? { data: { id: "action-1" }, error: null });
  supabaseMock.mockReturnValue(supabase);
  return { current, supabase };
}

function updateClient(result: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return { from: vi.fn(() => chain), chain };
}

describe("POST /api/actions/:actionId/route-version", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    identityMock.mockResolvedValue({ userId: "owner-1", role: null, activeRole: null });
    organizersMock.mockResolvedValue([]);
    participantSummariesMock.mockResolvedValue([]);
    freshnessMock.mockResolvedValue({ status: "current", latestSourceAt: null });
    emitActionUpdateNotificationsMock.mockResolvedValue(true);
  });

  it("refuses anonymous recalculation and past actions", async () => {
    authMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { POST } = await import("./route");
    const anonymous = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    expect(anonymous.status).toBe(401);

    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    loadActionMock.mockResolvedValueOnce({ ...actionWithSnapshot(currentSnapshot), action_date: "2020-09-01" });
    const past = await postRouteVersion(routeVersionPayload(currentSnapshot));
    expect(past.status).toBe(409);
  });

  it("rejects invalid JSON, invalid payloads and missing action ids", async () => {
    const { POST, GET } = await import("./route");
    const invalidJson = await POST(new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(invalidJson.status).toBe(400);

    const invalidPayload = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(invalidPayload.status).toBe(422);

    const missingActionId = await GET(new Request("http://localhost", { method: "GET" }), {
      params: Promise.resolve({ actionId: "   " }),
    });
    expect(missingActionId.status).toBe(422);
  });

  it("returns not found when the action no longer exists", async () => {
    loadActionMock.mockResolvedValueOnce(null);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost", { method: "GET" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects incoherent and unusable active route data", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce({
      ...current,
      preparation_data: {
        ...current.preparation_data,
        routeVersioning: { invalid: true },
      },
    });
    const { GET } = await import("./route");
    const incoherent = await GET(new Request("http://localhost", { method: "GET" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    expect(incoherent.status).toBe(409);

    loadActionMock.mockResolvedValueOnce({ ...current, preparation_data: {} });
    const unusable = await GET(new Request("http://localhost", { method: "GET" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    expect(unusable.status).toBe(409);
  });

  it("applies an explicit proposal and keeps the initial context and action id", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    const { current, supabase } = preparePostScenario(currentSnapshot);
    const nextOperationalRoute = operationalRouteForSnapshot(nextSnapshot);
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));
    const body = await parseJsonSafely(response);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "applied",
      actionId: "action-1",
      activeRouteVersion: { appliedByUserId: "owner-1" },
      history: [expect.anything()],
    });
    const updateCall = firstMockArgument(supabase.chain.update);
    expect(updateCall).toMatchObject({
      preparation_data: {
        routeCalibrationContext: current.preparation_data.routeCalibrationContext,
        operationalRoute: nextOperationalRoute,
        customPreparationKey: "preserve-me",
      },
      geometry_source: "routed",
    });
    if (!isRecord(updateCall) || !isRecord(updateCall.preparation_data) || !isRecord(updateCall.preparation_data.routeVersioning)) {
      throw new Error("Expected route versioning data in the update payload");
    }
    expect(Array.isArray(updateCall.preparation_data.routeVersioning.history)).toBe(true);
    expect(supabase.chain.eq).toHaveBeenCalledWith("updated_at", current.updated_at);
  });

  it("keeps event-centered refreshes on the historical parameter comparison", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    currentSnapshot.parameters = {
      ...currentSnapshot.parameters,
      planningMode: { type: "event-centered", eventId: "event-1" },
    };
    nextSnapshot.parameters = {
      ...nextSnapshot.parameters,
      planningMode: { type: "event-centered", eventId: "event-1" },
    };
    const { current } = preparePostScenario(currentSnapshot, { confirmedParticipants: 3 });
    reorderActiveSnapshotParameters(current);

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(200);
    expect(await parseJsonSafely(response)).toMatchObject({ status: "applied" });
  });

  it("accepts a participant refresh when the server confirms the proposed volunteer count", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3, { volunteers: 5 });
    preparePostScenario(currentSnapshot, { confirmedParticipants: 5 });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(200);
    expect(await parseJsonSafely(response)).toMatchObject({ status: "applied" });
  });

  it("applies a balanced guided refresh from 10 to 12 volunteers and preserves constraints", async () => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const nextSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, 2);
    const { current, supabase } = preparePostScenario(currentSnapshot, {
      confirmedParticipants: 12,
    });
    reorderActiveSnapshotParameters(current);

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "applied",
      activeRouteVersion: {
        calculation: {
          parameters: {
            volunteers: 12,
            groupCount: 2,
            planningMode: {
              type: "territorial-guided",
              groups: [
                { volunteerCount: 6 },
                { volunteerCount: 6 },
              ],
            },
          },
        },
      },
    });
    const updateCall = firstMockArgument(supabase.chain.update);
    expect(updateCall).toMatchObject({
      preparation_data: {
        routeCalibrationContext: current.preparation_data.routeCalibrationContext,
        operationalRoute: operationalRouteForSnapshot(nextSnapshot),
      },
    });
    if (!isRecord(updateCall) || !isRecord(updateCall.preparation_data) ||
      !isRecord(updateCall.preparation_data.routeVersioning)) {
      throw new Error("Expected guided route versioning data in the update payload");
    }
    expect(isRecord(updateCall.preparation_data.routeVersioning.active)).toBe(true);
    expect(Array.isArray(updateCall.preparation_data.routeVersioning.history)).toBe(true);
    expect(supabase.chain.eq).toHaveBeenCalledWith("updated_at", current.updated_at);
  });

  it("applies the deterministic 6/5 guided refresh from 10 to 11 volunteers", async () => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const nextSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 11, 2);
    const { current } = preparePostScenario(currentSnapshot, { confirmedParticipants: 11 });
    reorderActiveSnapshotParameters(current);

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "applied",
      activeRouteVersion: {
        calculation: {
          parameters: {
            planningMode: {
              groups: [
                { volunteerCount: 6 },
                { volunteerCount: 5 },
              ],
            },
          },
        },
      },
    });
  });

  it("does not overwrite a concurrent guided action update", async () => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const nextSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, 2);
    const { supabase } = preparePostScenario(currentSnapshot, {
      confirmedParticipants: 12,
      updateResult: { data: null, error: null },
    });

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(await parseJsonSafely(response)).toMatchObject({ code: "state_conflict" });
    expect(supabase.chain.eq).toHaveBeenCalledWith("updated_at", "2026-09-27T09:00:00.000Z");
  });

  it.each([
    "group count",
    "group order",
    "sector",
    "waypoint",
    "waypoint order",
    "label",
    "budget",
  ] as const)("rejects a guided refresh that changes the %s", async (mutation) => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const changedSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, mutation === "group count" ? 3 : 2);
    const mode = changedSnapshot.parameters.planningMode;
    if (mode.type !== "territorial-guided") throw new Error("Expected guided mode");

    if (mutation === "group order") {
      mode.groups = [...mode.groups].reverse();
    } else if (mutation === "sector") {
      mode.groups[0] = {
        ...mode.groups[0]!,
        sector: { ...mode.groups[0]!.sector, radiusKm: 0.5 },
      };
    } else if (mutation === "waypoint") {
      mode.groups[0] = {
        ...mode.groups[0]!,
        waypoints: mode.groups[0]!.waypoints.map((waypoint, index) =>
          index === 0 ? { ...waypoint, latitude: waypoint.latitude + 0.0002 } : waypoint,
        ),
      };
    } else if (mutation === "waypoint order") {
      mode.groups[0] = {
        ...mode.groups[0]!,
        waypoints: [...mode.groups[0]!.waypoints].reverse(),
      };
    } else if (mutation === "label") {
      mode.groups[0] = { ...mode.groups[0]!, label: "Groupe modifié" };
    } else if (mutation === "budget") {
      if (mode.version !== "route-territorial-guided-v2") throw new Error("Expected guided v2 mode");
      mode.budget = {
        ...mode.budget,
        minimumCollectionMinutes: 46,
        travelMaxMinutes: 29,
      };
    }

    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 12 });
    const response = await postRouteVersion(routeVersionPayload(changedSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it.each(["mode version", "mode type", "top-level planner parameter"] as const)(
    "rejects a guided refresh that changes the %s",
    async (mutation) => {
      const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
      const changedSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, 2);
      const mode = changedSnapshot.parameters.planningMode;
      if (mode.type !== "territorial-guided") throw new Error("Expected guided mode");

      if (mutation === "mode version") {
        changedSnapshot.parameters = {
          ...changedSnapshot.parameters,
          planningMode: {
            type: "territorial-guided",
            version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
            groups: mode.groups.map((group) => {
              const structuralGroup = { ...group };
              delete structuralGroup.volunteerCount;
              return structuralGroup;
            }),
          },
        };
      } else if (mutation === "mode type") {
        changedSnapshot.parameters = {
          ...changedSnapshot.parameters,
          planningMode: { type: "free" },
        };
      } else {
        changedSnapshot.parameters = {
          ...changedSnapshot.parameters,
          travelBudgetMinutes: 59,
        };
      }

      const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 12 });
      const response = await postRouteVersion(routeVersionPayload(changedSnapshot));

      expect(response.status).toBe(409);
      expect(supabase.from).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: "unbalanced", counts: [7, 5], status: 409 },
    { name: "zero", counts: [0, 12], status: 422 },
    { name: "fractional", counts: [6.5, 5.5], status: 422 },
  ] as const)("rejects $name guided group counts", async ({ counts, status }) => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const changedSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, 2);
    const mode = changedSnapshot.parameters.planningMode;
    if (mode.type !== "territorial-guided") throw new Error("Expected guided mode");
    mode.groups = mode.groups.map((group, index) => ({
      ...group,
      volunteerCount: counts[index],
    }));
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 12 });

    const response = await postRouteVersion(routeVersionPayload(changedSnapshot));

    expect(response.status).toBe(status);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires confirmed participants before applying a guided volunteer change", async () => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const nextSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, 2);
    const { supabase } = preparePostScenario(currentSnapshot);

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a guided proposal when confirmed participants do not match", async () => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const nextSnapshot = guidedSnapshot("2026-09-27T09:00:00.000Z", 12, 2);
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 11 });

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does not create a second version when an identical guided proposal is replayed", async () => {
    const currentSnapshot = guidedSnapshot("2026-09-01T09:00:00.000Z", 10, 2);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    const supabase = { from: vi.fn() };
    supabaseMock.mockReturnValue(supabase);

    const response = await postRouteVersion(routeVersionPayload(currentSnapshot));

    expect(response.status).toBe(200);
    expect(await parseJsonSafely(response)).toMatchObject({ status: "unchanged" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("keeps guided v1 compatible without manufacturing a v2 budget", async () => {
    const currentSnapshot = guidedSnapshot(
      "2026-09-01T09:00:00.000Z",
      10,
      2,
      { version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION },
    );
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    const supabase = { from: vi.fn() };
    supabaseMock.mockReturnValue(supabase);

    const response = await postRouteVersion(routeVersionPayload(currentSnapshot));
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "unchanged" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("accepts a representable guided v1 redistribution without adding a budget", async () => {
    const currentSnapshot = guidedSnapshot(
      "2026-09-01T09:00:00.000Z",
      10,
      2,
      { version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION },
    );
    const nextSnapshot = guidedSnapshot(
      "2026-09-27T09:00:00.000Z",
      11,
      2,
      { version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION },
    );
    const nextMode = nextSnapshot.parameters.planningMode;
    if (nextMode.type !== "territorial-guided") throw new Error("Expected guided mode");
    nextMode.groups = nextMode.groups.map((group, index) => ({
      ...group,
      volunteerCount: index === 0 ? 6 : 5,
    }));
    preparePostScenario(currentSnapshot, { confirmedParticipants: 11 });

    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "applied",
      activeRouteVersion: {
        calculation: {
          parameters: {
            planningMode: {
              version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
              groups: [
                { volunteerCount: 6 },
                { volunteerCount: 5 },
              ],
            },
          },
        },
      },
    });
    expect(body).not.toHaveProperty("activeRouteVersion.calculation.parameters.planningMode.budget");
  });

  it("rejects a forged volunteer count that differs from the current server count", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3, { volunteers: 4 });
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 5 });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("accepts a compatible group split while keeping structural planner parameters stable", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3, { groupCount: 2 });
    preparePostScenario(currentSnapshot, { confirmedParticipants: 3 });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(200);
  });

  it("rejects an incompatible group split", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3, { groupCount: 4 });
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 3 });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects structural parameter changes", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const changedSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    changedSnapshot.parameters = { ...changedSnapshot.parameters, maxStops: 4 };
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 3 });
    const response = await postRouteVersion(routeVersionPayload(changedSnapshot, currentSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a proposal whose proof does not match its snapshot", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 3 });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot, currentSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a changed volunteer count when the server count is unavailable", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3, { volunteers: 5 });
    const { supabase } = preparePostScenario(currentSnapshot);
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an operational route that does not match the planner snapshot", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    const { supabase } = preparePostScenario(currentSnapshot, { confirmedParticipants: 3 });
    const payload = routeVersionPayload(nextSnapshot);
    payload.operationalRoute = { ...payload.operationalRoute, routes: [] };
    const response = await postRouteVersion(payload);

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns a conflict when updated_at changed before the compare-and-swap", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    preparePostScenario(currentSnapshot, {
      confirmedParticipants: 3,
      updateResult: { data: null, error: null },
    });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(await parseJsonSafely(response)).toMatchObject({ code: "state_conflict" });
  });

  it("returns an internal error when persistence fails", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    const { supabase } = preparePostScenario(currentSnapshot, {
      confirmedParticipants: 3,
      updateResult: { data: null, error: new Error("database unavailable") },
    });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(500);
    expect(supabase.chain.update).toHaveBeenCalledOnce();
  });

  it("returns a conflict when the loaded action has no updated_at token", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    const { supabase } = preparePostScenario(currentSnapshot, {
      confirmedParticipants: 3,
      updatedAt: null,
    });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(409);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns unchanged without writing when the proposal has the active snapshot", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    const supabase = { from: vi.fn() };
    supabaseMock.mockReturnValue(supabase);
    const response = await postRouteVersion(routeVersionPayload(currentSnapshot));
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "unchanged" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("refuses a proposal from a manager who does not own the action", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    authMock.mockResolvedValueOnce({ ok: true, userId: "intruder-1" });
    identityMock.mockResolvedValueOnce({ userId: "intruder-1", role: null, activeRole: null });
    const response = await postRouteVersion(routeVersionPayload(currentSnapshot));

    expect(response.status).toBe(403);
  });

  it("returns lightweight freshness signals without invoking the planner", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    participantSummariesMock.mockResolvedValueOnce([{
      actionId: "action-1",
      activeCount: 5,
      totalCount: 6,
      myParticipationStatus: "confirmed",
      myParticipationSource: "manual",
      myJoinedAt: null,
      myUpdatedAt: null,
    }]);
    supabaseMock.mockReturnValue({ from: vi.fn() });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost", { method: "GET" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      signals: {
        participants: { used: 3, confirmed: 5 },
        recommended: true,
        reasons: ["participants_changed"],
      },
    });
    expect(freshnessMock).toHaveBeenCalledOnce();
  });
});
