import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRoutePlannerSnapshot } from "@/lib/route/route-calibration";
import { createRoutePlannerSnapshotInput } from "@/lib/route/route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation } from "@/lib/route/route-operational";
import { createRoutePlannerProof } from "@/lib/route/route-planner-proof";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());
const organizersMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());
const participantSummariesMock = vi.hoisted(() => vi.fn());
const freshnessMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authMock,
  getCurrentUserIdentity: identityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: organizersMock,
}));
vi.mock("@/lib/actions/participation/participant-summaries", () => ({
  loadActionParticipantSummaries: participantSummariesMock,
}));
vi.mock("@/lib/route/route-refresh-signals-loader", () => ({
  loadRouteFreshnessSignal: freshnessMock,
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
  const geometry = {
    ...input.routeGeometry,
    coordinates: [[48.85, 2.35], [48.851, 2.351]] as [number, number][],
  };
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
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("applied");
    expect(body.actionId).toBe("action-1");
    expect(body.activeRouteVersion.appliedByUserId).toBe("owner-1");
    expect(body.history).toHaveLength(1);
    expect(supabase.chain.update).toHaveBeenCalledWith(expect.objectContaining({
      preparation_data: expect.objectContaining({
        routeCalibrationContext: current.preparation_data.routeCalibrationContext,
        operationalRoute: nextOperationalRoute,
        customPreparationKey: "preserve-me",
        routeVersioning: expect.objectContaining({ history: expect.any(Array) }),
      }),
      geometry_source: "routed",
    }));
    expect(supabase.chain.eq).toHaveBeenCalledWith("updated_at", current.updated_at);
  });

  it("accepts a participant refresh when the server confirms the proposed volunteer count", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3, { volunteers: 5 });
    preparePostScenario(currentSnapshot, { confirmedParticipants: 5 });
    const response = await postRouteVersion(routeVersionPayload(nextSnapshot));

    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("applied");
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
    expect((await response.json()).code).toBe("state_conflict");
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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unchanged");
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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.signals).toMatchObject({
      participants: { used: 3, confirmed: 5 },
      recommended: true,
      reasons: ["participants_changed"],
    });
    expect(freshnessMock).toHaveBeenCalledOnce();
  });
});
