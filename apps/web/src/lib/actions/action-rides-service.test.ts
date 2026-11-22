import { beforeEach, describe, expect, it, vi } from "vitest";

const loadActionById = vi.hoisted(() => vi.fn());
const readActionRegistrationRecord = vi.hoisted(() => vi.fn());
const isPublicActionReferenceAvailable = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById }));
vi.mock("@/lib/actions/participation/registration-records", () => ({ readActionRegistrationRecord }));
vi.mock("@/lib/chat/action-sharing", () => ({ isPublicActionReferenceAvailable }));

import {
  ActionRideServiceError,
  createActionRide,
  createActionRideRequest,
  decideActionRideRequest,
  listActionRides,
  resolveActionRideContact,
  transitionActionRide,
  updateActionRide,
  type ActionRideRow,
} from "./action-rides-service";

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

type QueryResult = { data: unknown; error: { message?: string } | null };
type SupabaseFixture = {
  select?: Record<string, QueryResult>;
  maybeSingle?: Record<string, QueryResult>;
  single?: Record<string, QueryResult>;
  rpc?: Record<string, QueryResult>;
};

function makeSupabase(ride = baseRide, fixture: SupabaseFixture = {}) {
  const operations: Array<{ table: string; method: string; args: unknown[] }> = [];
  const defaultResult = (table: string): QueryResult => ({
    data: table === "action_rides" ? [ride] : [],
    error: null,
  });
  const rpcResult = (name: string): QueryResult => fixture.rpc?.[name] ?? (name === "update_action_ride_details"
    ? { data: { ...ride, note: "Nouveau départ" }, error: null }
    : name === "action_ride_capacity"
      ? { data: [{ ride_id: ride.id, seats_total: ride.seats_total, seats_reserved: 0, seats_available: ride.seats_total }], error: null }
      : { data: [{ ride_id: ride.id, status: "closed", resolved_requests: 0, notified_passengers: 0 }], error: null });
  const from = vi.fn((table: string) => {
    const query = {
      select: (...args: unknown[]) => { operations.push({ table, method: "select", args }); return query; },
      eq: (...args: unknown[]) => { operations.push({ table, method: "eq", args }); return query; },
      in: (...args: unknown[]) => { operations.push({ table, method: "in", args }); return query; },
      order: (...args: unknown[]) => { operations.push({ table, method: "order", args }); return query; },
      limit: (...args: unknown[]) => { operations.push({ table, method: "limit", args }); return query; },
      insert: (...args: unknown[]) => { operations.push({ table, method: "insert", args }); return query; },
      maybeSingle: async () => fixture.maybeSingle?.[table] ?? { data: ride, error: null },
      single: async () => fixture.single?.[table] ?? { data: table === "action_rides" ? ride : { ...baseRide, id: "request-1", ride_id: ride.id, passenger_user_id: "passenger-1", status: "pending" }, error: null },
      then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(fixture.select?.[table] ?? defaultResult(table)).then(resolve, reject),
    };
    return query;
  });
  const rpc = vi.fn(async (name: string) => rpcResult(name));
  return { from, rpc, operations };
}

const rideInput = {
  originZoneName: "1er arrondissement",
  departureAt: "2099-06-15T08:30:00.000Z",
  seatsTotal: 3,
  note: "Départ groupé",
};
const requestInput = { seatsRequested: 2, message: "Je peux aider au trajet." };

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

