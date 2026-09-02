import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getDevAuthBypassRole: vi.fn(),
  isDevAuthBypassEnabled: vi.fn(),
  isLocalhostHost: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("./dev-auth", () => ({
  getDevAuthBypassRole: mocks.getDevAuthBypassRole,
  isDevAuthBypassEnabled: mocks.isDevAuthBypassEnabled,
  isLocalhostHost: mocks.isLocalhostHost,
}));

import { getLocalDevAuthState } from "./local-dev-auth-state.server";

describe("getLocalDevAuthState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    mocks.isLocalhostHost.mockReturnValue(true);
    mocks.isDevAuthBypassEnabled.mockReturnValue(true);
    mocks.getDevAuthBypassRole.mockReturnValue("benevole");
  });

  it("exposes only the active role for a localhost development bypass", async () => {
    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: true,
      role: "benevole",
    });
  });

  it("falls back to inactive when the official bypass is disabled", async () => {
    mocks.isDevAuthBypassEnabled.mockReturnValue(false);

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
    expect(mocks.getDevAuthBypassRole).not.toHaveBeenCalled();
  });

  it("cannot expose the bypass for a non-local host", async () => {
    mocks.isLocalhostHost.mockReturnValue(false);

    await expect(getLocalDevAuthState()).resolves.toEqual({
      active: false,
      role: null,
    });
    expect(mocks.isDevAuthBypassEnabled).not.toHaveBeenCalled();
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
