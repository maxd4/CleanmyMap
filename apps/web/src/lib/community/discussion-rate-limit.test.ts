import { describe, expect, it } from "vitest";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "./discussion-rate-limit";

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

  it("fails closed for an invalid quota row", async () => {
    const rpc = async () => ({
      data: [{ allowed: "yes", reason: "ok" }],
      error: null,
    });

    await expect(reserveDiscussionMessageSlot({ rpc } as never, {
      userId: "user-1",
      channel: "discussion_event",
    })).resolves.toEqual({
      allowed: false,
      reason: "unknown",
      retryAfterSeconds: null,
      messagesToday: 0,
      remainingToday: 0,
    });
  });

  it("preserves a Supabase quota error as a failure", async () => {
    const rpc = async () => ({
      data: null,
      error: { message: "quota_backend_unavailable", code: "P0001" },
    });

    const error = await reserveDiscussionMessageSlot({ rpc } as never, {
      userId: "user-1",
      channel: "bug_report",
    }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: "Failed to reserve discussion message slot: quota_backend_unavailable",
    });
  });
});
