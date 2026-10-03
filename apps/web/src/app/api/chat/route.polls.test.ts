import { beforeEach, describe, expect, it } from "vitest";
import { buildSupabaseMock, postChatPayload, type ChatMessageRow } from "./route.test.helpers";
import {
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  resetChatRouteMocks,
} from "./route.test.mocks";

function configurePollSupabase(
  pollMessage: ChatMessageRow,
  actionConversation: { id: string; action_id: string } | null = null,
) {
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
    actionConversation,
  });
  getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
  getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);
  return supabaseMock;
}

describe("POST /api/chat — polls", () => {
  beforeEach(() => {
    resetChatRouteMocks();
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
    const supabaseMock = configurePollSupabase(pollMessage);

    const { GET } = await import("./route");
    const response = await postChatPayload({
      channelType: "community",
      topicId: "coordination_secteur",
      messageKind: "poll",
      pollOptions: ["Samedi", "Dimanche"],
      content: "Quel créneau préférez-vous ?",
    });

    expect(response.status).toBe(201);
    expect(supabaseMock.supabase.rpc).toHaveBeenCalledWith(
      "create_chat_poll_with_options",
      {
        p_channel_type: "community",
        p_content: "Quel créneau préférez-vous ?",
        p_topic_id: "coordination_secteur",
        p_option_labels: ["Samedi", "Dimanche"],
        p_recipient_id: null,
        p_conversation_id: null,
        p_arrondissement_id: null,
        p_zone_name: null,
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

  it("rejects polls on bug_report", async () => {
    const response = await (await import("./route")).POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "bug_report",
          messageKind: "poll",
          pollOptions: ["Oui", "Non"],
          content: "Sondage interdit",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      channelType: "dm" as const,
      extra: {
        recipientId: "user-2",
        zoneName: undefined,
        arrondissementId: undefined,
        actionId: undefined,
      },
      expected: {
        p_recipient_id: "user-2",
        p_conversation_id: null,
        p_arrondissement_id: null,
        p_zone_name: null,
      },
    },
    {
      channelType: "territory" as const,
      extra: {
        recipientId: undefined,
        zoneName: "Paris 1er",
        arrondissementId: 1,
        actionId: undefined,
      },
      expected: {
        p_recipient_id: null,
        p_conversation_id: null,
        p_arrondissement_id: 1,
        p_zone_name: "Paris 1er",
      },
    },
    {
      channelType: "action" as const,
      extra: {
        recipientId: undefined,
        zoneName: undefined,
        arrondissementId: undefined,
        actionId: "22222222-2222-4222-8222-222222222222",
      },
      expected: {
        p_recipient_id: null,
        p_conversation_id: "33333333-3333-4333-8333-333333333333",
        p_arrondissement_id: null,
        p_zone_name: null,
      },
    },
  ])("creates an atomic poll in $channelType with its existing channel context", async ({
    channelType,
    extra,
    expected,
  }) => {
    const pollMessage: ChatMessageRow = {
      id: `poll-${channelType}`,
      created_at: "2026-05-01T13:00:00.000Z",
      content: "Quel choix ?",
      channel_type: channelType,
      sender_id: "user-1",
      recipient_id: extra.recipientId ?? null,
      arrondissement_id: extra.arrondissementId ?? null,
      zone_name: extra.zoneName ?? null,
      conversation_id: expected.p_conversation_id,
      message_kind: "poll",
      related_event_id: null,
      poll_options: [
        { id: `option-${channelType}-1`, position: 1, label: "Oui" },
        { id: `option-${channelType}-2`, position: 2, label: "Non" },
      ],
    };
    const supabaseMock = configurePollSupabase(
      pollMessage,
      channelType === "action"
        ? { id: expected.p_conversation_id!, action_id: extra.actionId! }
        : null,
    );

    const response = await (await import("./route")).POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType,
          actionId: extra.actionId,
          recipientId: extra.recipientId,
          zoneName: extra.zoneName,
          arrondissementId: extra.arrondissementId,
          messageKind: "poll",
          pollOptions: ["Oui", "Non"],
          content: "Quel choix ?",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(supabaseMock.supabase.rpc).toHaveBeenCalledWith(
      "create_chat_poll_with_options",
      expect.objectContaining({
        p_channel_type: channelType,
        p_content: "Quel choix ?",
        p_option_labels: ["Oui", "Non"],
        ...expected,
      }),
    );
  });

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
});
