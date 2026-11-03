import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  reconcile: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: mocks.access }));
vi.mock("@/lib/gamification/reconciliation/gamification-reconciliation", () => ({
  reconcileUserGamification: mocks.reconcile,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })) })),
      })),
    })),
  })),
}));

import { POST } from "./route";

describe("POST /api/missions/:missionId/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111", volunteer_id: "user-1", action_id: "action-1", status: "completed" },
      error: null,
    });
    mocks.reconcile.mockResolvedValue({ expectedEvents: 1 });
  });

  it("reconciles from the owner-scoped completed mission and returns no GPS payload", async () => {
    const request = new Request("https://cleanmymap.test", { headers: { Authorization: "Bearer mobile-token" } });
    const response = await POST(request, {
      params: Promise.resolve({ missionId: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(200);
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.anything(), "user-1", expect.anything());
    const body = await response.json();
    expect(body).toEqual({ status: "ok", missionId: "11111111-1111-4111-8111-111111111111", actionId: "action-1", expectedEvents: 1 });
    expect(JSON.stringify(body)).not.toContain("gps_points");
    expect(mocks.access).toHaveBeenCalledWith(request);
  });

  it("does not expose a different owner's mission", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await POST(new Request("https://cleanmymap.test", { headers: { Authorization: "Bearer expired" } }), {
      params: Promise.resolve({ missionId: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(409);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("rejects an absent or expired mobile bearer before reading the mission", async () => {
    mocks.access.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await POST(new Request("https://cleanmymap.test"), {
      params: Promise.resolve({ missionId: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("keeps a technical reconciliation failure retryable", async () => {
    mocks.reconcile.mockRejectedValueOnce(new Error("network"));
    const response = await POST(new Request("https://cleanmymap.test", { headers: { Authorization: "Bearer mobile-token" } }), {
      params: Promise.resolve({ missionId: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(500);
  });
});
