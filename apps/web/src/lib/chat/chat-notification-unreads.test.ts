import { describe, expect, it } from "vitest";
import { normalizeChatNotificationUnreadCounts } from "./chat-notification-unreads";

describe("chat notification unread aggregation", () => {
  it("keeps aggregate counts while exposing only valid per-topic counts", () => {
    expect(
      normalizeChatNotificationUnreadCounts([
        { channel_type: "community", topic_id: null, unread_count: 2 },
        { channel_type: "community", topic_id: "relais_associatif", unread_count: "3" },
        { channel_type: "territory", topic_id: "mon_territoire", unread_count: 4 },
        { channel_type: "dm", topic_id: null, unread_count: 5 },
        { channel_type: "community", topic_id: "mon_territoire", unread_count: 99 },
        { channel_type: "unknown", topic_id: null, unread_count: 100 },
      ]),
    ).toEqual({
      community: 104,
      communityByTopic: { relais_associatif: 3 },
      territory: 4,
      territoryByTopic: { mon_territoire: 4 },
      dm: 5,
    });
  });
});
