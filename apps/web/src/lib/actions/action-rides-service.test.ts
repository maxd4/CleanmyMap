import { beforeEach, describe, expect, it, vi } from "vitest";

const loadActionById = vi.hoisted(() => vi.fn());
const readActionRegistrationRecord = vi.hoisted(() => vi.fn());
const isPublicActionReferenceAvailable = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById }));
vi.mock("@/lib/actions/participation/registration-records", () => ({ readActionRegistrationRecord }));
vi.mock("@/lib/chat/action-sharing", () => ({ isPublicActionReferenceAvailable }));

import { updateActionRide, type ActionRideRow } from "./action-rides-service";

const action = {
  id: "action-1",
  action_phase: "pre_action",
  published_at: "2026-10-31T08:00:00.000Z",
  moderation_visibility: "visible",
  status: "approved",
  access_mode: "public",
  review_state: "not_required",
  action_date: "2099-06-15",
  event_start_time: "10:00:00",
};

const baseRide: ActionRideRow = {
  id: "ride-1",
  action_id: "action-1",
  driver_user_id: "driver-1",
  origin_zone_name: "1er arrondissement",
  departure_at: "2099-06-15T08:00:00.000Z",
  seats_total: 3,
  note: "Départ groupé",
  status: "open",
  created_at: "2099-01-01T00:00:00.000Z",
  updated_at: "2099-01-01T00:00:00.000Z",
};

function makeSupabase(ride = baseRide) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: ride, error: null })),
  };
  const rpc = vi.fn(async (name: string) => name === "update_action_ride_details"
    ? { data: { ...ride, note: "Nouveau départ" }, error: null }
    : { data: [{ ride_id: ride.id, seats_total: ride.seats_total, seats_reserved: 0, seats_available: ride.seats_total }], error: null });
  return { from: vi.fn(() => query), rpc };
}

describe("updateActionRide [EXECUTED_BEHAVIOR]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadActionById.mockResolvedValue(action);
    readActionRegistrationRecord.mockResolvedValue({ registration_status: "confirmed" });
    isPublicActionReferenceAvailable.mockReturnValue(true);
  });

  it("normalizes the composite RPC result into a public PATCH projection", async () => {
    const supabase = makeSupabase();

    const result = await updateActionRide(supabase as never, {
      actionId: "action-1",
      rideId: "ride-1",
      userId: "driver-1",
      input: {
        originZoneName: "1er arrondissement",
        departureAt: "2099-06-15T08:30:00.000Z",
        seatsTotal: 3,
        note: "Nouveau départ",
      },
    });

    expect(result.ride).toEqual({
      id: "ride-1",
      originZoneName: "1er arrondissement",
      departureAt: "2099-06-15T08:00:00.000Z",
      seatsTotal: 3,
      seatsAvailable: 3,
      note: "Nouveau départ",
      status: "open",
    });
    expect(result.ride).not.toHaveProperty("driver_user_id");
    expect(result.ride).not.toHaveProperty("action_id");
    expect(supabase.rpc).toHaveBeenCalledWith("update_action_ride_details", expect.any(Object));
  });

  it.each(["closed", "cancelled"] as const)("refuses a %s ride before calling the update RPC", async (status) => {
    const supabase = makeSupabase({ ...baseRide, status });

    await expect(updateActionRide(supabase as never, {
      actionId: "action-1",
      rideId: "ride-1",
      userId: "driver-1",
      input: {
        originZoneName: "1er arrondissement",
        departureAt: "2099-06-15T08:30:00.000Z",
        seatsTotal: 3,
        note: null,
      },
    })).rejects.toMatchObject({ status: 409, message: "Ce trajet n'est plus ouvert." });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
