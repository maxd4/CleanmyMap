import { beforeEach, describe, expect, it, vi } from "vitest";

type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

type ChatMessageRow = {
  id: string;
  created_at: string;
  content: string;
  channel_type: string;
  sender_id: string;
  recipient_id: string | null;
  arrondissement_id: number | null;
  zone_name: string | null;
  topic_id?: string | null;
  sender?: {
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
};

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const reserveDiscussionMessageSlotMock = vi.hoisted(() => vi.fn());
const createChatNotificationsForMessageMock = vi.hoisted(() => vi.fn());
const requireBotIdHumanMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
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
  createChatNotificationsForMessage: createChatNotificationsForMessageMock,
}));

vi.mock("@/lib/botid/server", () => ({
  requireBotIdHuman: requireBotIdHumanMock,
}));

function buildSupabaseMock(options: {
  profile: ProfileRow;
  messages: ChatMessageRow[];
  insertedMessage: ChatMessageRow;
}) {
  const profileQuery = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn(() => profileQuery),
    maybeSingle: vi.fn().mockResolvedValue({ data: options.profile, error: null }),
  };

  const messagesQuery = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  };
  const createMessagesQuery = () => {
    const filters: Array<{ kind: "eq" | "in"; field: string; value: unknown }> = [];
    const query = {
      select: vi.fn(() => query),
      order: vi.fn((...args: unknown[]) => {
        messagesQuery.order(...args);
        return query;
      }),
      limit: vi.fn((...args: unknown[]) => {
        messagesQuery.limit(...args);
        return query;
      }),
      eq: vi.fn((field: string, value: unknown) => {
        filters.push({ kind: "eq", field, value });
        messagesQuery.eq(field, value);
        return query;
      }),
      in: vi.fn((field: string, value: unknown[]) => {
        filters.push({ kind: "in", field, value });
        messagesQuery.in(field, value);
        return query;
      }),
      then: (
        resolve: (value: { data: ChatMessageRow[]; error: null }) => unknown,
        reject: (reason?: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: options.messages.filter((message) =>
            filters.every((filter) =>
              filter.kind === "eq"
                ? message[filter.field as keyof ChatMessageRow] === filter.value
                : (filter.value as unknown[]).includes(
                    message[filter.field as keyof ChatMessageRow],
                  ),
            ),
          ),
          error: null,
        }).then(resolve, reject),
    };
    return query;
  };
  messagesQuery.select.mockImplementation(() => createMessagesQuery());
  messagesQuery.order.mockImplementation(() => createMessagesQuery());
  messagesQuery.limit.mockImplementation(() => createMessagesQuery());

  const insertResult = {
    single: vi.fn().mockResolvedValue({ data: options.insertedMessage, error: null }),
  };

  const insertBuilder = {
    select: vi.fn(() => insertResult),
  };

  const appMessagesTable = {
    select: messagesQuery.select,
    insert: vi.fn(() => insertBuilder),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return profileQuery;
      }
      if (table === "app_messages") {
        return appMessagesTable;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    supabase,
    profileQuery,
    messagesQuery,
    appMessagesTable,
    insertBuilder,
    insertResult,
  };
}

