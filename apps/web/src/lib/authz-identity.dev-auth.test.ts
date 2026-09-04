import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { getDevAuthBypassSession } from "./authz-identity";

describe("getDevAuthBypassSession", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    mocks.auth.mockResolvedValue({ userId: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("does not consult Clerk or bypass automatically on human localhost", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_clerk_123" });

    await expect(getDevAuthBypassSession()).resolves.toBeNull();
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("keeps a missing human localhost session unauthenticated", async () => {
    await expect(getDevAuthBypassSession()).resolves.toBeNull();
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("uses a forced bypass even when Clerk has a session", async () => {
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");
    mocks.auth.mockResolvedValue({ userId: "user_clerk_123" });

    await expect(getDevAuthBypassSession()).resolves.toMatchObject({
      userId: "dev-localhost",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("does not use the bypass when it is explicitly disabled", async () => {
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");
    vi.stubEnv("CMM_DISABLE_DEV_AUTH_BYPASS", "1");

    await expect(getDevAuthBypassSession()).resolves.toBeNull();
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});
