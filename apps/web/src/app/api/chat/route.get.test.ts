import { beforeEach, describe, expect, it } from "vitest";
import {
  buildSupabaseMock,
  type ChatMessageRow,
} from "./route.test.helpers";
import {
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  resetChatRouteMocks,
} from "./route.test.mocks";

async function expectChatMessages(response: Response, ids: string[]) {
  const body = (await response.json()) as { messages: ChatMessageRow[] };
  expect(response.status).toBe(200);
  expect(body.messages.map((message) => message.id)).toEqual(ids);
}

describe("GET /api/chat", () => {
  beforeEach(() => {
    resetChatRouteMocks();
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

  it("loads only the canonical conversation selected by action id", async () => {
    const actionId = "11111111-1111-4111-8111-111111111111";
    const conversationId = "22222222-2222-4222-8222-222222222222";
    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null,
        role_label: "member", metadata: null,
      },
      actionConversation: { id: conversationId, action_id: actionId },
      messages: [{
        id: "action-message", created_at: "2026-05-01T09:00:00.000Z", content: "Rendez-vous confirmé",
        channel_type: "action", sender_id: "user-1", recipient_id: null, arrondissement_id: null,
        zone_name: null, conversation_id: conversationId,
      }],
      insertedMessage: {
        id: "inserted", created_at: "2026-05-01T10:00:00.000Z", content: "ok", channel_type: "action",
        sender_id: "user-1", recipient_id: null, arrondissement_id: null, zone_name: null,
      },
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    const { GET } = await import("./route");
    const response = await GET(new Request(`http://localhost/api/chat?channelType=action&actionId=${actionId}`));
    const body = (await response.json()) as { messages?: Array<{ id: string }> };
    expect(response.status).toBe(200);
    expect(body.messages?.map((message) => message.id)).toEqual(["action-message"]);
    expect(supabaseMock.actionConversationQuery.eq).toHaveBeenCalledWith("action_id", actionId);
    expect(supabaseMock.messagesQuery.eq).toHaveBeenCalledWith("conversation_id", conversationId);
  }, 15000);

  it("loads all persisted topics in a presentation group", async () => {
    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null,
        role_label: "member", metadata: null,
      },
      messages: [
        { id: "relay", created_at: "2026-05-01T09:00:00.000Z", content: "Relais", channel_type: "community", topic_id: "relais_associatif", sender_id: "user-2", recipient_id: null, arrondissement_id: null, zone_name: null },
        { id: "volunteers", created_at: "2026-05-01T10:00:00.000Z", content: "Bénévoles", channel_type: "community", topic_id: "appel_aux_benevoles", sender_id: "user-2", recipient_id: null, arrondissement_id: null, zone_name: null },
        { id: "resources", created_at: "2026-05-01T11:00:00.000Z", content: "Ressource", channel_type: "community", topic_id: "besoin_ressources", sender_id: "user-2", recipient_id: null, arrondissement_id: null, zone_name: null },
      ],
      insertedMessage: { id: "relay", created_at: "2026-05-01T09:00:00.000Z", content: "Relais", channel_type: "community", topic_id: "relais_associatif", sender_id: "user-2", recipient_id: null, arrondissement_id: null, zone_name: null },
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat?channelType=community&topicIds=relais_associatif,appel_aux_benevoles"),
    );
    await expectChatMessages(response, ["relay", "volunteers"]);
    expect(supabaseMock.messagesQuery.in).toHaveBeenCalledWith(
      "topic_id",
      ["relais_associatif", "appel_aux_benevoles"],
    );
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
    await expectChatMessages(response, [firstId]);
    expect(supabaseMock.messagesQuery.in).toHaveBeenCalledWith("sender_id", ["user-1", "user-2"]);
    expect(supabaseMock.messagesQuery.in).toHaveBeenCalledWith("recipient_id", ["user-1", "user-2"]);
  }, 15000);
});
