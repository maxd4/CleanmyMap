import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  headers: vi.fn(),
  isDevAuthBypassEnabled: vi.fn(),
  getDevAuthBypassUserId: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("./dev-auth", () => ({
  getDevAuthBypassUserId: mocks.getDevAuthBypassUserId,
  isDevAuthBypassEnabled: mocks.isDevAuthBypassEnabled,
}));

import { getSafeAuthSession } from "./safe-session";

describe("getSafeAuthSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ host: "cleanmymap.fr" }));
    mocks.isDevAuthBypassEnabled.mockReturnValue(false);
    mocks.getDevAuthBypassUserId.mockReturnValue("dev-user");
  });

  it("distinguishes an authenticated Clerk session", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });

    await expect(getSafeAuthSession()).resolves.toEqual({
      userId: "user-1",
      clerkReachable: true,
      state: "authenticated",
    });
  });

  it("distinguishes a reachable anonymous session", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    await expect(getSafeAuthSession()).resolves.toEqual({
      userId: null,
      clerkReachable: true,
      state: "anonymous",
    });
  });

  it("does not report Clerk failure as an anonymous session", async () => {
    mocks.auth.mockRejectedValue(new Error("middleware context unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getSafeAuthSession()).resolves.toEqual({
      userId: null,
      clerkReachable: false,
      state: "unavailable",
    });

    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
