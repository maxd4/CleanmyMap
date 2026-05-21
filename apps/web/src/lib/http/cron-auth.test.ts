import { describe, expect, it, vi } from "vitest";
import { hasValidCronAuth, isCronSecretConfigured } from "./cron-auth";

vi.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "abcdefghijklmnop",
  },
}));

describe("cron auth helper", () => {
  it("accepts the matching bearer token", () => {
    const request = new Request("http://localhost/api/cron/storage-usage", {
      headers: {
        authorization: "Bearer abcdefghijklmnop",
      },
    });

    expect(isCronSecretConfigured()).toBe(true);
    expect(hasValidCronAuth(request)).toBe(true);
  });

  it("rejects an invalid bearer token", () => {
    const request = new Request("http://localhost/api/cron/storage-usage", {
      headers: {
        authorization: "Bearer wrong",
      },
    });

    expect(hasValidCronAuth(request)).toBe(false);
  });
});
