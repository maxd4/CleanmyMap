import { describe, expect, it } from "vitest";

import { canSubmitChatMessage } from "./use-chat-shell-composer";

const baseParams = {
  userId: "user-1",
  isLoaded: true,
  isSignedIn: true,
  message: "Bonjour",
  file: null,
  isSending: false,
  isUploading: false,
  composerMode: "message" as const,
  pollOptions: ["Oui", "Non"],
  announcementTemplate: null,
  announcementEventRequested: false,
  relatedEvent: null,
  announcementEventLoading: false,
  announcementEventError: null,
  activeChannelType: "community" as const,
  selectedRecipient: null,
  effectiveZone: "",
  territoryFocus: null,
};

describe("canSubmitChatMessage", () => {
  it("allows a connected member to submit a standard message", () => {
    expect(canSubmitChatMessage(baseParams)).toBe(true);
  });

  it("blocks a direct message without a selected recipient", () => {
    expect(
      canSubmitChatMessage({ ...baseParams, activeChannelType: "dm" }),
    ).toBe(false);
  });

  it("keeps poll validation fail-closed", () => {
    expect(
      canSubmitChatMessage({
        ...baseParams,
        composerMode: "poll",
        pollOptions: ["Oui", ""],
      }),
    ).toBe(false);
  });
});
