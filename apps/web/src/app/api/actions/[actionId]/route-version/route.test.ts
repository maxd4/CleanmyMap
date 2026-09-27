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

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authMock,
  getCurrentUserIdentity: identityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: organizersMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: supabaseMock }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => Response.json({ error: "unauthorized" }, { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => Response.json({ error: String(error) }, { status: 500 })),
  validationErrorResponse: vi.fn((details: Record<string, string[]>) => Response.json({ error: details }, { status: 422 })),
}));

function snapshot(generatedAt: string, distanceKm: number) {
  const input = createRoutePlannerSnapshotInput(distanceKm);
  const geometry = {
    ...input.routeGeometry,
    coordinates: [[48.85, 2.35], [48.851, 2.351]] as [number, number][],
  };
  return buildRoutePlannerSnapshot({
    ...input,
    generatedAt,
    routeGeometry: geometry,
    groups: input.groups.map((group) => ({ ...group, routeGeometry: geometry })),
  });
}

function actionWithSnapshot(currentSnapshot: ReturnType<typeof snapshot>) {
  const operationalRoute = createOperationalRouteFromRecommendation({
    generatedAt: currentSnapshot.generatedAt,
    groupCount: currentSnapshot.parameters.groupCount,
    routeGeometry: currentSnapshot.geometry,
    stops: currentSnapshot.selectedStops,
    groupRoutes: [],
  });
  return {
    id: "action-1",
    created_by_clerk_id: "owner-1",
    action_phase: "pre_action",
    status: "approved",
    moderation_visibility: "visible",
    published_at: "2026-09-20T10:00:00.000Z",
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
      pointDeRendezVous: "Paris",
      zoneCiblePrevue: "Paris",
    },
  };
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
    const past = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), {
      params: Promise.resolve({ actionId: "action-1" }),
    });
    expect(past.status).toBe(422);
  });

  it("applies an explicit proposal and keeps the initial context and action id", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const nextSnapshot = snapshot("2026-09-27T09:00:00.000Z", 3);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    const nextOperationalRoute = createOperationalRouteFromRecommendation({
      generatedAt: nextSnapshot.generatedAt,
      groupCount: nextSnapshot.parameters.groupCount,
      routeGeometry: nextSnapshot.geometry,
      stops: nextSnapshot.selectedStops,
      groupRoutes: [],
    });
    const supabase = updateClient({ data: { id: "action-1" }, error: null });
    supabaseMock.mockReturnValue(supabase);
    const proof = createRoutePlannerProof({ snapshot: nextSnapshot, now: new Date() });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalRoute: nextOperationalRoute, plannerSnapshot: nextSnapshot, plannerProof: proof }),
    }), { params: Promise.resolve({ actionId: "action-1" }) });
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
        routeVersioning: expect.objectContaining({ history: expect.any(Array) }),
      }),
      geometry_source: "routed",
    }));
  });

  it("returns unchanged without writing when the proposal has the active snapshot", async () => {
    const currentSnapshot = snapshot("2026-09-01T09:00:00.000Z", 2);
    const current = actionWithSnapshot(currentSnapshot);
    loadActionMock.mockResolvedValueOnce(current);
    const supabase = { from: vi.fn() };
    supabaseMock.mockReturnValue(supabase);
    const operationalRoute = current.preparation_data.operationalRoute;
    const proof = createRoutePlannerProof({ snapshot: currentSnapshot, now: new Date() });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalRoute, plannerSnapshot: currentSnapshot, plannerProof: proof }),
    }), { params: Promise.resolve({ actionId: "action-1" }) });
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
    const proof = createRoutePlannerProof({ snapshot: currentSnapshot, now: new Date() });
    const operationalRoute = current.preparation_data.operationalRoute;
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalRoute, plannerSnapshot: currentSnapshot, plannerProof: proof }),
    }), { params: Promise.resolve({ actionId: "action-1" }) });

    expect(response.status).toBe(403);
  });
});
