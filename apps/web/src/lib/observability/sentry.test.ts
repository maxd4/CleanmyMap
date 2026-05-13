import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  NEXT_PUBLIC_SENTRY_ENABLED: undefined as string | undefined,
  NEXT_PUBLIC_SENTRY_DSN: undefined as string | undefined,
}));

vi.mock("@/lib/env", () => ({
  env: envMock,
  isConfigured: (value: string | undefined) =>
    Boolean(value && value.trim().length > 0),
}));

describe("sentry observability gating", () => {
  it("requires both the enable flag and a DSN", async () => {
    const { getSentryDsn, isSentryEnabled } = await import("./sentry");

    envMock.NEXT_PUBLIC_SENTRY_ENABLED = "true";
    envMock.NEXT_PUBLIC_SENTRY_DSN = undefined;
    expect(isSentryEnabled()).toBe(false);
    expect(getSentryDsn()).toBeNull();

    envMock.NEXT_PUBLIC_SENTRY_DSN = "https://dsn.example";
    expect(isSentryEnabled()).toBe(true);
    expect(getSentryDsn()).toBe("https://dsn.example");

    envMock.NEXT_PUBLIC_SENTRY_ENABLED = undefined;
    expect(isSentryEnabled()).toBe(false);
  });
});
