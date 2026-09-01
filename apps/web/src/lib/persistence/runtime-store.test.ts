import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  NEXT_PUBLIC_SUPABASE_URL: undefined as string | undefined,
  SUPABASE_SERVICE_ROLE_KEY: undefined as string | undefined,
  ALLOW_LOCAL_FILE_STORE_FALLBACK: false,
}));

vi.mock("@/lib/env", () => ({ env: envMock }));

describe("runtime persistence guard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");
    envMock.NEXT_PUBLIC_SUPABASE_URL = undefined;
    envMock.SUPABASE_SERVICE_ROLE_KEY = undefined;
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = false;
  });

  it("fails closed on Vercel even when local fallback is enabled", async () => {
    vi.stubEnv("VERCEL", "1");
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = true;

    const { assertPersistenceAvailable } = await import("./runtime-store");

    expect(() => assertPersistenceAvailable("contact_requests")).toThrow(
      "Persistence unavailable for contact_requests on Vercel",
    );
    expect(() => assertPersistenceAvailable("contact_requests")).toThrow(
      "local file fallback is forbidden",
    );
  });

  it("allows the explicit local development fallback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = true;

    const { allowLocalFileStoreFallback, assertPersistenceAvailable } =
      await import("./runtime-store");

    expect(allowLocalFileStoreFallback()).toBe(true);
    expect(() => assertPersistenceAvailable("contact_requests")).not.toThrow();
  });
});
