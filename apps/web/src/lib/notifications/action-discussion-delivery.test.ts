import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTION_DISCUSSION_PUSH_PREFERENCE,
  decideActionDiscussionDelivery,
  normalizeActionDiscussionMessageImportance,
  normalizeActionDiscussionPushPreference,
  readActionDiscussionPushPreference,
  writeActionDiscussionPushPreference,
  type ActionDiscussionNotificationEvent,
  type NotificationDeliveryChannel,
} from "./action-discussion-delivery";

describe("action discussion delivery contract", () => {
  it.each([
    ["off", "normal", false],
    ["off", "important", false],
    ["important_only", "normal", false],
    ["important_only", "important", true],
    ["all", "normal", true],
    ["all", "important", true],
    [undefined, "important", false],
    ["unknown", "important", false],
  ] as const)(
    "keeps in-app active and resolves mobile push for %s/%s",
    (preference, importance, mobilePush) => {
      expect(decideActionDiscussionDelivery(preference, importance)).toEqual({
        inApp: true,
        mobilePush,
      });
    },
  );

  it("fails closed for malformed preference and importance values", () => {
    expect(normalizeActionDiscussionPushPreference(null)).toBe(
      DEFAULT_ACTION_DISCUSSION_PUSH_PREFERENCE,
    );
    expect(normalizeActionDiscussionMessageImportance("changement critique libre")).toBe("normal");
  });

  it("keeps the business event independent from delivery providers", () => {
    const event: ActionDiscussionNotificationEvent = {
      domain: "action_discussion",
      recipientUserId: "user-1",
      actionId: "action-1",
      commentId: "comment-1",
      actionPhase: "post_action_complete",
      importance: "important",
    };
    const channels: NotificationDeliveryChannel[] = ["in_app", "mobile_push"];

    expect(event.domain).toBe("action_discussion");
    expect(channels).toEqual(["in_app", "mobile_push"]);
  });

  it("reads the nested preference and preserves unrelated metadata when writing", () => {
    const original = {
      activeRole: "benevole",
      notificationPreferences: { unrelated: true },
    };

    expect(readActionDiscussionPushPreference(original)).toBe("off");
    const updated = writeActionDiscussionPushPreference(original, "important_only");

    expect(updated).toEqual({
      activeRole: "benevole",
      notificationPreferences: {
        unrelated: true,
        actionDiscussionPush: "important_only",
      },
    });
    expect(readActionDiscussionPushPreference(updated)).toBe("important_only");
  });

  it("accepts the legacy flat preference while keeping the canonical nested shape for writes", () => {
    expect(readActionDiscussionPushPreference({ actionDiscussionPush: "all" })).toBe("all");
    expect(writeActionDiscussionPushPreference(undefined, "invalid")).toEqual({
      notificationPreferences: { actionDiscussionPush: "off" },
    });
  });
});
