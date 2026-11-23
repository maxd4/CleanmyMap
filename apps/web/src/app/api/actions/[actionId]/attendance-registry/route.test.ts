import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  loadAction: vi.fn(),
  identity: vi.fn(),
  organizers: vi.fn(),
  canManage: vi.fn(),
  client: vi.fn(),
  list: vi.fn(),
  listTeams: vi.fn(),
  mutate: vi.fn(),
  mutateTeam: vi.fn(),
  clerk: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: mocks.access }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadAction }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.identity }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadActionOrganizerRowsForAction: mocks.organizers }));
vi.mock("@/lib/actions/permissions", () => ({ canManageAction: mocks.canManage }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.client }));
vi.mock("@/lib/actions/participation/attendance-registry", () => ({ listActionAttendanceEntries: mocks.list, listActionAttendanceTeams: mocks.listTeams, mutateActionAttendanceEntry: mocks.mutate, mutateActionAttendanceTeam: mocks.mutateTeam }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mocks.clerk }));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ actionId: "action-1" }) };

describe("private action attendance registry routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ ok: true, userId: "clerk-manager" });
    mocks.client.mockReturnValue({});
    mocks.loadAction.mockResolvedValue({ id: "action-1", created_by_clerk_id: "clerk-owner", action_phase: "pre_action", status: "approved" });
    mocks.identity.mockResolvedValue({ role: "benevole", activeRole: "benevole" });
    mocks.organizers.mockResolvedValue([{ organizer_clerk_id: "clerk-manager" }]);
    mocks.canManage.mockReturnValue(true);
    mocks.list.mockResolvedValue([]);
    mocks.listTeams.mockResolvedValue([]);
    mocks.clerk.mockResolvedValue({ users: { getUser: vi.fn().mockResolvedValue({ id: "user_123" }) } });
  });

  it("rejects anonymous reads before constructing a privileged client", async () => {
    mocks.access.mockResolvedValue({ ok: false });
    const response = await GET(new Request("https://example.test"), context);
    expect(response.status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("rejects a non-organizer before reading nominative entries", async () => {
    mocks.canManage.mockReturnValue(false);
    const response = await GET(new Request("https://example.test"), context);
    expect(response.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("maps optimistic revision conflicts to HTTP 409", async () => {
    mocks.mutate.mockRejectedValue(Object.assign(new Error("revision_conflict"), { code: "40001" }));
    const response = await POST(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10031", operation: "rename", entryId: "fb144215-e3a8-4537-a0eb-895c42763ac3", expectedRevision: 2, displayLabel: "Nom" }),
    }), context);
    expect(response.status).toBe(409);
  });

  it("maps duplicate Clerk links to HTTP 409 without retrying a merge", async () => {
    mocks.mutate.mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));
    const response = await POST(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10031", operation: "link", entryId: "fb144215-e3a8-4537-a0eb-895c42763ac3", expectedRevision: 2, clerkUserId: "user_123" }),
    }), context);
    expect(response.status).toBe(409);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it("returns declared counts only after organizer authorization", async () => {
    mocks.loadAction.mockResolvedValue({ id: "action-1", created_by_clerk_id: "clerk-owner", action_phase: "post_action", status: "approved", volunteers_count: 7, adult_count: 4, retired_count: 1, children_count: 2, event_start_at: "2026-10-21T09:00:00.000Z" });
    const response = await GET(new Request("https://example.test"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ declared: { total: 7, adults: 4, retired: 1, children: 2 }, canMarkPresent: true });
    expect(mocks.list).toHaveBeenCalledWith({}, "action-1");
  });

  it("gates pointage on the scheduled event start timestamp", async () => {
    mocks.loadAction.mockResolvedValue({ id: "action-1", created_by_clerk_id: "clerk-owner", action_phase: "pre_action", status: "approved", event_start_at: "2030-10-21T09:00:00.000Z" });
    const response = await GET(new Request("https://example.test"), context);
    expect(await response.json()).toMatchObject({ canMarkPresent: false });
  });

  it("accepts an atomic add-as-present request through the authorized route", async () => {
    mocks.mutate.mockResolvedValue({ id: "entry-1", attendance_status: "present" });
    const response = await POST(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10031", operation: "add", displayLabel: "Sam", attendanceStatus: "present" }),
    }), context);
    expect(response.status).toBe(200);
    expect(mocks.mutate).toHaveBeenCalledWith({}, expect.objectContaining({ actionId: "action-1", payload: { display_label: "Sam", attendance_status: "present" } }));
  });

  it("returns teams in the same authorized, private registry snapshot", async () => {
    mocks.listTeams.mockResolvedValue([{ id: "team-1", action_id: "action-1", name: "Équipe A", normalized_name: "équipe a", leader_entry_id: null, revision: 1, member_entry_ids: [] }]);
    const response = await GET(new Request("https://example.test"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ teams: [{ id: "team-1", name: "Équipe A", member_entry_ids: [] }] });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("routes team creation through the authorized idempotent RPC owner", async () => {
    mocks.mutateTeam.mockResolvedValue({ alreadyProcessed: false, teams: [] });
    const response = await POST(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10031", operation: "team_create", teamName: "Équipe A" }),
    }), context);
    expect(response.status).toBe(200);
    expect(mocks.mutateTeam).toHaveBeenCalledWith({}, expect.objectContaining({
      actionId: "action-1", actorClerkId: "clerk-manager", operation: "team_create", payload: { name: "Équipe A" },
    }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("keeps team mutations behind the existing organizer AuthZ and maps duplicate team names", async () => {
    mocks.canManage.mockReturnValue(false);
    const denied = await POST(new Request("https://example.test", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10032", operation: "team_create", teamName: "Équipe A" }),
    }), context);
    expect(denied.status).toBe(403);
    expect(mocks.mutateTeam).not.toHaveBeenCalled();

    mocks.canManage.mockReturnValue(true);
    mocks.mutateTeam.mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));
    const conflict = await POST(new Request("https://example.test", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "b8ea39b4-30bb-44b8-a827-a59371b10033", operation: "team_create", teamName: "Équipe A" }),
    }), context);
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: "Une équipe porte déjà ce nom dans cette action." });
  });
});
