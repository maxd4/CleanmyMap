import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupabaseMock, type ChatMessageRow } from "./route.test.helpers";
import {
  createChatNotificationsForMessageMock,
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  loadActionByIdMock,
  reserveDiscussionMessageSlotMock,
  resetChatRouteMocks,
  resolveActionDiscussionAccessMock,
} from "./route.test.mocks";

const insertedMessage: ChatMessageRow = {
  id: "message-quota-order",
  created_at: "2026-05-01T11:30:00.000Z",
  content: "Message de contrôle",
  channel_type: "community",
  sender_id: "user-1",
  recipient_id: null,
  arrondissement_id: null,
  zone_name: null,
  poll_options: [],
};

function postChatPayload(payload: Record<string, unknown>) {
  return import("./route").then(({ POST }) =>
    POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ),
  );
}

function configureSupabase(options: {
  insertedMessage?: ChatMessageRow;
  pollMessage?: ChatMessageRow;
  dmRows?: Array<{ peer_id: string; peer_display_name: string | null; peer_handle: string | null }>;
} = {}) {
  const supabaseMock = buildSupabaseMock({
    profile: {
      id: "user-1",
      display_name: "Alex",
      handle: "alex",
      paris_arrondissement: null,
      role_label: "member",
      metadata: null,
    },
    messages: options.pollMessage ? [options.pollMessage] : [],
    insertedMessage: options.insertedMessage ?? options.pollMessage ?? insertedMessage,
    pollMessage: options.pollMessage,
    dmRows: options.dmRows,
  });
  getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
  getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);
  return supabaseMock;
}

describe("POST /api/chat — quota après validation du contexte", () => {
  beforeEach(() => {
    resetChatRouteMocks();
  });

  it.each([
    {
      name: "canal admin interdit",
      payload: { channelType: "admin_elu", content: "Accès interdit" },
      status: 403,
    },
    {
      name: "zone invalide",
      payload: { channelType: "territory", zoneName: "Zone inexistante", content: "Zone invalide" },
      status: 400,
    },
    {
      name: "destinataire DM invalide",
      payload: { channelType: "dm", recipientId: "user-1", content: "Auto-message interdit" },
      status: 400,
    },
  ])("ne réserve pas le quota pour un $name", async ({ payload, status }) => {
    const supabaseMock = configureSupabase();

    const response = await postChatPayload(payload);

    expect(response.status).toBe(status);
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(supabaseMock.serviceAppMessagesTable.insert).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });

  it("ne réserve pas le quota pour une discussion d'action interdite", async () => {
    const supabaseMock = configureSupabase();
    resolveActionDiscussionAccessMock.mockResolvedValueOnce({
      state: "forbidden",
      conversationId: "conversation-forbidden",
    });

    const response = await postChatPayload({
      channelType: "action",
      actionId: "33333333-3333-4333-8333-333333333333",
      content: "Participation interdite",
    });

    expect(response.status).toBe(403);
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(supabaseMock.serviceAppMessagesTable.insert).not.toHaveBeenCalled();
  });

  it("ne réserve pas le quota pour une demande de partage request_pending", async () => {
    const actionId = "44444444-4444-4444-8444-444444444444";
    const supabaseMock = configureSupabase({ dmRows: [] });
    loadActionByIdMock.mockResolvedValueOnce({
      id: actionId,
      action_date: "2099-01-01",
      event_start_time: "10:00",
      action_phase: "pre_action",
      status: "approved",
      moderation_visibility: "visible",
      published_at: "2098-12-01T10:00:00.000Z",
    });
    const requestRpc = vi.fn().mockResolvedValue({
      data: [{ request_id: "request-1", result: "created", retry_after_seconds: null }],
      error: null,
    });
    getSupabaseServerClientMock.mockReturnValue({ ...supabaseMock.serviceSupabase, rpc: requestRpc });

    const response = await postChatPayload({
      channelType: "dm",
      recipientId: "user-2",
      actionId,
      content: "Partage à valider",
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ status: "request_pending", requestId: "request-1" });
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(supabaseMock.serviceAppMessagesTable.insert).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });

  it("réserve exactement une fois avant l'insertion et notifie après la persistance", async () => {
    const supabaseMock = configureSupabase();
    createChatNotificationsForMessageMock.mockImplementationOnce(async () => {
      expect(supabaseMock.serviceAppMessagesTable.insert).toHaveBeenCalled();
    });

    const response = await postChatPayload({
      channelType: "community",
      content: "Message accepté",
    });

    expect(response.status).toBe(201);
    expect(reserveDiscussionMessageSlotMock).toHaveBeenCalledOnce();
    expect(reserveDiscussionMessageSlotMock.mock.invocationCallOrder[0]).toBeLessThan(
      supabaseMock.serviceAppMessagesTable.insert.mock.invocationCallOrder[0],
    );
    expect(createChatNotificationsForMessageMock).toHaveBeenCalledOnce();
  });

  it("réserve exactement une fois avant la RPC de sondage", async () => {
    const pollMessage: ChatMessageRow = {
      ...insertedMessage,
      id: "poll-quota-order",
      message_kind: "poll",
      poll_options: [
        { id: "option-1", position: 1, label: "Oui" },
        { id: "option-2", position: 2, label: "Non" },
      ],
    };
    const supabaseMock = configureSupabase({ pollMessage });

    const response = await postChatPayload({
      channelType: "community",
      messageKind: "poll",
      pollOptions: ["Oui", "Non"],
      content: "Sondage accepté",
    });

    expect(response.status).toBe(201);
    expect(reserveDiscussionMessageSlotMock).toHaveBeenCalledOnce();
    expect(supabaseMock.serviceRpc).toHaveBeenCalledWith(
      "create_chat_poll_with_options_for_server",
      expect.any(Object),
    );
    expect(reserveDiscussionMessageSlotMock.mock.invocationCallOrder[0]).toBeLessThan(
      supabaseMock.serviceRpc.mock.invocationCallOrder[0],
    );
    expect(supabaseMock.serviceAppMessagesTable.insert).not.toHaveBeenCalled();
  });

  it("retourne 429 sans écriture quand le quota est épuisé", async () => {
    const supabaseMock = configureSupabase();
    reserveDiscussionMessageSlotMock.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 30 });

    const response = await postChatPayload({
      channelType: "community",
      content: "Message refusé par le quota",
    });

    expect(response.status).toBe(429);
    expect(supabaseMock.serviceAppMessagesTable.insert).not.toHaveBeenCalled();
    expect(supabaseMock.serviceRpc).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });
});
