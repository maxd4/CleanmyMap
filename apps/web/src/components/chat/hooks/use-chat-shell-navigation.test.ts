import { describe, expect, it } from "vitest";
import {
  buildChatShellNavigationState,
} from "./use-chat-shell-navigation";

describe("chat shell navigation synchronization model", () => {
  it("builds the complete URL/history state without dropping DM or announcement context", () => {
    const recipient = {
      id: "peer-1",
      display_name: "Alex",
      handle: "alex_75",
      avatar_url: null,
    };
    const state = buildChatShellNavigationState({
      activeChannelType: "dm",
      activeTopicId: null,
      selectedActionId: null,
      selectedRecipient: recipient,
      selectedZone: "11e arrondissement",
      territoryFocus: 11,
      targetMessageIdForScope: "message-1",
      activeFeedbackId: "feedback-1",
      initialRecipientId: recipient.id,
      initialContactRequestId: "request-1",
      announcementTemplate: "diffusion",
      initialAnnouncementTemplate: "diffusion",
      initialEventId: "event-1",
    });

    expect(state).toEqual({
      activeChannelType: "dm",
      activeTopicId: null,
      selectedActionId: null,
      selectedRecipient: recipient,
      selectedZone: "11e arrondissement",
      territoryFocus: 11,
      messageId: "message-1",
      feedbackId: "feedback-1",
      contactRequestId: "request-1",
      announcementTemplate: "diffusion",
      eventId: "event-1",
    });
  });
});
