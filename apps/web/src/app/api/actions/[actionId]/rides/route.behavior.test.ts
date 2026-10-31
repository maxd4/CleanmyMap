import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccess = vi.hoisted(() => vi.fn());
const getSupabaseAdminClient = vi.hoisted(() => vi.fn());
const createActionRide = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("@/lib/actions/action-rides-service", () => ({
  createActionRide,
  listActionRides: vi.fn(),
  ActionRideServiceError: class ActionRideServiceError extends Error {},
}));

import { POST } from "./route";

const context = { params: Promise.resolve({ actionId: "action-1" }) };

describe("POST /api/actions/[actionId]/rides [EXECUTED_BEHAVIOR]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseAdminClient.mockReturnValue({});
  });

  it("fails closed before obtaining the privileged client when AuthN fails", async () => {
    requireActionRequestAccess.mockResolvedValue({ ok: false });

    const response = await POST(new Request("http://localhost/api/actions/action-1/rides", {
      method: "POST",
      body: JSON.stringify({}),
    }), context);

    expect(response.status).toBe(401);
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
    expect(createActionRide).not.toHaveBeenCalled();
  });

  it("passes the authenticated actor and bounded payload to the server owner", async () => {
    requireActionRequestAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    createActionRide.mockResolvedValue({ ride: { id: "ride-1" } });

    const response = await POST(new Request("http://localhost/api/actions/action-1/rides", {
      method: "POST",
      body: JSON.stringify({
        originZoneName: "Paris 1er",
        departureAt: "2030-06-15T08:00:00+02:00",
        seatsTotal: 2,
        note: null,
      }),
    }), context);

    expect(response.status).toBe(201);
    expect(createActionRide).toHaveBeenCalledWith({}, {
      actionId: "action-1",
      userId: "user-1",
      input: {
        originZoneName: "Paris 1er",
        departureAt: "2030-06-15T08:00:00+02:00",
        seatsTotal: 2,
        note: null,
      },
    });
  });
});