describe("GET /api/chat and POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "member" });

    verifyRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
      retryAfter: 0,
    });
    createServerRateLimitResponseMock.mockReturnValue(null);
    reserveDiscussionMessageSlotMock.mockResolvedValue({ allowed: true });
    createChatNotificationsForMessageMock.mockResolvedValue(undefined);
    requireBotIdHumanMock.mockResolvedValue(null);
  });

  it("returns chat messages in ascending order for GET /api/chat", async () => {
    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1",
        display_name: "Alex",
        handle: "alex",
        paris_arrondissement: null,
        role_label: "member",
        metadata: null,
      },
      messages: [
        {
          id: "message-2",
          created_at: "2026-05-01T10:00:00.000Z",
          content: "Deux",
          channel_type: "community",
          sender_id: "user-2",
          recipient_id: null,
          arrondissement_id: null,
          zone_name: null,
        },
        {
          id: "message-1",
          created_at: "2026-05-01T09:00:00.000Z",
          content: "Un",
          channel_type: "community",
          sender_id: "user-3",
          recipient_id: null,
          arrondissement_id: null,
          zone_name: null,
        },
      ],
      insertedMessage: {
        id: "inserted-message",
        created_at: "2026-05-01T11:00:00.000Z",
        content: "Hello",
        channel_type: "community",
        sender_id: "user-1",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
      },
    });

    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({ service: true });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat?channelType=community"),
    );

    const body = (await response.json()) as {
      messages?: Array<{ id: string; created_at: string }>;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.messages).toHaveLength(2);
    expect(body.messages?.map((message) => message.id)).toEqual([
      "message-1",
      "message-2",
    ]);
    expect(body.messages?.map((message) => message.created_at)).toEqual([
      "2026-05-01T09:00:00.000Z",
      "2026-05-01T10:00:00.000Z",
    ]);
    expect(supabaseMock.profileQuery.eq).toHaveBeenCalledWith("id", "user-1");
    expect(supabaseMock.messagesQuery.eq).toHaveBeenCalledWith(
      "channel_type",
      "community",
    );
    expect(supabaseMock.messagesQuery.order).toHaveBeenCalledWith(
      "created_at",
      { ascending: false },
    );
    expect(supabaseMock.messagesQuery.limit).toHaveBeenCalledWith(50);
  }, 15000);

  it("creates a chat message and fan-outs notifications for POST /api/chat", async () => {
    const insertedMessage: ChatMessageRow = {
      id: "message-42",
      created_at: "2026-05-01T11:30:00.000Z",
      content: "Bonjour tout le monde",
      channel_type: "community",
      sender_id: "user-1",
      recipient_id: null,
      arrondissement_id: null,
      zone_name: null,
      sender: {
        display_name: "Alex",
        handle: "alex",
        avatar_url: null,
      },
    };

    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1",
        display_name: "Alex",
        handle: "alex",
        paris_arrondissement: null,
        role_label: "member",
        metadata: null,
      },
      messages: [],
      insertedMessage,
    });

    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({ service: true });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          channelType: "community",
          content: "Bonjour tout le monde",
        }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      message?: ChatMessageRow;
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("sent");
    expect(body.message).toEqual(insertedMessage);
    expect(verifyRateLimitMock).toHaveBeenCalledWith(expect.any(Request), {
      limit: 20,
      window: 60,
    });
    expect(createServerRateLimitResponseMock).toHaveBeenCalledWith(
      true,
      0,
      expect.objectContaining({ limit: 20, remaining: expect.any(Number) }),
    );
    expect(reserveDiscussionMessageSlotMock).toHaveBeenCalledWith(
      { service: true },
      {
        userId: "user-1",
        channel: "discussion_event",
      },
    );
    expect(supabaseMock.profileQuery.eq).toHaveBeenCalledWith("id", "user-1");
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_id: "user-1",
        recipient_id: null,
        channel_type: "community",
        arrondissement_id: null,
        zone_name: null,
        content: "Bonjour tout le monde",
        attachment_url: undefined,
        attachment_type: undefined,
        attachment_expires_at: null,
      }),
    );
    expect(createChatNotificationsForMessageMock).toHaveBeenCalledWith(
      { service: true },
      "message-42",
    );
  }, 15000);

  it("persists a valid community topic and filters a topic feed without hiding legacy messages from the aggregate", async () => {
    const messages: ChatMessageRow[] = [
      {
        id: "legacy",
        created_at: "2026-05-01T09:00:00.000Z",
        content: "Legacy",
        channel_type: "community",
        sender_id: "user-2",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
        topic_id: null,
      },
      {
        id: "relay",
        created_at: "2026-05-01T10:00:00.000Z",
        content: "Relay",
        channel_type: "community",
        sender_id: "user-2",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
        topic_id: "relais_associatif",
      },
      {
        id: "volunteers",
        created_at: "2026-05-01T11:00:00.000Z",
        content: "Volunteers",
        channel_type: "community",
        sender_id: "user-2",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
        topic_id: "appel_aux_benevoles",
      },
    ];
    const insertedMessage: ChatMessageRow = {
      id: "topic-message",
      created_at: "2026-05-01T12:00:00.000Z",
      content: "Topic message",
      channel_type: "community",
      sender_id: "user-1",
      recipient_id: null,
      arrondissement_id: null,
      zone_name: null,
      topic_id: "relais_associatif",
    };
    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1",
        display_name: "Alex",
        handle: "alex",
        paris_arrondissement: null,
        role_label: "member",
        metadata: null,
      },
      messages,
      insertedMessage,
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({ service: true });

    const { GET, POST } = await import("./route");
    const aggregateResponse = await GET(
      new Request("http://localhost/api/chat?channelType=community"),
    );
    const aggregateBody = (await aggregateResponse.json()) as {
      messages: ChatMessageRow[];
    };
    expect(aggregateResponse.status).toBe(200);
    expect(aggregateBody.messages.map((message) => message.id)).toEqual([
      "legacy",
      "relay",
      "volunteers",
    ]);

    const topicResponse = await GET(
      new Request(
        "http://localhost/api/chat?channelType=community&topicId=relais_associatif",
      ),
    );
    const topicBody = (await topicResponse.json()) as {
      messages: ChatMessageRow[];
    };
    expect(topicResponse.status).toBe(200);
    expect(topicBody.messages.map((message) => message.id)).toEqual(["relay"]);
    expect(supabaseMock.messagesQuery.eq).toHaveBeenCalledWith(
      "topic_id",
      "relais_associatif",
    );

    const postResponse = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          topicId: "relais_associatif",
          content: "Topic message",
        }),
      }),
    );
    expect(postResponse.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_type: "community",
        topic_id: "relais_associatif",
      }),
    );
  }, 15000);

  it.each([
    ["not-a-topic", "Salon inconnu."],
    ["mon_territoire", "Ce salon n'est pas disponible dans ce canal."],
  ])("rejects invalid or incompatible topic %s before writing", async (topicId, hint) => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          topicId,
          content: "Should be rejected",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Salon invalide",
      hint,
    });
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
  });

  it("keeps territory filtering when a topic is selected and rejects a community topic", async () => {
    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1",
        display_name: "Alex",
        handle: "alex",
        paris_arrondissement: 11,
        role_label: "member",
        metadata: null,
      },
      messages: [
        {
          id: "local-topic",
          created_at: "2026-05-01T10:00:00.000Z",
          content: "Local",
          channel_type: "territory",
          sender_id: "user-2",
          recipient_id: null,
          arrondissement_id: 11,
          zone_name: null,
          topic_id: "mon_territoire",
        },
        {
          id: "neighbor-topic",
          created_at: "2026-05-01T11:00:00.000Z",
          content: "Neighbor",
          channel_type: "territory",
          sender_id: "user-2",
          recipient_id: null,
          arrondissement_id: 11,
          zone_name: null,
          topic_id: "territoires_voisins",
        },
        {
          id: "legacy-other-zone",
          created_at: "2026-05-01T12:00:00.000Z",
          content: "Other zone",
          channel_type: "territory",
          sender_id: "user-2",
          recipient_id: null,
          arrondissement_id: 12,
          zone_name: null,
          topic_id: null,
        },
      ],
      insertedMessage: {
        id: "unused",
        created_at: "2026-05-01T12:00:00.000Z",
        content: "unused",
        channel_type: "territory",
        sender_id: "user-1",
        recipient_id: null,
        arrondissement_id: 11,
        zone_name: null,
        topic_id: null,
      },
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/chat?channelType=territory&topicId=mon_territoire",
      ),
    );
    const body = (await response.json()) as { messages: ChatMessageRow[] };
    expect(response.status).toBe(200);
    expect(body.messages.map((message) => message.id)).toEqual(["local-topic"]);
    expect(supabaseMock.messagesQuery.eq).toHaveBeenCalledWith(
      "topic_id",
      "mon_territoire",
    );

    const invalidResponse = await GET(
      new Request(
        "http://localhost/api/chat?channelType=territory&topicId=relais_associatif",
      ),
    );
    expect(invalidResponse.status).toBe(400);
  });

  it("rejects topics on DM, admin and bug-report channels", async () => {
    const { POST } = await import("./route");
    for (const channelType of ["dm", "admin_elu", "bug_report"] as const) {
      const response = await POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channelType,
            topicId: "relais_associatif",
            content: "Should be rejected",
            recipientId: channelType === "dm" ? "user-2" : undefined,
          }),
        }),
      );
      expect(response.status).toBe(400);
    }
  });

  it("returns 403 before auth, parsing, rate limiting, or business calls for a bot", async () => {
    requireBotIdHumanMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Access denied", code: "BOT_DETECTED" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "not-json-and-never-parsed",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Access denied",
      code: "BOT_DETECTED",
    });
    expect(authMock).not.toHaveBeenCalled();
    expect(verifyRateLimitMock).not.toHaveBeenCalled();
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });

  it("returns 429 before auth, parsing, or business calls when rate limited", async () => {
    verifyRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 17_000,
      retryAfter: 17,
    });
    createServerRateLimitResponseMock.mockReturnValue(
      new Response(JSON.stringify({ code: "RATE_LIMIT_EXCEEDED" }), { status: 429 }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "not-json-and-never-parsed",
      }),
    );

    expect(response.status).toBe(429);
    expect(authMock).not.toHaveBeenCalled();
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });
});
