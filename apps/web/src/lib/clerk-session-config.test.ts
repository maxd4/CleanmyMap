import { afterEach, describe, expect, it, vi } from "vitest";

const mockEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_123",
  NEXT_PUBLIC_CLERK_PROXY_URL: "/__clerk",
  CLERK_DOMAIN: "auth.cleanmymap.fr",
  CLERK_IS_SATELLITE: undefined,
  CLERK_SATELLITE_AUTO_SYNC: undefined,
  CLERK_ALLOWED_PARTIES: undefined,
};

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();

  return {
    ...actual,
    env: mockEnv,
    isConfigured: (value: string | undefined) => Boolean(value && value.trim().length > 0),
  };
});

afterEach(() => {
  mockEnv.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mockEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_123";
  mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "/__clerk";
  mockEnv.CLERK_DOMAIN = "auth.cleanmymap.fr";
  mockEnv.CLERK_IS_SATELLITE = undefined;
  mockEnv.CLERK_SATELLITE_AUTO_SYNC = undefined;
  mockEnv.CLERK_ALLOWED_PARTIES = undefined;
  vi.resetModules();
});

describe("getClerkRuntimeConfig", () => {
  it("falls back to the local development publishable key on localhost when a live key is present", async () => {
    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().publishableKey).toMatch(/^pk_test_/);
    expect(getClerkRuntimeConfig().publishableKey).not.toBe(
      mockEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
  });

  it("keeps a relative proxy path relative", async () => {
    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().proxyUrl).toBe("/__clerk");
  });

  it("preserves absolute proxy URLs", async () => {
    mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "https://auth.cleanmymap.fr/__clerk";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().proxyUrl).toBe("https://auth.cleanmymap.fr/__clerk");
  });
});
