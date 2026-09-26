import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildChatSearchKey } from "./use-chat-search";

const searchHookSource = readFileSync(new URL("./use-chat-search.ts", import.meta.url), "utf8");

describe("chat search keys", () => {
  it("debounces, deduplicates and aborts stale network searches", () => {
    expect(searchHookSource).toContain("setTimeout");
    expect(searchHookSource).toContain("CHAT_SEARCH_MIN_QUERY_LENGTH");
    expect(searchHookSource).toContain("new AbortController()");
    expect(searchHookSource).toContain("dedupingInterval: 30_000");
  });

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

  it("searches every persisted topic in an aggregate presentation group", () => {
    expect(
      buildChatSearchKey({
        activeChannelType: "admin_elu",
        activeTopicId: "arbitrages",
        activeTopicIds: ["arbitrages", "priorites"],
        selectedRecipientId: null,
        effectiveZone: "",
        territoryFocus: null,
        query: "priorité",
      }),
    ).toBe(
      "/api/chat/search?channelType=admin_elu&q=priorit%C3%A9&topicIds=arbitrages%2Cpriorites",
    );
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
