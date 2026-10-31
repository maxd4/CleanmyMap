import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccess = vi.hoisted(() => vi.fn());
const getSupabaseAdminClient = vi.hoisted(() => vi.fn());
const updateActionRide = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient }));
vi.mock("@/lib/actions/action-rides-service", () => ({
  updateActionRide,
  transitionActionRide: vi.fn(),
  ActionRideServiceError: class ActionRideServiceError extends Error {
    status = 409 as const;
  },
}));

import { PATCH } from "./route";

const context = { params: Promise.resolve({ actionId: "action-1", rideId: "ride-1" }) };

describe("PATCH /api/actions/[actionId]/rides/[rideId] [EXECUTED_BEHAVIOR]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActionRequestAccess.mockResolvedValue({ ok: true, userId: "driver-1" });
    getSupabaseAdminClient.mockReturnValue({});
    updateActionRide.mockResolvedValue({
      ride: {
        id: "ride-1",
        originZoneName: "1er arrondissement",
        departureAt: "2099-06-15T08:00:00.000Z",
        seatsTotal: 3,
        seatsAvailable: 3,
        note: "Départ groupé",
        status: "open",
      },
    });
  });

  it("returns the explicit public projection from the composite update", async () => {
    const response = await PATCH(new Request("http://localhost/api/actions/action-1/rides/ride-1", {
      method: "PATCH",
      body: JSON.stringify({
        originZoneName: "1er arrondissement",
        departureAt: "2099-06-15T08:00:00.000Z",
        seatsTotal: 3,
        note: "Départ groupé",
      }),
    }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      ride: expect.objectContaining({ id: "ride-1", status: "open" }),
    });
    expect(updateActionRide).toHaveBeenCalledWith({}, expect.objectContaining({ actionId: "action-1", rideId: "ride-1", userId: "driver-1" }));
  });
});
