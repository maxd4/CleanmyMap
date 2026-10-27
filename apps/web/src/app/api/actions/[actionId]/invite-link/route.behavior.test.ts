import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => vi.fn());
const identity = vi.hoisted(() => vi.fn());
const organizers = vi.hoisted(() => vi.fn());
const loadAction = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: access }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identity }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: organizers }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadAction }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn(() => ({ from, rpc })) }));

import { DELETE, GET, POST } from "./route";

const action = {
  id: "action-1",
  created_by_clerk_id: "owner-1",
  access_mode: "invite_link",
  action_phase: "pre_action",
};
type InviteContext = { params: Promise<{ actionId: string }> };
const context: InviteContext = { params: Promise.resolve({ actionId: "action-1" }) };
const request = (method = "GET") => new Request("https://cleanmymap.test/api/actions/action-1/invite-link", { method });
const getInvite = GET as unknown as (request: Request, context: InviteContext) => Promise<Response>;
const postInvite = POST as unknown as (request: Request, context: InviteContext) => Promise<Response>;
const deleteInvite = DELETE as unknown as (request: Request, context: InviteContext) => Promise<Response>;

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    created_at: "2026-10-27T10:00:00.000Z",
    revoked_at: null,
    expires_at: "2027-01-27T10:00:00.000Z",
    ...overrides,
  };
}

describe("action invitation management boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.mockResolvedValue({ ok: true, userId: "owner-1" });
    identity.mockResolvedValue({ userId: "owner-1", role: null, activeRole: null });
    organizers.mockResolvedValue([]);
    loadAction.mockResolvedValue(action);
    rpc.mockResolvedValue({ data: null, error: null });
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: invitationRow(), error: null }),
    };
    from.mockReturnValue(chain);
  });

  it("returns the active metadata projection without exposing token material", async () => {
    const response = await getInvite(request(), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok", active: true, createdAt: invitationRow().created_at, expiresAt: invitationRow().expires_at, revokedAt: null });
    expect(JSON.stringify(body)).not.toMatch(/token|hash|secret/iu);
  });

  it("creates and revokes a link only for the canonical owner", async () => {
    const created = await postInvite(request("POST"), context);
    expect(created.status).toBe(201);
    expect((await created.json()).url).toContain("/actions/invite/");
    expect(rpc).toHaveBeenCalledWith("create_action_invitation_link", expect.objectContaining({ p_action_id: "action-1", p_actor_id: "owner-1" }));

    const revoked = await deleteInvite(request("DELETE"), context);
    expect(revoked.status).toBe(200);
    expect(await revoked.json()).toEqual({ status: "ok", active: false });
    expect(rpc).toHaveBeenCalledWith("revoke_action_invitation_link", { p_action_id: "action-1", p_actor_id: "owner-1" });

    access.mockResolvedValueOnce({ ok: true, userId: "other-user" });
    identity.mockResolvedValueOnce({ userId: "other-user", role: null, activeRole: null });
    const forbidden = await postInvite(request("POST"), context);
    expect(forbidden.status).toBe(403);
  });

  it("preserves not-found and phase contracts without invoking mutation RPCs", async () => {
    loadAction.mockResolvedValueOnce(null);
    expect((await deleteInvite(request("DELETE"), context)).status).toBe(404);
    loadAction.mockResolvedValueOnce({ ...action, action_phase: "post_action_complete" });
    expect((await postInvite(request("POST"), context)).status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not turn provider or malformed projections into a successful response", async () => {
    from.mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "provider detail" } }) }) }) });
    const failedRead = await getInvite(request(), context);
    expect(failedRead.status).toBe(500);
    expect(JSON.stringify(await failedRead.json())).not.toContain("provider detail");

    from.mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { invalid: true }, error: null }) }) }) });
    const invalidProjection = await getInvite(request(), context);
    expect(invalidProjection.status).toBe(422);
    expect(JSON.stringify(await invalidProjection.json())).not.toContain("invalid");
  });
});
