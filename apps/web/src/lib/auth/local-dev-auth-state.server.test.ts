import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  headers: vi.fn(),
  getDevAuthBypassRole: vi.fn(),
  isDevAuthBypassForced: vi.fn(),
  shouldUseDevAuthBypass: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("./dev-auth", () => ({
  getDevAuthBypassRole: mocks.getDevAuthBypassRole,
  isDevAuthBypassForced: mocks.isDevAuthBypassForced,
  shouldUseDevAuthBypass: mocks.shouldUseDevAuthBypass,
}));

import { getLocalDevAuthState } from "./local-dev-auth-state.server";

describe("getLocalDevAuthState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.isDevAuthBypassForced.mockReturnValue(false);
    mocks.shouldUseDevAuthBypass.mockReturnValue(true);
    mocks.getDevAuthBypassRole.mockReturnValue("benevole");
  });

  it("exposes only the active role for a localhost development bypass", async () => {
    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: true,
      role: "benevole",
    });
  });

  it("falls back to inactive when the official bypass is disabled", async () => {
    mocks.shouldUseDevAuthBypass.mockReturnValue(false);

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
    expect(mocks.getDevAuthBypassRole).not.toHaveBeenCalled();
  });

  it("cannot expose the bypass for a non-local host", async () => {
    mocks.shouldUseDevAuthBypass.mockReturnValue(false);

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
    expect(mocks.getDevAuthBypassRole).not.toHaveBeenCalled();
  });

  it("does not expose the automatic bypass when Clerk has a real session", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_clerk_123" });
    mocks.shouldUseDevAuthBypass.mockReturnValue(false);

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
    expect(mocks.auth).toHaveBeenCalledTimes(1);
  });

  it("keeps a forced bypass active without consulting Clerk", async () => {
    mocks.isDevAuthBypassForced.mockReturnValue(true);

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: true,
      role: "benevole",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("cannot expose the bypass outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
    expect(mocks.headers).not.toHaveBeenCalled();
    expect(mocks.getDevAuthBypassRole).not.toHaveBeenCalled();
  });

  it("fails closed when request headers are unavailable", async () => {
    mocks.headers.mockRejectedValue(new Error("dynamic headers unavailable"));

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
  });
});
