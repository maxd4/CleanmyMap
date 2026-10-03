import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  reconcile: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.access }));
vi.mock("@/lib/gamification/gamification-reconciliation", () => ({
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
    const response = await POST(new Request("https://cleanmymap.test"), {
      params: Promise.resolve({ missionId: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(200);
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.anything(), "user-1", expect.anything());
    const body = await response.json();
    expect(body).toEqual({ status: "ok", missionId: "11111111-1111-4111-8111-111111111111", actionId: "action-1", expectedEvents: 1 });
    expect(JSON.stringify(body)).not.toContain("gps_points");
  });
});
