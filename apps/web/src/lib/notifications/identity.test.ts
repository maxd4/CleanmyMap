import { describe, expect, it } from "vitest";

import { isCurrentNotificationRequest, type NotificationIdentity } from "./identity";

const identity = (userId: string | null, generation: number): NotificationIdentity => ({
  userId,
  generation,
});

describe("notification request identity", () => {
  it("accepts only the current user's current generation", () => {
    const userA = identity("user-a", 1);
    const userB = identity("user-b", 2);

    expect(isCurrentNotificationRequest(userA, userA)).toBe(true);
    expect(isCurrentNotificationRequest(userA, userB)).toBe(false);
    expect(isCurrentNotificationRequest(identity("user-a", 1), identity("user-a", 2))).toBe(false);
  });

  it("rejects responses after disconnect and after a page-owner switch", () => {
    const userA = identity("user-a", 3);
    const disconnected = identity(null, 4);
    const userB = identity("user-b", 5);

    expect(isCurrentNotificationRequest(userA, disconnected)).toBe(false);
    expect(isCurrentNotificationRequest(userA, userB)).toBe(false);
    expect(isCurrentNotificationRequest(userB, userB)).toBe(true);
  });
});
