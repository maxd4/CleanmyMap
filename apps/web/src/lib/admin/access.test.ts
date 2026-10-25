import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { checkAdminAccess } from "./access";

describe("checkAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects an anonymous request to sign-in without exposing the guard result", async () => {
    requireAdminAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    await checkAdminAccess();

    expect(redirectMock).toHaveBeenCalledWith("/auth/signin");
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("redirects an authenticated but insufficient role to the safe application root", async () => {
    requireAdminAccessMock.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });

    await checkAdminAccess();

    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("allows an authorized administrator through without redirecting", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });

    await expect(checkAdminAccess()).resolves.toBeUndefined();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("uses the canonical server guard and does not authorize from a client role", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });

    await checkAdminAccess();

    expect(requireAdminAccessMock).toHaveBeenCalledTimes(1);
    expect(requireAdminAccessMock).toHaveBeenCalledWith();
  });
});
