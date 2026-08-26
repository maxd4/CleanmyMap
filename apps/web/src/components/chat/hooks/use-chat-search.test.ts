import { describe, expect, it } from "vitest";
import { buildChatSearchKey } from "./use-chat-search";

describe("chat search keys", () => {
  it("keeps community search in the selected topic", () => {
    expect(
      buildChatSearchKey({
        activeChannelType: "community",
        activeTopicId: "relais_associatif",
        selectedRecipientId: null,
        effectiveZone: "",
        territoryFocus: null,
        query: "  collecte  ",
      }),
    ).toBe(
      "/api/chat/search?channelType=community&q=collecte&topicId=relais_associatif",
    );
  });

  it("does not create a cross-DM search key without a selected peer", () => {
    expect(
      buildChatSearchKey({
        activeChannelType: "dm",
        activeTopicId: null,
        selectedRecipientId: null,
        effectiveZone: "",
        territoryFocus: null,
        query: "message",
      }),
    ).toBeNull();
  });

  it("preserves territory context in the search key", () => {
    expect(
      buildChatSearchKey({
        activeChannelType: "territory",
        activeTopicId: "mon_territoire",
        selectedRecipientId: null,
        effectiveZone: "Paris 11e",
        territoryFocus: 11,
        query: "ressource",
      }),
    ).toBe(
      "/api/chat/search?channelType=territory&q=ressource&topicId=mon_territoire&zoneName=Paris+11e",
    );
  });
});
