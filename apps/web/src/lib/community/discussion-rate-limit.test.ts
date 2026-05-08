import { describe, expect, it } from "vitest";
import { toDiscussionRateLimitErrorPayload } from "./discussion-rate-limit";

describe("discussion rate limit payloads", () => {
  it("keeps cooldown responses homogeneous", () => {
    expect(
      toDiscussionRateLimitErrorPayload({
        allowed: false,
        reason: "cooldown",
        retryAfterSeconds: 18,
        messagesToday: 2,
        remainingToday: 8,
      }),
    ).toMatchObject({
      kind: "validation",
      status: "rate_limited",
      code: "cooldown",
      retryAfterSeconds: 18,
    });
  });

  it("keeps daily-limit responses homogeneous", () => {
    expect(
      toDiscussionRateLimitErrorPayload({
        allowed: false,
        reason: "daily_limit",
        retryAfterSeconds: null,
        messagesToday: 10,
        remainingToday: 0,
      }),
    ).toMatchObject({
      kind: "validation",
      status: "rate_limited",
      code: "daily_limit",
    });
  });
});
