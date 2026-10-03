import { beforeEach, describe, expect, it } from "vitest";
import { buildSupabaseMock, type ChatMessageRow } from "./route.test.helpers";
import { getSupabaseClerkRlsClientMock, getSupabaseServerClientMock, resetChatRouteMocks } from "./route.test.mocks";

describe("POST /api/chat — topics et territoire", () => {
  beforeEach(() => {
    resetChatRouteMocks();
  });

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
});
