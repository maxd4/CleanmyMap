import { describe, expect, it } from "vitest";

import { buildNotificationHref } from "./notification-targets";

describe("notification targets", () => {
  it("deep-links validation and action-event payloads to known internal routes", () => {
    expect(buildNotificationHref({ entityType: "action", id: "action-1" })).toBe(
      "/actions/map?actionId=action-1",
    );
    expect(buildNotificationHref({ entityType: "spot", id: "spot-1" })).toBe(
      "/sections/trash-spotter?spotId=spot-1",
    );
    expect(
      buildNotificationHref({
        entityType: "signalement",
        id: "spot-2",
        moderationOutcome: "rejected",
      }),
    ).toBe("/sections/trash-spotter?spotId=spot-2");
    expect(buildNotificationHref({ eventType: "action_event", actionId: "action-2" })).toBe(
      "/sections/rejoindre-une-action?actionId=action-2",
    );
  });

  it("rejects external, protocol-relative and unknown destinations", () => {
    expect(buildNotificationHref({ href: "https://evil.example/redirect" })).toBeNull();
    expect(buildNotificationHref({ href: "//evil.example" })).toBeNull();
    expect(buildNotificationHref({ href: "/unknown-internal-route" })).toBeNull();
  });
});
