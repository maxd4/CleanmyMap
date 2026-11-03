import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActionRequestAccess: vi.fn(),
  loadActionById: vi.fn(),
  isActionGeometryContributorEligible: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: mocks.requireActionRequestAccess,
}));
vi.mock("@/lib/actions/store", () => ({
  loadActionById: mocks.loadActionById,
}));
vi.mock("@/lib/actions/geometry/action-geometry-contributor-eligibility", () => ({
  isActionGeometryContributorEligible: mocks.isActionGeometryContributorEligible,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

import { POST } from "./route";

const action = {
  id: "11111111-1111-4111-8111-111111111111",
  created_by_clerk_id: "organizer-1",
};

function request(body: unknown): Request {
  return new Request("https://cleanmymap.test/api/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/missions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActionRequestAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.loadActionById.mockResolvedValue(action);
    mocks.isActionGeometryContributorEligible.mockResolvedValue(true);
    mocks.insert.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: { id: "mission-1", action_id: action.id, status: "pending" },
          error: null,
        }),
      }),
    });
    mocks.getSupabaseServerClient.mockReturnValue({
      from: () => ({ insert: mocks.insert }),
    });
  });

  it("rejects an invalid or missing action payload", async () => {
    const response = await POST(request({ label: "Terrain" }));

    expect(response.status).toBe(400);
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("allows a confirmed participant and writes the relation server-side", async () => {
    const response = await POST(request({ actionId: action.id, label: "Terrain" }));

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({
      volunteer_id: "user-1",
      label: "Terrain",
      action_id: action.id,
    });
  });

  it("passes the native request through the canonical Clerk boundary", async () => {
    const input = request({ actionId: action.id, label: "Terrain" });
    await POST(input);

    expect(mocks.requireActionRequestAccess).toHaveBeenCalledWith(input);
  });

  it.each([
    [{ ok: false, status: 401, error: "Unauthorized" }, "missing or expired mobile token"],
  ])("rejects %s", async (access) => {
    mocks.requireActionRequestAccess.mockResolvedValue(access);

    const response = await POST(request({ actionId: action.id, label: "Terrain" }));

    expect(response.status).toBe(401);
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("reuses an owner-scoped mission for the same idempotency key", async () => {
    const existing = { id: "mission-1", volunteer_id: "user-1", label: "Terrain", action_id: action.id, status: "pending" };
    const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) }));
    mocks.getSupabaseServerClient.mockReturnValue({ from: () => ({ select, insert: mocks.insert }) });

    const response = await POST(new Request("https://cleanmymap.test/api/missions", {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "mission-start-action-1" },
      body: JSON.stringify({ actionId: action.id, label: "Terrain" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.insert).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ mission: existing });
  });

  it("rejects a user who is not eligible under the canonical geometry contract", async () => {
    mocks.isActionGeometryContributorEligible.mockResolvedValue(false);

    const response = await POST(request({ actionId: action.id, label: "Terrain" }));

    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not turn an administrative role into terrain eligibility", async () => {
    mocks.isActionGeometryContributorEligible.mockResolvedValue(false);

    const response = await POST(request({ actionId: action.id, label: "Terrain" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("créateur");
    expect(body.error).toContain("inscription confirmée");
  });
});
