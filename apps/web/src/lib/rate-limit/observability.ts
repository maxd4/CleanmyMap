export type RateLimitObservabilitySnapshot = {
  scope: "server-process";
  redisChecks: {
    attempted: number;
    succeeded: number;
    unavailable: number;
    durationMs: {
      total: number;
      average: number;
      max: number;
      last: number;
    };
  };
  responses: {
    rateLimited429: number;
    unavailable503: number;
  };
};

type RateLimitObservabilityState = {
  redisChecks: {
    attempted: number;
    succeeded: number;
    unavailable: number;
    totalDurationMs: number;
    maxDurationMs: number;
    lastDurationMs: number;
  };
  responses: {
    rateLimited429: number;
    unavailable503: number;
  };
};

const state: RateLimitObservabilityState = {
  redisChecks: {
    attempted: 0,
    succeeded: 0,
    unavailable: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: 0,
  },
  responses: {
    rateLimited429: 0,
    unavailable503: 0,
  },
};

function normalizeDuration(durationMs: number): number {
  return Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
}

export function recordRedisCheck(
  successful: boolean,
  durationMs: number,
): void {
  const duration = normalizeDuration(durationMs);
  state.redisChecks.attempted += 1;
  state.redisChecks.totalDurationMs += duration;
  state.redisChecks.maxDurationMs = Math.max(
    state.redisChecks.maxDurationMs,
    duration,
  );
  state.redisChecks.lastDurationMs = duration;

  if (successful) {
    state.redisChecks.succeeded += 1;
  } else {
    state.redisChecks.unavailable += 1;
  }
}

export function recordRateLimitResponse(status: 429 | 503): void {
  if (status === 429) {
    state.responses.rateLimited429 += 1;
    return;
  }

  state.responses.unavailable503 += 1;
}

export function getRateLimitObservability(): RateLimitObservabilitySnapshot {
  const { attempted, totalDurationMs } = state.redisChecks;

  return {
    scope: "server-process",
    redisChecks: {
      attempted,
      succeeded: state.redisChecks.succeeded,
      unavailable: state.redisChecks.unavailable,
      durationMs: {
        total: totalDurationMs,
        average: attempted === 0 ? 0 : totalDurationMs / attempted,
        max: state.redisChecks.maxDurationMs,
        last: state.redisChecks.lastDurationMs,
      },
    },
    responses: {
      rateLimited429: state.responses.rateLimited429,
      unavailable503: state.responses.unavailable503,
    },
  };
}

export function resetRateLimitObservability(): void {
  state.redisChecks.attempted = 0;
  state.redisChecks.succeeded = 0;
  state.redisChecks.unavailable = 0;
  state.redisChecks.totalDurationMs = 0;
  state.redisChecks.maxDurationMs = 0;
  state.redisChecks.lastDurationMs = 0;
  state.responses.rateLimited429 = 0;
  state.responses.unavailable503 = 0;
}
