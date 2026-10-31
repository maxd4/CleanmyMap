import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActionBuddyConflictError,
  ActionBuddyForbiddenError,
  ActionBuddyNotFoundError,
  acceptActionBuddyProposal,
  cancelActionBuddyRequest,
  createActionBuddyProposal,
  createActionBuddyRequest,
  declineActionBuddyProposal,
  rejectActionBuddyProposal,
  removeActionBuddyAvailability,
  resolveActionBuddyContact,
  setActionBuddyAvailability,
  withdrawActionBuddyProposal,
} from "./action-buddy";

const fetchActionRowByIdMock = vi.hoisted(() => vi.fn());
const readActionRegistrationRecordMock = vi.hoisted(() => vi.fn());

vi.mock("./store-queries", () => ({ fetchActionRowById: fetchActionRowByIdMock }));
vi.mock("./participation/registration-records", () => ({ readActionRegistrationRecord: readActionRegistrationRecordMock }));

type Result = { data: unknown; error: { code?: string; message?: string } | null };
type TablePlan = {
  maybeSingle?: Result[];
  single?: Result[];
  list?: Result[];
};

function ok(data: unknown): Result { return { data, error: null }; }
function fail(error: { code?: string; message?: string }): Result { return { data: null, error }; }

function createQuery(plan: TablePlan) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = () => query;
  for (const method of ["select", "eq", "neq", "in", "order", "limit", "insert", "upsert", "update", "delete"]) {
    query[method] = vi.fn(chain);
  }
  query.maybeSingle = vi.fn(async () => plan.maybeSingle?.shift() ?? ok(null));
  query.single = vi.fn(async () => plan.single?.shift() ?? ok(null));
  query.then = vi.fn((resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => (
    Promise.resolve(plan.list?.shift() ?? ok([])).then(resolve, reject)
  ));
  return query;
}

function createSupabase(plans: Record<string, TablePlan> = {}, rpcResult: Result = ok([])) {
  const queries: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  const from = vi.fn((table: string) => {
    const query = createQuery(plans[table] ?? {});
    queries[table] = query;
    return query;
  });
  const rpc = vi.fn(async () => rpcResult);
  return { client: { from, rpc } as never, from, rpc, queries };
}

const action = {
  id: "action-1",
  action_date: "2999-01-01",
  event_start_time: "10:00",
  action_phase: "pre_action",
  status: "approved",
  review_state: "approved",
  moderation_visibility: "visible",
  published_at: "2998-12-01T10:00:00.000Z",
  access_mode: "public",
  preparation_data: {},
} as Record<string, unknown>;

const request = {
  id: "request-1",
  action_id: "action-1",
  requester_user_id: "requester-1",
  status: "open",
  matched_mentor_user_id: null,
  created_at: "2998-12-02T10:00:00.000Z",
  updated_at: "2998-12-02T10:00:00.000Z",
  matched_at: null,
};

const proposal = {
  id: "proposal-1",
  request_id: "request-1",
  mentor_user_id: "mentor-1",
  status: "pending",
  created_at: "2998-12-03T10:00:00.000Z",
  resolved_at: null,
};

function installDefaults() {
  fetchActionRowByIdMock.mockResolvedValue(action);
  readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
}

