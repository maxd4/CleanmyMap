import { beforeEach, describe, expect, it } from "vitest";
import {
  buildSupabaseMock,
  type ChatMessageRow,
} from "./route.test.helpers";
import {
  authMock,
  createChatNotificationsForMessageMock,
  createServerRateLimitResponseMock,
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  loadActionByIdMock,
  reserveDiscussionMessageSlotMock,
  resetChatRouteMocks,
  resolveActionDiscussionAccessMock,
  verifyRateLimitMock,
} from "./route.test.mocks";

describe("POST /api/chat", () => {
  beforeEach(() => {
    resetChatRouteMocks();
  });

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
    expect(loadActionByIdMock).not.toHaveBeenCalled();
  }, 15000);

  it("creates a message in an allowed action discussion", async () => {
    const actionId = "33333333-3333-4333-8333-333333333333";
    const conversationId = "44444444-4444-4444-8444-444444444444";
    const insertedMessage: ChatMessageRow = {
      id: "action-message-42",
      created_at: "2026-05-01T11:30:00.000Z",
      content: "Je participe",
      channel_type: "action",
      sender_id: "user-1",
      recipient_id: null,
      arrondissement_id: null,
      zone_name: null,
      conversation_id: conversationId,
      poll_options: [],
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
      actionConversation: { id: conversationId, action_id: actionId },
      insertedMessage,
    });
    loadActionByIdMock.mockResolvedValue({ id: actionId, status: "approved" });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({
      ...supabaseMock.serviceSupabase,
      from: supabaseMock.supabase.from,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "action",
          actionId,
          content: "Je participe",
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
    expect(resolveActionDiscussionAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(Function) }),
      actionId,
      "user-1",
    );
    expect(loadActionByIdMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(Function) }),
      actionId,
    );
    expect(supabaseMock.actionConversationQuery.eq).toHaveBeenCalledWith(
      "action_id",
      actionId,
    );
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_type: "action",
        conversation_id: conversationId,
        action_id: null,
      }),
    );
  }, 15000);

  it("rejects a cancelled action before creating a message", async () => {
    const actionId = "55555555-5555-4555-8555-555555555555";
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
        created_at: "2026-05-01T11:30:00.000Z",
        content: "unused",
        channel_type: "action",
        sender_id: "user-1",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
      },
    });
    loadActionByIdMock.mockResolvedValue({ id: actionId, status: "cancelled" });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue({
      ...supabaseMock.serviceSupabase,
      from: supabaseMock.supabase.from,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "action",
          actionId,
          content: "Je participe",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("Cette action a été annulée.");
    expect(loadActionByIdMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(Function) }),
      actionId,
    );
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
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
        p_channel_type: "community",
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

  it.each(["dm", "territory", "bug_report", "action"] as const)(
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

  it("requires the server session without consulting BotID", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelType: "community", content: "Bonjour" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(authMock).toHaveBeenCalledOnce();
    expect(verifyRateLimitMock).toHaveBeenCalledOnce();
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
