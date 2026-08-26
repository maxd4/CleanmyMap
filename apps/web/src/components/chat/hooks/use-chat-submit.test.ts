import { describe, expect, it } from "vitest";
import { buildOptimisticChatMessage } from "./use-chat-submit";

describe("buildOptimisticChatMessage", () => {
  it("keeps announcement kind and canonical event context in optimistic updates", () => {
    const relatedEvent = {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Cleanup du canal",
      event_date: "2026-09-12",
      location_label: "Quai de Loire",
    };

    expect(
      buildOptimisticChatMessage({
        id: "opt-1",
        senderId: "member-1",
        content: "Relais à partager",
        channelType: "community",
        topicId: "demande_diffusion",
        messageKind: "announcement",
        pollOptions: [],
        relatedEvent,
        createdAt: "2026-08-26T12:00:00.000Z",
        sender: {
          display_name: "Membre",
          handle: "@membre",
          avatar_url: "",
        },
      }),
    ).toMatchObject({
      message_kind: "announcement",
      related_event_id: relatedEvent.id,
      related_event: relatedEvent,
      topic_id: "demande_diffusion",
    });
  });

  it("keeps standard messages free of event context", () => {
    const message = buildOptimisticChatMessage({
      id: "opt-2",
      senderId: "member-1",
      content: "Message standard",
      channelType: "community",
      topicId: null,
      messageKind: "message",
      pollOptions: [],
      relatedEvent: null,
      createdAt: "2026-08-26T12:00:00.000Z",
      sender: {
        display_name: "Membre",
        handle: "@membre",
        avatar_url: "",
      },
    });

    expect(message.message_kind).toBe("message");
    expect(message.related_event_id).toBeNull();
    expect(message.related_event).toBeNull();
  });
});
