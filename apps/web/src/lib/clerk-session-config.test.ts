import { afterEach, describe, expect, it, vi } from "vitest";

const mockEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("local-dev.clerk.accounts.dev$").toString("base64")}`,
  CLERK_SECRET_KEY: "sk_test_local_dev_secret",
  NEXT_PUBLIC_CLERK_PROXY_URL: "/__clerk",
  CLERK_DOMAIN: undefined as string | undefined,
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
  mockEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("local-dev.clerk.accounts.dev$").toString("base64")}`;
  mockEnv.CLERK_SECRET_KEY = "sk_test_local_dev_secret";
  mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "/__clerk";
  mockEnv.CLERK_DOMAIN = undefined;
  mockEnv.CLERK_IS_SATELLITE = undefined;
  mockEnv.CLERK_SATELLITE_AUTO_SYNC = undefined;
  mockEnv.CLERK_ALLOWED_PARTIES = undefined;
  vi.resetModules();
});

describe("getClerkRuntimeConfig", () => {
  it("uses the configured development key pair on localhost", async () => {
    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().publishableKey).toBe(
      mockEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
    expect(getClerkRuntimeConfig().domain).toBeUndefined();
  });

  it("fails fast when the local Clerk pair is missing", async () => {
    mockEnv.CLERK_SECRET_KEY = "";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(() => getClerkRuntimeConfig()).toThrow(
      "localhost requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_* and CLERK_SECRET_KEY=sk_test_*",
    );
  });

  it("rejects production Clerk keys on localhost instead of falling back", async () => {
    mockEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_production";
    mockEnv.CLERK_SECRET_KEY = "sk_live_production";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(() => getClerkRuntimeConfig()).toThrow(
      "production keys are not allowed",
    );
  });

  it("rejects a configured domain that does not match the development key", async () => {
    mockEnv.CLERK_DOMAIN = "other-instance.clerk.accounts.dev";
    mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(() => getClerkRuntimeConfig()).toThrow(
      "CLERK_DOMAIN does not match",
    );
  });

  it("rejects an invalid configured Clerk domain on localhost", async () => {
    mockEnv.CLERK_DOMAIN = "not a host";
    mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(() => getClerkRuntimeConfig()).toThrow(
      "CLERK_DOMAIN is not a valid Clerk host",
    );
  });

  it("keeps a relative proxy path relative", async () => {
    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().proxyUrl).toBe("/__clerk");
  });

  it("fails fast when a production Clerk domain is configured without a proxy", async () => {
    mockEnv.CLERK_DOMAIN = "clerk.cleanmymap.fr";
    mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(() => getClerkRuntimeConfig()).toThrow(
      "CLERK_DOMAIN does not match",
    );
  });

  it("preserves absolute proxy URLs", async () => {
    mockEnv.NEXT_PUBLIC_CLERK_PROXY_URL = "https://cleanmymap.fr/__clerk";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().proxyUrl).toBe("https://cleanmymap.fr/__clerk");
  });

  it("allows live keys outside localhost", async () => {
    mockEnv.NEXT_PUBLIC_APP_URL = "https://cleanmymap.fr";
    mockEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_production";
    mockEnv.CLERK_SECRET_KEY = "sk_live_production";

    const { getClerkRuntimeConfig } = await import("./clerk-session-config");

    expect(getClerkRuntimeConfig().publishableKey).toBe("pk_live_production");
  });
});
