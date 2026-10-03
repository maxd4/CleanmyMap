import { beforeEach, describe, expect, it } from "vitest";
import { buildSupabaseMock, type ChatMessageRow } from "./route.test.helpers";
import { createChatNotificationsForMessageMock, createServerRateLimitResponseMock, getSupabaseClerkRlsClientMock, getSupabaseServerClientMock, loadActionByIdMock, reserveDiscussionMessageSlotMock, resolveActionDiscussionAccessMock, verifyRateLimitMock, resetChatRouteMocks } from "./route.test.mocks";

describe("POST /api/chat — publication et canaux", () => {
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
          actorUserId: "spoofed-browser-actor",
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
      "user-1",
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
      "benevole",
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
});
