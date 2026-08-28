import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSupabaseMock,
  type ChatMessageRow,
} from "./route.test.helpers";

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
    expect(supabaseMock.messagesQuery.limit).toHaveBeenCalledWith(51);
  }, 15000);

  it("resolves an old message in one targeted page and continues with a stable cursor", async () => {
    const messageId = (index: number) =>
      `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
    const messages: ChatMessageRow[] = Array.from({ length: 51 }, (_, index) => ({
      id: messageId(index),
      created_at: `2026-05-01T${String(9 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`,
      content: `Message ${index}`,
      channel_type: "community",
      sender_id: "user-2",
      recipient_id: null,
      arrondissement_id: null,
      zone_name: null,
    }));
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
      insertedMessage: messages[0],
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const targetedResponse = await GET(
      new Request(
        `http://localhost/api/chat?channelType=community&messageId=${messageId(50)}`,
      ),
    );
    const targetedBody = (await targetedResponse.json()) as {
      messages: ChatMessageRow[];
      previousCursor: { createdAt: string; id: string } | null;
      hasMore: boolean;
      targetStatus: string;
    };

    expect(targetedResponse.status).toBe(200);
    expect(targetedBody.targetStatus).toBe("found");
    expect(targetedBody.messages).toHaveLength(50);
    expect(targetedBody.messages.at(-1)?.id).toBe(messageId(50));
    expect(targetedBody.hasMore).toBe(true);
    expect(targetedBody.previousCursor?.id).toBe(messageId(1));

    const olderResponse = await GET(
      new Request(
        `http://localhost/api/chat?channelType=community&beforeCreatedAt=${encodeURIComponent(targetedBody.previousCursor!.createdAt)}&beforeId=${targetedBody.previousCursor!.id}`,
      ),
    );
    const olderBody = (await olderResponse.json()) as {
      messages: ChatMessageRow[];
      hasMore: boolean;
    };
    expect(olderResponse.status).toBe(200);
    expect(olderBody.messages.map((message) => message.id)).toEqual([messageId(0)]);
    expect(olderBody.hasMore).toBe(false);
    expect(supabaseMock.messagesQuery.or).toHaveBeenCalledWith(
      expect.stringContaining("created_at.lt."),
    );
  }, 15000);

  it("applies the same keyset contract to a private conversation", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    const messages: ChatMessageRow[] = [
      {
        id: firstId,
        created_at: "2026-05-01T09:00:00.000Z",
        content: "Premier",
        channel_type: "dm",
        sender_id: "user-1",
        recipient_id: "user-2",
        arrondissement_id: null,
        zone_name: null,
      },
      {
        id: secondId,
        created_at: "2026-05-01T10:00:00.000Z",
        content: "Réponse",
        channel_type: "dm",
        sender_id: "user-2",
        recipient_id: "user-1",
        arrondissement_id: null,
        zone_name: null,
      },
    ];
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
      insertedMessage: messages[0],
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        `http://localhost/api/chat?channelType=dm&recipientId=user-2&beforeCreatedAt=${encodeURIComponent("2026-05-01T10:00:00.000Z")}&beforeId=${secondId}`,
      ),
    );
    const body = (await response.json()) as { messages: ChatMessageRow[] };

    expect(response.status).toBe(200);
    expect(body.messages.map((message) => message.id)).toEqual([firstId]);
    expect(supabaseMock.messagesQuery.in).toHaveBeenCalledWith("sender_id", ["user-1", "user-2"]);
    expect(supabaseMock.messagesQuery.in).toHaveBeenCalledWith("recipient_id", ["user-1", "user-2"]);
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
      poll_options: [],
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
        message_kind: "message",
        related_event_id: null,
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

  it.each([
    { attachmentUrl: "https://cdn.example.test/poll.pdf", attachmentType: "application/pdf" },
    { relatedEventId: "11111111-1111-4111-8111-111111111111" },
  ])("rejects poll-only forbidden context %#", async (forbiddenContext) => {
    const response = await (await import("./route")).POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          messageKind: "poll",
          pollOptions: ["Oui", "Non"],
          content: "Sondage sans contexte externe",
          ...forbiddenContext,
        }),
      }),
    );
    expect(response.status).toBe(400);
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

  it("persists a community announcement with a canonical event reference", async () => {
    const eventId = "11111111-1111-4111-8111-111111111111";
    const relatedEvent = {
      id: eventId,
      title: "Nettoyage des berges",
      event_date: "2026-09-15",
      location_label: "Berges de Seine",
    };
    const insertedMessage: ChatMessageRow = {
      id: "announcement-1",
      created_at: "2026-05-01T12:00:00.000Z",
      content: "Venez relayer cette action.",
      channel_type: "community",
      sender_id: "user-1",
      recipient_id: null,
      arrondissement_id: null,
      zone_name: null,
      topic_id: "demande_diffusion",
      message_kind: "announcement",
      related_event_id: eventId,
      related_event: relatedEvent,
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
      messages: [insertedMessage],
      insertedMessage,
      relatedEvent,
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({ service: true });

    const { GET, POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          topicId: "demande_diffusion",
          messageKind: "announcement",
          relatedEventId: eventId,
          content: "Venez relayer cette action.",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(supabaseMock.relatedEventQuery.eq).toHaveBeenCalledWith("id", eventId);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        message_kind: "announcement",
        related_event_id: eventId,
        topic_id: "demande_diffusion",
      }),
    );

    const readResponse = await GET(
      new Request("http://localhost/api/chat?channelType=community"),
    );
    const readBody = (await readResponse.json()) as { messages: ChatMessageRow[] };
    expect(readResponse.status).toBe(200);
    expect(readBody.messages[0]).toMatchObject({
      message_kind: "announcement",
      related_event: relatedEvent,
    });
  });

  it.each(["dm", "territory", "admin_elu", "bug_report"] as const)(
    "rejects announcements on %s",
    async (channelType) => {
      const response = await (await import("./route")).POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channelType,
            messageKind: "announcement",
            topicId: "demande_diffusion",
            content: "Annonce interdite",
            recipientId: channelType === "dm" ? "user-2" : undefined,
          }),
        }),
      );
      expect(response.status).toBe(400);
      expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing related event without publishing an announcement", async () => {
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
      insertedMessage: {
        id: "unused",
        created_at: "2026-05-01T12:00:00.000Z",
        content: "unused",
        channel_type: "community",
        sender_id: "user-1",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
      },
      relatedEvent: null,
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({ service: true });

    const response = await (await import("./route")).POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          messageKind: "announcement",
          topicId: "relais_associatif",
          relatedEventId: "22222222-2222-4222-8222-222222222222",
          content: "Événement absent",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
  });

  it("creates a community poll atomically and returns ordered options", async () => {
    const pollMessage: ChatMessageRow = {
      id: "poll-1",
      created_at: "2026-05-01T13:00:00.000Z",
      content: "Quel créneau préférez-vous ?",
      channel_type: "community",
      sender_id: "user-1",
      recipient_id: null,
      arrondissement_id: null,
      zone_name: null,
      topic_id: "coordination_secteur",
      message_kind: "poll",
      related_event_id: null,
      poll_options: [
        { id: "option-2", position: 2, label: "Dimanche" },
        { id: "option-1", position: 1, label: "Samedi" },
      ],
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
      messages: [pollMessage],
      insertedMessage: pollMessage,
      pollMessage,
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);

    const { GET, POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          topicId: "coordination_secteur",
          messageKind: "poll",
          pollOptions: ["Samedi", "Dimanche"],
          content: "Quel créneau préférez-vous ?",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(supabaseMock.supabase.rpc).toHaveBeenCalledWith(
      "create_chat_poll_with_options",
      {
        p_content: "Quel créneau préférez-vous ?",
        p_topic_id: "coordination_secteur",
        p_option_labels: ["Samedi", "Dimanche"],
      },
    );
    expect(supabaseMock.serviceRpc).toHaveBeenCalledWith(
      "get_my_chat_poll_vote_summaries",
      {
        p_message_ids: ["poll-1"],
        p_user_id: "user-1",
      },
    );
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
    expect((await response.json()).message.poll_options).toEqual([
      { id: "option-1", position: 1, label: "Samedi", voteCount: 0 },
      { id: "option-2", position: 2, label: "Dimanche", voteCount: 0 },
    ]);

    const readResponse = await GET(
      new Request("http://localhost/api/chat?channelType=community&topicId=coordination_secteur"),
    );
    expect(readResponse.status).toBe(200);
    expect((await readResponse.json()).messages[0]).toMatchObject({
      totalVotes: 0,
      selectedOptionId: null,
      poll_options: [
        { position: 1, voteCount: 0 },
        { position: 2, voteCount: 0 },
      ],
    });
  });

  it.each(["dm", "territory", "admin_elu", "bug_report"] as const)(
    "rejects polls on %s",
    async (channelType) => {
      const response = await (await import("./route")).POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channelType,
            messageKind: "poll",
            pollOptions: ["Oui", "Non"],
            content: "Sondage interdit",
            recipientId: channelType === "dm" ? "user-2" : undefined,
          }),
        }),
      );
      expect(response.status).toBe(400);
      expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    ["Oui"],
    ["Oui", "Non", "A", "B", "C", "D", "E"],
    ["Oui", " oui "],
    ["Oui", "   "],
  ])("rejects invalid poll options", async (pollOptions) => {
    const response = await (await import("./route")).POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "community",
          messageKind: "poll",
          pollOptions,
          content: "Sondage invalide",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
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