describe("action ride service business paths [EXECUTED_BEHAVIOR]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadActionById.mockResolvedValue(action);
    readActionRegistrationRecord.mockResolvedValue({ registration_status: "confirmed" });
    isPublicActionReferenceAvailable.mockReturnValue(true);
  });

  it.each([
    ["missing", null, 404],
    ["mismatched identity", { ...action, id: "another-action" }, 404],
    ["not a pre-action", { ...action, action_phase: "post_action_complete" }, 403],
    ["unpublished", { ...action, published_at: null }, 403],
    ["hidden", { ...action, moderation_visibility: "hidden" }, 403],
    ["rejected", { ...action, status: "rejected" }, 403],
    ["cancelled", { ...action, status: "cancelled" }, 403],
    ["invite link", { ...action, access_mode: "invite_link" }, 403],
    ["pending review", { ...action, review_state: "pending" }, 403],
  ])("rejects a ride mutation for an action that is %s", async (_label, actionState, status) => {
    loadActionById.mockResolvedValue(actionState);
    const supabase = makeSupabase();

    await expect(createActionRide(supabase as never, { actionId: "action-1", userId: "driver-1", input: rideInput }))
      .rejects.toMatchObject({ status });
    expect(readActionRegistrationRecord).not.toHaveBeenCalled();
    expect(supabase.operations.filter(({ method }) => method === "insert")).toHaveLength(0);
  });

  it("requires a confirmed registration and a not-yet-started action before a new ride", async () => {
    const supabase = makeSupabase();
    readActionRegistrationRecord.mockResolvedValueOnce({ registration_status: "pending" });
    await expect(createActionRide(supabase as never, { actionId: "action-1", userId: "driver-1", input: rideInput }))
      .rejects.toMatchObject({ status: 403 });
    expect(supabase.operations.some(({ method }) => method === "insert")).toBe(false);

    isPublicActionReferenceAvailable.mockReturnValue(false);
    await expect(createActionRide(supabase as never, { actionId: "action-1", userId: "driver-1", input: rideInput }))
      .rejects.toMatchObject({ status: 409 });
    expect(supabase.operations.some(({ method }) => method === "insert")).toBe(false);
  });

  it("validates before inserting and maps a successful ride insert", async () => {
    const invalid = makeSupabase();
    await expect(createActionRide(invalid as never, { actionId: "action-1", userId: "driver-1", input: { ...rideInput, seatsTotal: 0 } }))
      .rejects.toMatchObject({ status: 422 });
    expect(invalid.operations.some(({ method }) => method === "insert")).toBe(false);

    const persistedRide = { ...baseRide, origin_zone_name: "1er arrondissement", note: "Départ groupé" };
    const supabase = makeSupabase(baseRide, { single: { action_rides: { data: persistedRide, error: null } } });
    await expect(createActionRide(supabase as never, { actionId: "action-1", userId: "driver-1", input: rideInput }))
      .resolves.toEqual({ ride: persistedRide });
    expect(supabase.operations.find(({ method }) => method === "insert")?.args[0]).toMatchObject({
      action_id: "action-1", driver_user_id: "driver-1", status: "open", seats_total: 3,
    });
  });

  it("does not hide a failed ride insert behind a local or follow-up write", async () => {
    const supabase = makeSupabase(baseRide, { single: { action_rides: { data: null, error: { message: "duplicate ride" } } } });
    await expect(createActionRide(supabase as never, { actionId: "action-1", userId: "driver-1", input: rideInput }))
      .rejects.toMatchObject({ status: 409, message: "Le trajet n'a pas pu être créé." });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.operations.filter(({ method }) => method === "insert")).toHaveLength(1);
  });

  it("lists an empty set without querying capacities, private requests, or profiles", async () => {
    const supabase = makeSupabase(baseRide, { select: { action_rides: { data: [], error: null } } });
    await expect(listActionRides(supabase as never, { actionId: "action-1", userId: "member-1" }))
      .resolves.toEqual({ actionId: "action-1", rides: [] });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.operations.some(({ table }) => table === "action_ride_requests" || table === "profiles")).toBe(false);
  });

  it("projects own requests to a passenger and the full roster only to the driver", async () => {
    const requests = [
      { id: "mine", ride_id: "ride-1", passenger_user_id: "passenger-1", seats_requested: 1, message: "à moi", status: "pending", created_at: "1", updated_at: "1", resolved_at: null },
      { id: "other", ride_id: "ride-1", passenger_user_id: "passenger-2", seats_requested: 2, message: "privé", status: "accepted", created_at: "2", updated_at: "2", resolved_at: null },
    ];
    const supabase = makeSupabase(baseRide, {
      select: {
        action_rides: { data: [baseRide], error: null },
        action_ride_requests: { data: requests, error: null },
        profiles: { data: [{ id: "driver-1", display_name: " Conducteur ", handle: "driver" }, { id: "passenger-1", display_name: null, handle: "passenger" }, { id: "passenger-2", display_name: "Passager 2", handle: null }], error: null },
      },
      rpc: { action_ride_capacity: { data: [{ ride_id: "ride-1", seats_total: 3, seats_reserved: 2, seats_available: -1 }], error: null } },
    });

    const passenger = await listActionRides(supabase as never, { actionId: "action-1", userId: "passenger-1" });
    expect(passenger.rides[0]).toMatchObject({ driverDisplayName: "Conducteur", isDriver: false, seatsAvailable: 0 });
    expect(passenger.rides[0]?.myRequests).toEqual([{ id: "mine", seatsRequested: 1, message: "à moi", status: "pending", resolvedAt: null }]);
    expect(passenger.rides[0]?.requests).toEqual([]);

    const driver = await listActionRides(supabase as never, { actionId: "action-1", userId: "driver-1" });
    expect(driver.rides[0]?.requests).toHaveLength(2);
    expect(driver.rides[0]?.requests[1]).toMatchObject({ id: "other", passengerDisplayName: "Passager 2" });
    expect(JSON.stringify(passenger)).not.toContain("passenger_user_id");
  });

  it.each([
    ["ride list", "action_rides", { action_rides: { data: null, error: { message: "failed" } } }],
    ["request list", "action_ride_requests", { action_ride_requests: { data: null, error: { message: "failed" } } }],
    ["profile list", "profiles", { profiles: { data: null, error: { message: "failed" } } }],
  ])("returns a bounded service error when the %s read fails", async (_label, table, select) => {
    const supabase = makeSupabase(baseRide, { select: { action_rides: { data: [baseRide], error: null }, ...select } });
    if (table === "action_ride_requests") {
      supabase.rpc.mockResolvedValue({ data: [{ ride_id: "ride-1", seats_total: 3, seats_reserved: 0, seats_available: 3 }], error: null });
    }
    await expect(listActionRides(supabase as never, { actionId: "action-1", userId: "member-1" }))
      .rejects.toMatchObject({ status: 409 });
  });

  it.each([
    ["RPC error", { data: null, error: { message: "failed" } }],
    ["missing row", { data: [], error: null }],
  ])("fails closed when ride capacity has a %s", async (_label, capacityResult) => {
    const supabase = makeSupabase(baseRide, { select: { action_rides: { data: [baseRide], error: null } }, rpc: { action_ride_capacity: capacityResult } });
    await expect(listActionRides(supabase as never, { actionId: "action-1", userId: "member-1" }))
      .rejects.toMatchObject({ status: 409 });
  });

  it("keeps ride updates owner-scoped and avoids RPC calls for invalid input", async () => {
    const otherDriver = makeSupabase({ ...baseRide, driver_user_id: "someone-else" });
    await expect(updateActionRide(otherDriver as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", input: rideInput }))
      .rejects.toMatchObject({ status: 403 });
    expect(otherDriver.rpc).not.toHaveBeenCalled();

    const invalid = makeSupabase();
    await expect(updateActionRide(invalid as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", input: { ...rideInput, seatsTotal: 0 } }))
      .rejects.toMatchObject({ status: 422 });
    expect(invalid.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["database error", { data: null, error: { message: "failed" } }],
    ["mismatched row", { data: { ...baseRide, id: "other-ride" }, error: null }],
    ["malformed row", { data: [baseRide], error: null }],
  ])("refuses to return an update projection after a %s", async (_label, rpcResult) => {
    const supabase = makeSupabase(baseRide, { rpc: { update_action_ride_details: rpcResult } });
    await expect(updateActionRide(supabase as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", input: rideInput }))
      .rejects.toMatchObject({ status: 409 });
  });

  it.each(["closed", "cancelled"] as const)("transitions a ride to %s through its canonical RPC", async (status) => {
    const supabase = makeSupabase();
    supabase.rpc.mockResolvedValueOnce({ data: [{ ride_id: "ride-1", status, resolved_requests: 2, notified_passengers: 1 }], error: null });
    await expect(transitionActionRide(supabase as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", status }))
      .resolves.toMatchObject({ ride_id: "ride-1", status });
    expect(supabase.rpc).toHaveBeenCalledWith("transition_action_ride", { p_ride_id: "ride-1", p_actor_user_id: "driver-1", p_status: status });
  });

  it("maps a transition failure and an empty RPC result without inventing a state", async () => {
    const failed = makeSupabase(baseRide, { rpc: { transition_action_ride: { data: null, error: { message: "failed" } } } });
    await expect(transitionActionRide(failed as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", status: "closed" }))
      .rejects.toMatchObject({ status: 409 });
    const empty = makeSupabase(baseRide, { rpc: { transition_action_ride: { data: [], error: null } } });
    await expect(transitionActionRide(empty as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", status: "closed" })).resolves.toBeNull();
  });

  it("refuses a self-request, a closed ride, and invalid request data before insertion", async () => {
    const selfRide = makeSupabase({ ...baseRide, driver_user_id: "passenger-1" });
    await expect(createActionRideRequest(selfRide as never, { actionId: "action-1", rideId: "ride-1", userId: "passenger-1", input: requestInput }))
      .rejects.toMatchObject({ status: 422 });
    expect(selfRide.operations.some(({ method }) => method === "insert")).toBe(false);

    const closedRide = makeSupabase({ ...baseRide, status: "closed" });
    await expect(createActionRideRequest(closedRide as never, { actionId: "action-1", rideId: "ride-1", userId: "passenger-1", input: requestInput }))
      .rejects.toMatchObject({ status: 409 });
    const invalid = makeSupabase();
    await expect(createActionRideRequest(invalid as never, { actionId: "action-1", rideId: "ride-1", userId: "passenger-1", input: { seatsRequested: 0 } }))
      .rejects.toMatchObject({ status: 422 });
    expect(invalid.operations.some(({ method }) => method === "insert")).toBe(false);
  });

  it("creates a pending passenger request and maps duplicate persistence conflicts", async () => {
    const requestRow = { id: "request-1", ride_id: "ride-1", passenger_user_id: "passenger-1", seats_requested: 2, message: "Je peux aider au trajet.", status: "pending", created_at: "now", updated_at: "now", resolved_at: null };
    const successful = makeSupabase(baseRide, { single: { action_ride_requests: { data: requestRow, error: null } } });
    await expect(createActionRideRequest(successful as never, { actionId: "action-1", rideId: "ride-1", userId: "passenger-1", input: requestInput }))
      .resolves.toEqual({ request: requestRow });
    expect(successful.operations.find(({ method }) => method === "insert")?.args[0]).toMatchObject({ ride_id: "ride-1", passenger_user_id: "passenger-1", status: "pending" });

    const duplicate = makeSupabase(baseRide, { single: { action_ride_requests: { data: null, error: { message: "duplicate" } } } });
    await expect(createActionRideRequest(duplicate as never, { actionId: "action-1", rideId: "ride-1", userId: "passenger-1", input: requestInput }))
      .rejects.toMatchObject({ status: 409, message: "La demande n'a pas pu être créée. Elle existe peut-être déjà." });
  });

  it.each([
    ["accept", "accept_action_ride_request", true],
    ["decline", "decline_action_ride_request", true],
    ["withdraw", "withdraw_action_ride_request", false],
  ] as const)("routes %s through the matching state transition RPC", async (decision, rpcName, requiresFuture) => {
    isPublicActionReferenceAvailable.mockReturnValue(true);
    const supabase = makeSupabase();
    supabase.rpc.mockResolvedValueOnce({ data: [{ request_id: "request-1", status: decision === "accept" ? "accepted" : "declined" }], error: null });
    await expect(decideActionRideRequest(supabase as never, { actionId: "action-1", rideId: "ride-1", requestId: "request-1", userId: "actor-1", decision }))
      .resolves.toMatchObject({ request_id: "request-1" });
    expect(supabase.rpc).toHaveBeenCalledWith(rpcName, { p_request_id: "request-1", p_actor_user_id: "actor-1" });
    expect(isPublicActionReferenceAvailable).toHaveBeenCalledTimes(requiresFuture ? 1 : 0);
  });

  it("does not call the withdrawal RPC for an already-cancelled ride", async () => {
    const supabase = makeSupabase({ ...baseRide, status: "cancelled" });
    await expect(decideActionRideRequest(supabase as never, { actionId: "action-1", rideId: "ride-1", requestId: "request-1", userId: "passenger-1", decision: "withdraw" }))
      .rejects.toMatchObject({ status: 409 });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("resolves contact only for an accepted peer and uses safe display fallbacks", async () => {
    const accepted = { id: "request-1", ride_id: "ride-1", passenger_user_id: "passenger-1", seats_requested: 1, message: null, status: "accepted", created_at: "now", updated_at: "now", resolved_at: "now" };
    const supabase = makeSupabase(baseRide, {
      select: {
        action_ride_requests: { data: [accepted], error: null },
        profiles: { data: [{ id: "passenger-1", display_name: " ", handle: "passenger" }], error: null },
      },
    });
    await expect(resolveActionRideContact(supabase as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", requestId: "request-1" }))
      .resolves.toEqual({ recipient: { id: "passenger-1", displayName: "passenger", handle: "passenger" } });
    expect(supabase.operations).toContainEqual({ table: "action_ride_requests", method: "eq", args: ["id", "request-1"] });

    const notAccepted = makeSupabase(baseRide, { select: { action_ride_requests: { data: [], error: null } } });
    await expect(resolveActionRideContact(notAccepted as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1" }))
      .rejects.toMatchObject({ status: 403 });
  });

  it("allows the accepted passenger to reach the driver and denies unaccepted peers", async () => {
    const accepted = { id: "request-1", ride_id: "ride-1", passenger_user_id: "passenger-1", seats_requested: 1, message: null, status: "accepted", created_at: "now", updated_at: "now", resolved_at: "now" };
    const supabase = makeSupabase(baseRide, {
      select: {
        action_ride_requests: { data: [accepted], error: null },
        profiles: { data: [{ id: "driver-1", display_name: null, handle: null }], error: null },
      },
    });
    await expect(resolveActionRideContact(supabase as never, { actionId: "action-1", rideId: "ride-1", userId: "passenger-1" }))
      .resolves.toEqual({ recipient: { id: "driver-1", displayName: "Membre", handle: null } });
    const other = makeSupabase(baseRide, { select: { action_ride_requests: { data: [accepted], error: null } } });
    await expect(resolveActionRideContact(other as never, { actionId: "action-1", rideId: "ride-1", userId: "stranger" }))
      .rejects.toMatchObject({ status: 403 });
  });

  it("maps ride lookup and profile lookup failures to safe service errors", async () => {
    const missing = makeSupabase(baseRide, { maybeSingle: { action_rides: { data: null, error: null } } });
    await expect(transitionActionRide(missing as never, { actionId: "action-1", rideId: "missing", userId: "driver-1", status: "closed" }))
      .rejects.toMatchObject({ status: 404 });
    const readFailure = makeSupabase(baseRide, { maybeSingle: { action_rides: { data: null, error: { message: "unavailable" } } } });
    await expect(transitionActionRide(readFailure as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1", status: "closed" }))
      .rejects.toMatchObject({ status: 409 });
    const profileFailure = makeSupabase(baseRide, {
      select: { action_ride_requests: { data: [{ id: "r", ride_id: "ride-1", passenger_user_id: "passenger-1", status: "accepted" }], error: null }, profiles: { data: null, error: { message: "profile unavailable" } } },
    });
    await expect(resolveActionRideContact(profileFailure as never, { actionId: "action-1", rideId: "ride-1", userId: "driver-1" }))
      .rejects.toMatchObject({ status: 409 });
  });

  it("exposes typed service errors for caller-side status mapping", () => {
    expect(new ActionRideServiceError("denied", 403)).toMatchObject({ name: "ActionRideServiceError", status: 403 });
  });
});
