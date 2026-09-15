import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSupabaseMock, type ChatMessageRow } from "./route.test.helpers";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const rlsClientMock = vi.hoisted(() => vi.fn());
const serverClientMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const reserveDiscussionMessageSlotMock = vi.hoisted(() => vi.fn());
const notificationsMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: rlsClientMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: serverClientMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));
vi.mock("@/lib/community/discussion-rate-limit", () => ({
  reserveDiscussionMessageSlot: reserveDiscussionMessageSlotMock,
  toDiscussionRateLimitErrorPayload: vi.fn(),
}));
vi.mock("@/lib/chat/chat-notifications", () => ({
  createChatNotificationsForMessage: notificationsMock,
}));

const profile = {
  id: "user-1",
  display_name: "Alex",
  handle: "alex",
  paris_arrondissement: null,
  role_label: "admin",
  metadata: null,
};

function message(overrides: Partial<ChatMessageRow> = {}): ChatMessageRow {
  return {
    id: "message-1",
    created_at: "2026-05-01T09:00:00.000Z",
    content: "Message admin",
    channel_type: "admin_elu",
    sender_id: "user-2",
    recipient_id: null,
    arrondissement_id: null,
    zone_name: null,
    topic_id: null,
    ...overrides,
  };
}

describe("admin_elu topics in the Chat API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    identityMock.mockResolvedValue({ activeRole: "admin" });
    verifyRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
      retryAfter: 0,
    });
    createServerRateLimitResponseMock.mockReturnValue(null);
    reserveDiscussionMessageSlotMock.mockResolvedValue({ allowed: true });
    notificationsMock.mockResolvedValue(undefined);
    serverClientMock.mockReturnValue({ service: true });
  });

  it.each(["admin", "max", "elu"] as const)(
    "%s can access the existing admin_elu channel",
    async (role) => {
      identityMock.mockResolvedValueOnce({ activeRole: role });
      const supabaseMock = buildSupabaseMock({
        profile,
        messages: [],
        insertedMessage: message({ sender_id: "user-1" }),
      });
      rlsClientMock.mockResolvedValue(supabaseMock.supabase);
      serverClientMock.mockReturnValue(supabaseMock.serviceSupabase);

      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/chat?channelType=admin_elu"),
      );

      expect(response.status).toBe(200);
      expect(supabaseMock.messagesQuery.eq).toHaveBeenCalledWith(
        "channel_type",
        "admin_elu",
      );
    },
  );

  it.each(["admin", "max", "elu"] as const)(
    "%s can create an admin_elu poll with the shared poll engine",
    async (role) => {
      identityMock.mockResolvedValueOnce({ activeRole: role });
      const poll = message({
        id: `poll-${role}`,
        sender_id: "user-1",
        topic_id: "arbitrages",
        message_kind: "poll",
        poll_options: [
          { id: `option-${role}-1`, position: 1, label: "Priorité A" },
          { id: `option-${role}-2`, position: 2, label: "Priorité B" },
        ],
      });
      const supabaseMock = buildSupabaseMock({
        profile: { ...profile, role_label: role },
        messages: [poll],
        insertedMessage: poll,
        pollMessage: poll,
      });
      rlsClientMock.mockResolvedValue(supabaseMock.supabase);
      serverClientMock.mockReturnValue(supabaseMock.serviceSupabase);

      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channelType: "admin_elu",
            topicId: "arbitrages",
            messageKind: "poll",
            pollOptions: ["Priorité A", "Priorité B"],
            content: "Quelle priorité retenir ?",
          }),
        }),
      );

      expect(response.status).toBe(201);
      expect(supabaseMock.supabase.rpc).toHaveBeenCalledWith(
        "create_chat_poll_with_options",
        expect.objectContaining({ p_channel_type: "admin_elu" }),
      );
    },
  );

  it("denies the existing admin_elu channel to other roles", async () => {
    identityMock.mockResolvedValueOnce({ activeRole: "benevole" });
    const supabaseMock = buildSupabaseMock({
      profile,
      messages: [],
      insertedMessage: message({ sender_id: "user-1" }),
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat?channelType=admin_elu"),
    );

    expect(response.status).toBe(403);
    expect(supabaseMock.messagesQuery.eq).not.toHaveBeenCalled();
  });

  it("denies admin_elu poll creation to other roles before opening the RLS client", async () => {
    identityMock.mockResolvedValueOnce({ activeRole: "benevole" });
    const response = await (await import("./route")).POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "admin_elu",
          messageKind: "poll",
          pollOptions: ["Oui", "Non"],
          content: "Sondage refusé",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(rlsClientMock).toHaveBeenCalledTimes(1);
  });

  it("keeps legacy messages in the aggregate and filters a selected topic", async () => {
    const rows = [
      message({ id: "11111111-1111-4111-8111-000000000001", topic_id: null }),
      message({ id: "11111111-1111-4111-8111-000000000002", topic_id: "arbitrages" }),
      message({ id: "11111111-1111-4111-8111-000000000003", topic_id: "priorites" }),
      message({ id: "11111111-1111-4111-8111-000000000004", channel_type: "community", topic_id: "relais_associatif" }),
    ];
    const supabaseMock = buildSupabaseMock({
      profile,
      messages: rows,
      insertedMessage: message({ sender_id: "user-1" }),
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const aggregateResponse = await GET(
      new Request("http://localhost/api/chat?channelType=admin_elu"),
    );
    const aggregateBody = (await aggregateResponse.json()) as {
      messages: Array<{ id: string }>;
    };

    expect(aggregateResponse.status).toBe(200);
    expect(aggregateBody.messages.map(({ id }) => id)).toEqual([
      "11111111-1111-4111-8111-000000000001",
      "11111111-1111-4111-8111-000000000002",
      "11111111-1111-4111-8111-000000000003",
    ]);

    const topicResponse = await GET(
      new Request(
        "http://localhost/api/chat?channelType=admin_elu&topicId=arbitrages&messageId=11111111-1111-4111-8111-000000000002",
      ),
    );
    const topicBody = (await topicResponse.json()) as {
      messages: Array<{ id: string }>;
      targetStatus?: string;
    };

    expect(topicResponse.status).toBe(200);
    expect(topicBody.messages.map(({ id }) => id)).toEqual([
      "11111111-1111-4111-8111-000000000002",
    ]);
    expect(topicBody.targetStatus).toBe("found");
    expect(supabaseMock.messagesQuery.eq).toHaveBeenCalledWith(
      "topic_id",
      "arbitrages",
    );
  });

  it.each([
    "arbitrages",
    "priorites",
    "suivi_decisions",
    "coordination_institutionnelle",
  ])("persists the valid admin_elu topic %s", async (topicId) => {
    const insertedMessage = message({ id: "inserted", sender_id: "user-1", topic_id: topicId });
    const supabaseMock = buildSupabaseMock({
      profile,
      messages: [],
      insertedMessage,
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "admin_elu",
          topicId,
          content: "Point de coordination",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ channel_type: "admin_elu", topic_id: topicId }),
    );
  });

  it.each([
    ["unknown", "topic-inconnu"],
    ["community", "relais_associatif"],
  ] as const)("rejects %s topics in admin_elu", async (_label, topicId) => {
    const supabaseMock = buildSupabaseMock({
      profile,
      messages: [],
      insertedMessage: message({ sender_id: "user-1" }),
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "admin_elu",
          topicId,
          content: "Tentative invalide",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
  });
});
