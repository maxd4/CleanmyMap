import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateActionPayload } from "./types";

const resolveCanonicalCreateActionPayloadMock = vi.hoisted(() => vi.fn());
const recordCreateActionTrainingExampleMock = vi.hoisted(() => vi.fn());
const recordRepollutionPredictionEvaluationForActionMock = vi.hoisted(() => vi.fn());
const reconstructActionRouteMock = vi.hoisted(() => vi.fn());
const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());
const resolveTrustedActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("./organizer-directory-registry", () => ({
  resolveCanonicalCreateActionPayload: resolveCanonicalCreateActionPayloadMock,
}));
vi.mock("./store-post-processing", () => ({
  recordCreateActionTrainingExample: recordCreateActionTrainingExampleMock,
  recordRepollutionPredictionEvaluationForAction: recordRepollutionPredictionEvaluationForActionMock,
}));
vi.mock("@/lib/actions/geometry/route-reconstruction", () => ({
  reconstructActionRoute: reconstructActionRouteMock,
}));
vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
  resolveTrustedActionDepartmentForPersistence: resolveTrustedActionDepartmentForPersistenceMock,
}));

import { createAction } from "./store-create";

function payload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actorName: "Collectif test",
    associationName: "Action spontanée",
    actionDate: "2026-10-20",
    locationLabel: "Paris",
    latitude: 48.85,
    longitude: 2.35,
    wasteKg: 2,
    cigaretteButts: 0,
    volunteersCount: 2,
    durationMinutes: 30,
    notes: "preuve comportementale",
    ...overrides,
  };
}

function harness(result: { action_id: string; replayed?: boolean }) {
  const rpc = vi.fn().mockResolvedValue({ data: [result], error: null });
  return { rpc, client: { rpc } as unknown as SupabaseClient };
}

describe("createAction behavioral persistence orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCanonicalCreateActionPayloadMock.mockImplementation(async ({ payload: value }: { payload: CreateActionPayload }) => value);
    reconstructActionRouteMock.mockResolvedValue(null);
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: "75", departmentName: "Paris" });
    resolveTrustedActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: "75", departmentName: "Paris" });
  });

  it("persists a new action and runs the training post-processing once", async () => {
    const fixture = harness({ action_id: "action-1", replayed: false });

    await expect(createAction(fixture.client, {
      userId: "user-1",
      payload: payload({ routeTopology: "loop" }),
      organizers: [],
      status: "pending",
      clientRequestId: "request-1",
    })).resolves.toEqual({ id: "action-1" });

    expect(fixture.rpc).toHaveBeenCalledWith("create_action_with_relations", expect.objectContaining({
      p_creator_id: "user-1",
      p_client_request_id: "request-1",
      p_action: expect.objectContaining({ action_phase: "post_action_complete", department_code: "75" }),
    }));
    expect(recordCreateActionTrainingExampleMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actionId: "action-1" }));
    expect(recordRepollutionPredictionEvaluationForActionMock).not.toHaveBeenCalled();
  });

  it("returns an atomic replay without running post-processing again", async () => {
    const fixture = harness({ action_id: "action-existing", replayed: true });
    await expect(createAction(fixture.client, {
      userId: "user-1",
      payload: payload({ preparationData: { interventionMode: { mode: "fixed_area", version: "intervention-mode-v1" } } }),
      organizers: [],
      status: "approved",
    })).resolves.toEqual({ id: "action-existing", replayed: true });
    expect(recordCreateActionTrainingExampleMock).not.toHaveBeenCalled();
    expect(recordRepollutionPredictionEvaluationForActionMock).not.toHaveBeenCalled();
  });

  it("uses the trusted department resolver and runs approved-action evaluation after persistence", async () => {
    const fixture = harness({ action_id: "action-approved", replayed: false });
    resolveTrustedActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: "69", departmentName: "Rhône" });

    await expect(createAction(fixture.client, {
      userId: "admin-1",
      payload: payload({ routeTopology: "point_to_point", arrivalLocationLabel: "Lyon" }),
      organizers: [],
      status: "approved",
      departmentAttribution: { trust: "trusted", source: "admin_import" },
    })).resolves.toEqual({ id: "action-approved" });

    expect(resolveTrustedActionDepartmentForPersistenceMock).toHaveBeenCalledOnce();
    expect(resolveActionDepartmentForPersistenceMock).not.toHaveBeenCalled();
    expect(recordRepollutionPredictionEvaluationForActionMock).toHaveBeenCalledWith(expect.anything(), "action-approved");
  });

  it("preserves an absent route target and does not invent a drawing when reconstruction is unavailable", async () => {
    const fixture = harness({ action_id: "action-fixed-area", replayed: false });
    await createAction(fixture.client, {
      userId: "user-1",
      payload: payload({ preparationData: { interventionMode: { mode: "fixed_area", version: "intervention-mode-v1" } }, manualDrawing: undefined }),
      organizers: [],
    });

    expect(fixture.rpc.mock.calls[0]?.[1]?.p_action).toMatchObject({
      derived_geometry_kind: "point",
      geometry_source: "fallback_point",
    });
    expect(fixture.rpc.mock.calls[0]?.[1]?.p_action).not.toHaveProperty("route_target_distance_km");
  });
});
