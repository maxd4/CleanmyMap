import { beforeEach, describe, expect, it } from "vitest";
import {
  getRateLimitObservability,
  recordRateLimitResponse,
  recordRedisCheck,
  resetRateLimitObservability,
} from "./observability";

describe("rate-limit observability", () => {
  beforeEach(() => {
    resetRateLimitObservability();
  });

  it("aggregates Redis outcomes, durations and HTTP outcomes without identities", () => {
    recordRedisCheck(true, 12);
    recordRedisCheck(false, 8);
    recordRateLimitResponse(429);
    recordRateLimitResponse(429);
    recordRateLimitResponse(503);

    const snapshot = getRateLimitObservability();

    expect(snapshot).toEqual({
      scope: "server-process",
      redisChecks: {
        attempted: 2,
        succeeded: 1,
        unavailable: 1,
        durationMs: {
          total: 20,
          average: 10,
          max: 12,
          last: 8,
        },
      },
      responses: {
        rateLimited429: 2,
        unavailable503: 1,
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain("user-123");
  });

  it("does not create non-finite or negative durations", () => {
    recordRedisCheck(true, Number.NaN);
    recordRedisCheck(true, -10);
    recordRedisCheck(true, Number.POSITIVE_INFINITY);

    expect(getRateLimitObservability().redisChecks.durationMs).toEqual({
      total: 0,
      average: 0,
      max: 0,
      last: 0,
    });
  });
});
