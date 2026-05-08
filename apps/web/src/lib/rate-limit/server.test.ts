import { describe, expect, it } from "vitest";
import { createServerRateLimitResponse } from "./server";

describe("createServerRateLimitResponse", () => {
  it("returns a French standardized 429 payload", async () => {
    const response = createServerRateLimitResponse(false, 42);
    expect(response).not.toBeNull();

    const body = (await response!.json()) as {
      error?: string;
      message?: string;
      kind?: string;
      status?: string;
      code?: string;
      retryAfterSeconds?: number;
    };

    expect(response!.status).toBe(429);
    expect(body).toMatchObject({
      error: "Trop de tentatives. Réessayez dans quelques instants.",
      message: "Trop de tentatives. Réessayez dans quelques instants.",
      kind: "network",
      status: "rate_limited",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: 42,
    });
  });
});