describe("Action Buddy lifecycle behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDefaults();
  });

  it("creates a confirmed request, writes the requester identity and maps a uniqueness race", async () => {
    const supabase = createSupabase({ action_buddy_requests: { single: [ok(request)] } });
    await expect(createActionBuddyRequest(supabase.client, { actionId: "action-1", requesterUserId: "requester-1" })).resolves.toEqual(request);
    expect(supabase.queries.action_buddy_requests.insert).toHaveBeenCalledWith({ action_id: "action-1", requester_user_id: "requester-1", status: "open" });

    const conflict = createSupabase({ action_buddy_requests: { single: [fail({ code: "23505" })] } });
    await expect(createActionBuddyRequest(conflict.client, { actionId: "action-1", requesterUserId: "requester-1" })).rejects.toBeInstanceOf(ActionBuddyConflictError);
  });

  it.each([
    ["invite_link", "Action buddy conflict: action is not eligible."],
    ["post_action", "Action buddy conflict: action is not eligible."],
  ])("rejects an ineligible action before registration or mutation (%s)", async (accessMode, message) => {
    fetchActionRowByIdMock.mockResolvedValue({ ...action, access_mode: accessMode, action_phase: accessMode === "post_action" ? "post_action_complete" : "pre_action" });
    const supabase = createSupabase();
    await expect(createActionBuddyRequest(supabase.client, { actionId: "action-1", requesterUserId: "requester-1" })).rejects.toThrow(message);
    expect(readActionRegistrationRecordMock).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails closed for an unregistered requester and supports idempotent availability removal", async () => {
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "pending" });
    await expect(createActionBuddyRequest(createSupabase().client, { actionId: "action-1", requesterUserId: "requester-1" })).rejects.toThrow("confirmed registration required");

    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    const available = createSupabase({ action_buddy_availability: { single: [ok({ action_id: "action-1", mentor_user_id: "mentor-1" })] } });
    await expect(setActionBuddyAvailability(available.client, { actionId: "action-1", mentorUserId: "mentor-1" })).resolves.toMatchObject({ mentor_user_id: "mentor-1" });
    expect(available.queries.action_buddy_availability.upsert).toHaveBeenCalledWith(
      { action_id: "action-1", mentor_user_id: "mentor-1" },
      { onConflict: "action_id,mentor_user_id" },
    );

    const removed = createSupabase({ action_buddy_availability: { maybeSingle: [ok(null)] } });
    await expect(removeActionBuddyAvailability(removed.client, { actionId: "action-1", mentorUserId: "mentor-1" })).resolves.toEqual({ removed: false });
  });

  it("creates only an available mentor proposal and rejects self, unavailable and duplicate proposals", async () => {
    const supabase = createSupabase({
      action_buddy_requests: { maybeSingle: [ok(request)] },
      action_buddy_availability: { maybeSingle: [ok({ action_id: "action-1", mentor_user_id: "mentor-1" })] },
      action_buddy_proposals: { single: [ok(proposal)] },
    });
    await expect(createActionBuddyProposal(supabase.client, { actionId: "action-1", requestId: "request-1", mentorUserId: "mentor-1" })).resolves.toEqual(proposal);
    expect(supabase.queries.action_buddy_proposals.insert).toHaveBeenCalledWith({ request_id: "request-1", mentor_user_id: "mentor-1", status: "pending" });

    await expect(createActionBuddyProposal(createSupabase({ action_buddy_requests: { maybeSingle: [ok({ ...request, requester_user_id: "mentor-1" })] } }).client, { actionId: "action-1", requestId: "request-1", mentorUserId: "mentor-1" })).rejects.toThrow("self-match is forbidden");
    const unavailable = createSupabase({ action_buddy_requests: { maybeSingle: [ok(request)] }, action_buddy_availability: { maybeSingle: [ok(null)] } });
    await expect(createActionBuddyProposal(unavailable.client, { actionId: "action-1", requestId: "request-1", mentorUserId: "mentor-1" })).rejects.toThrow("mentor is not available");
    const duplicate = createSupabase({ action_buddy_requests: { maybeSingle: [ok(request)] }, action_buddy_availability: { maybeSingle: [ok({})] }, action_buddy_proposals: { single: [fail({ code: "23505" })] } });
    await expect(createActionBuddyProposal(duplicate.client, { actionId: "action-1", requestId: "request-1", mentorUserId: "mentor-1" })).rejects.toThrow("pending proposal already exists");
  });

  it("cancels an open request once, preserves idempotence and fails on an optimistic race", async () => {
    const supabase = createSupabase({ action_buddy_requests: { maybeSingle: [ok(request), ok(null)] } });
    await expect(cancelActionBuddyRequest(supabase.client, { actionId: "action-1", requesterUserId: "requester-1" })).rejects.toThrow("request changed while cancelling");

    const already = createSupabase({ action_buddy_requests: { maybeSingle: [ok({ ...request, status: "cancelled" })] } });
    await expect(cancelActionBuddyRequest(already.client, { actionId: "action-1", requesterUserId: "requester-1" })).resolves.toMatchObject({ alreadyCancelled: true });
    const missing = createSupabase({ action_buddy_requests: { maybeSingle: [ok(null)] } });
    await expect(cancelActionBuddyRequest(missing.client, { actionId: "action-1", requesterUserId: "requester-1" })).rejects.toBeInstanceOf(ActionBuddyNotFoundError);
  });

  it("keeps proposal decisions owner-scoped, terminal and retry-safe", async () => {
    const withdrawn = createSupabase({ action_buddy_proposals: { maybeSingle: [ok({ ...proposal, status: "withdrawn" })] }, action_buddy_requests: { maybeSingle: [ok(request)] } });
    await expect(withdrawActionBuddyProposal(withdrawn.client, { actionId: "action-1", proposalId: "proposal-1", mentorUserId: "mentor-1" })).resolves.toMatchObject({ alreadyWithdrawn: true });

    const forbidden = createSupabase({ action_buddy_proposals: { maybeSingle: [ok(proposal)] }, action_buddy_requests: { maybeSingle: [ok(request)] } });
    await expect(declineActionBuddyProposal(forbidden.client, { actionId: "action-1", proposalId: "proposal-1", mentorUserId: "other" })).rejects.toBeInstanceOf(ActionBuddyForbiddenError);
    const forbiddenRequester = createSupabase({ action_buddy_proposals: { maybeSingle: [ok(proposal)] }, action_buddy_requests: { maybeSingle: [ok(request)] } });
    await expect(rejectActionBuddyProposal(forbiddenRequester.client, { actionId: "action-1", proposalId: "proposal-1", requesterUserId: "other" })).rejects.toBeInstanceOf(ActionBuddyForbiddenError);

    const declined = createSupabase({ action_buddy_proposals: { maybeSingle: [ok({ ...proposal, status: "declined" })] }, action_buddy_requests: { maybeSingle: [ok(request)] } });
    await expect(rejectActionBuddyProposal(declined.client, { actionId: "action-1", proposalId: "proposal-1", requesterUserId: "requester-1" })).resolves.toMatchObject({ alreadyDeclined: true });
  });

  it("maps accept RPC outcomes and exposes contact only to a matched participant", async () => {
    const accepted = createSupabase(
      { action_buddy_proposals: { maybeSingle: [ok(proposal)] }, action_buddy_requests: { maybeSingle: [ok(request)] } },
      ok({ status: "matched", request_id: "request-1" }),
    );
    await expect(acceptActionBuddyProposal(accepted.client, { actionId: "action-1", proposalId: "proposal-1", requesterUserId: "requester-1" })).resolves.toEqual({ status: "matched", request_id: "request-1" });
    expect(accepted.rpc).toHaveBeenCalledWith("accept_action_buddy_proposal", { p_proposal_id: "proposal-1" });

    const rpcConflict = createSupabase({ action_buddy_proposals: { maybeSingle: [ok(proposal)] }, action_buddy_requests: { maybeSingle: [ok(request)] } }, fail({ message: "action_buddy_conflict: already matched" }));
    await expect(acceptActionBuddyProposal(rpcConflict.client, { actionId: "action-1", proposalId: "proposal-1", requesterUserId: "requester-1" })).rejects.toBeInstanceOf(ActionBuddyConflictError);

    const matched = { ...request, status: "matched", matched_mentor_user_id: "mentor-1" };
    const requester = createSupabase({ action_buddy_requests: { maybeSingle: [ok(matched)] } });
    await expect(resolveActionBuddyContact(requester.client, { actionId: "action-1", requestId: "request-1", userId: "requester-1" })).resolves.toMatchObject({ recipientUserId: "mentor-1" });
    const stranger = createSupabase({ action_buddy_requests: { maybeSingle: [ok(matched)] } });
    await expect(resolveActionBuddyContact(stranger.client, { actionId: "action-1", requestId: "request-1", userId: "stranger" })).rejects.toBeInstanceOf(ActionBuddyForbiddenError);
  });
});
