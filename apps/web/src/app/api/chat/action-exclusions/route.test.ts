import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());
const organizerMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());
const appendAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: organizerMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/actions/moderation-audit", () => ({
  appendActionModerationAudit: appendAuditMock,
}));

const action = {
  id: "action-1",
  created_by_clerk_id: "moderator-1",
  action_date: "2099-01-01",
  event_start_time: "10:00",
  action_phase: "pre_action" as const,
  status: "pending" as const,
  moderation_visibility: "visible" as const,
  published_at: "2098-12-01T10:00:00.000Z",
};

function buildSupabaseMock() {
  const conversationQuery = {
    select: vi.fn(() => conversationQuery),
    eq: vi.fn(() => conversationQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "conversation-1" },
      error: null,
    }),
  };
  const exclusionsQuery = {
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { conversation_id: "conversation-1", user_id: "target-1", active: true },
          error: null,
        }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                conversation_id: "conversation-1",
                user_id: "target-1",
                active: false,
                reinstated_at: "2098-12-03T10:00:00.000Z",
              },
              error: null,
            }),
          })),
        })),
      })),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "action_conversations") return conversationQuery;
      if (table === "action_conversation_exclusions") return exclusionsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("/api/chat/action-exclusions audit contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "moderator-1" });
    identityMock.mockResolvedValue({ userId: "moderator-1", activeRole: "benevole" });
    loadActionMock.mockResolvedValue(action);
    organizerMock.mockResolvedValue([]);
    appendAuditMock.mockResolvedValue(undefined);
  });

  it("refuse un utilisateur ordinaire qui fournit l'identifiant d'une action tierce", async () => {
    authMock.mockResolvedValue({ userId: "member-2" });
    identityMock.mockResolvedValue({ userId: "member-2", activeRole: "benevole" });
    serverMock.mockReturnValue(buildSupabaseMock());
    const { GET, POST } = await import("./route");

    const getResponse = await GET(new Request(
      "http://localhost/api/chat/action-exclusions?actionId=action-1",
    ));
    const postResponse = await POST(new Request("http://localhost/api/chat/action-exclusions", {
      method: "POST",
      body: JSON.stringify({ actionId: "action-1", userId: "target-1" }),
    }));

    expect(getResponse.status).toBe(403);
    expect(postResponse.status).toBe(403);
    expect(appendAuditMock).not.toHaveBeenCalled();
  });

  it("audits exclusion, reintroduction, and a later exclusion independently", async () => {
    const supabase = buildSupabaseMock();
    serverMock.mockReturnValue(supabase);
    const { PATCH, POST } = await import("./route");

    const excludeResponse = await POST(new Request("http://localhost/api/chat/action-exclusions", {
      method: "POST",
      body: JSON.stringify({ actionId: "action-1", userId: "target-1", reason: "Règle de discussion" }),
    }));
    expect(excludeResponse.status).toBe(201);

    const reinstateResponse = await PATCH(new Request("http://localhost/api/chat/action-exclusions", {
      method: "PATCH",
      body: JSON.stringify({ actionId: "action-1", userId: "target-1", reason: "Retour autorisé" }),
    }));
    expect(reinstateResponse.status).toBe(200);

    const excludeAgainResponse = await POST(new Request("http://localhost/api/chat/action-exclusions", {
      method: "POST",
      body: JSON.stringify({ actionId: "action-1", userId: "target-1", reason: "Nouvel abus" }),
    }));
    expect(excludeAgainResponse.status).toBe(201);

    expect(appendAuditMock).toHaveBeenCalledTimes(3);
    expect(appendAuditMock.mock.calls.map(([entry]) => entry.operation)).toEqual([
      "exclude_action_conversation_user",
      "reinstate_action_conversation_user",
      "exclude_action_conversation_user",
    ]);
    expect(appendAuditMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      actorUserId: "moderator-1",
      targetActionId: "action-1",
      targetUserId: "target-1",
      details: { conversationId: "conversation-1" },
    }));
    expect(appendAuditMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      actorUserId: "moderator-1",
      targetActionId: "action-1",
      targetUserId: "target-1",
      previousValue: { active: true },
      newValue: expect.objectContaining({ active: false }),
      details: { conversationId: "conversation-1" },
    }));
  });
});
