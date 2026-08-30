import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSentryClientDsn,
  getSentryClientEnvironment,
  getSentryClientRelease,
} from "./sentry-client";

describe("Sentry client metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads only the public build-time metadata", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", " https://dsn.example/1 ");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_RELEASE", " client-sha ");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "preview");

    expect(getSentryClientDsn()).toBe("https://dsn.example/1");
    expect(getSentryClientRelease()).toBe("client-sha");
    expect(getSentryClientEnvironment()).toBe("preview");
  });
});
