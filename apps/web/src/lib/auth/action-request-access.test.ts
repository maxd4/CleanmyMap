import { beforeEach, describe, expect, it, vi } from "vitest";

const webAccessMock = vi.hoisted(() => vi.fn());
const mobileAccessMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: webAccessMock,
}));
vi.mock("@/lib/auth/mobile-bearer", () => ({
  requireMobileAuthenticatedAccess: mobileAccessMock,
}));

import { requireActionRequestAccess } from "./action-request-access";

describe("requireActionRequestAccess", () => {
  beforeEach(() => {
    webAccessMock.mockReset();
    mobileAccessMock.mockReset();
  });

  it("keeps the web cookie subject when it is authenticated", async () => {
    webAccessMock.mockResolvedValue({ ok: true, userId: "web-user" });
    const request = new Request("https://example.test/api/actions", { method: "POST" });

    await expect(requireActionRequestAccess(request)).resolves.toEqual({
      ok: true,
      userId: "web-user",
    });
    expect(mobileAccessMock).not.toHaveBeenCalled();
  });

  it("delegates only the bounded bearer fallback after web auth fails", async () => {
    webAccessMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    mobileAccessMock.mockResolvedValue({ ok: true, userId: "native-user" });
    const request = new Request("https://example.test/api/actions", {
      method: "POST",
      headers: { Authorization: "Bearer clerk-session-token" },
    });

    await expect(requireActionRequestAccess(request)).resolves.toEqual({
      ok: true,
      userId: "native-user",
    });
    expect(mobileAccessMock).toHaveBeenCalledWith(request);
  });

  it("still reaches the bearer verifier when web auth throws", async () => {
    webAccessMock.mockRejectedValue(new Error("missing clerk middleware context"));
    mobileAccessMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const request = new Request("https://example.test/api/actions", {
      headers: { Authorization: "Bearer expired-session-token" },
    });

    await expect(requireActionRequestAccess(request)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(mobileAccessMock).toHaveBeenCalledWith(request);
  });
});
