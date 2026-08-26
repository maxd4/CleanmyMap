import { describe, expect, it } from "vitest";
import { buildChatNotificationHref, normalizeChatNotificationPayload } from "./chat-notification-targets";

describe("chat notification targets", () => {
  it("opens a community topic without changing announcement or poll navigation", () => {
    expect(
      buildChatNotificationHref({
        channelType: "community",
        topicId: "relais_associatif",
        messageKind: "announcement",
      }),
    ).toBe("/sections/messagerie?channel=community&topicId=relais_associatif");

    expect(
      buildChatNotificationHref({
        channelType: "community",
        topicId: "appel_aux_benevoles",
        messageKind: "poll",
      }),
    ).toBe("/sections/messagerie?channel=community&topicId=appel_aux_benevoles");
  });

  it("keeps territory context and opens the selected room", () => {
    expect(
      buildChatNotificationHref({
        channelType: "territory",
        topicId: "mon_territoire",
        zoneName: "Paris 11e",
        arrondissementId: 11,
      }),
    ).toBe(
      "/sections/messagerie?channel=territory&zoneName=Paris+11e&arrondissementId=11&topicId=mon_territoire",
    );
  });

  it("keeps legacy payloads on the aggregate view and preserves DM links", () => {
    expect(
      buildChatNotificationHref({ channelType: "community", messageId: "legacy" }),
    ).toBe("/sections/messagerie?channel=community&messageId=legacy");
    expect(
      buildChatNotificationHref({
        channelType: "dm",
        recipientId: "user_2",
        recipientLabel: "Alex",
        recipientHandle: "alex",
      }),
    ).toBe(
      "/sections/messagerie?channel=dm&recipientId=user_2&recipientLabel=Alex&recipientHandle=alex",
    );
  });

  it("rejects an incompatible topic instead of navigating to a fabricated room", () => {
    expect(
      normalizeChatNotificationPayload({
        channelType: "dm",
        topicId: "relais_associatif",
      })?.topicId,
    ).toBeUndefined();
  });
});
