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
    select: vi.fn(() => messagesQuery),
    order: vi.fn(() => messagesQuery),
    limit: vi.fn(() => messagesQuery),
    eq: vi.fn(async () => ({ data: options.messages, error: null })),
    in: vi.fn(async () => ({ data: options.messages, error: null })),
  };

  const insertResult = {
    single: vi.fn().mockResolvedValue({ data: options.insertedMessage, error: null }),
  };

  const insertBuilder = {
    select: vi.fn(() => insertResult),
  };

  const appMessagesTable = {
    select: vi.fn(() => messagesQuery),
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

    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0 });
    createServerRateLimitResponseMock.mockReturnValue(null);
    reserveDiscussionMessageSlotMock.mockResolvedValue({ allowed: true });
    createChatNotificationsForMessageMock.mockResolvedValue(undefined);
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
    expect(verifyRateLimitMock).toHaveBeenCalledWith({
      limit: 20,
      window: 60,
      key: "user-1",
    });
    expect(createServerRateLimitResponseMock).toHaveBeenCalledWith(true, 0);
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
});
