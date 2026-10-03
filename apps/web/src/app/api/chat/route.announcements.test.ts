import { beforeEach, describe, expect, it } from "vitest";
import { buildSupabaseMock, postChatPayload, type ChatMessageRow } from "./route.test.helpers";
import { getSupabaseClerkRlsClientMock, getSupabaseServerClientMock, resetChatRouteMocks } from "./route.test.mocks";

describe("POST /api/chat — annonces et événements", () => {
  beforeEach(() => {
    resetChatRouteMocks();
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

    const { GET } = await import("./route");
    const response = await postChatPayload({
      channelType: "community",
      topicId: "demande_diffusion",
      messageKind: "announcement",
      relatedEventId: eventId,
      content: "Venez relayer cette action.",
    });

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
});
