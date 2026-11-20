import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkClientMock = vi.hoisted(() => vi.fn());
const getUserListMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));

describe("server verification of selectable Clerk accounts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });
    getUserListMock.mockResolvedValue({ data: [] });
  });

  it("uses one grouped Clerk lookup and returns only existing non-E2E IDs", async () => {
    getUserListMock.mockResolvedValue({
      data: [
        { id: "real", publicMetadata: {}, emailAddresses: [] },
        { id: "marked", publicMetadata: { cleanmymapE2E: true }, emailAddresses: [] },
        { id: "legacy", publicMetadata: {}, emailAddresses: [{ emailAddress: "cmm-e2e-old+clerk_test@example.com" }] },
        { id: "unrequested", publicMetadata: {}, emailAddresses: [] },
      ],
    });
    const { getVerifiedNonE2EClerkUserIds } = await import("./e2e-account-server");

    await expect(getVerifiedNonE2EClerkUserIds(["real", "marked", "legacy", "deleted", "real"]))
      .resolves.toEqual(new Set(["real"]));
    expect(getUserListMock).toHaveBeenCalledOnce();
    expect(getUserListMock).toHaveBeenCalledWith({ userId: ["real", "marked", "legacy", "deleted"], limit: 4 });
  });

  it("rejects oversized verification batches before contacting Clerk", async () => {
    const { getVerifiedNonE2EClerkUserIds, MAX_CLERK_ACCOUNT_VERIFICATION_IDS } = await import("./e2e-account-server");

    await expect(getVerifiedNonE2EClerkUserIds(
      Array.from({ length: MAX_CLERK_ACCOUNT_VERIFICATION_IDS + 1 }, (_, index) => `user-${index}`),
    )).rejects.toThrow("safe bound");
    expect(clerkClientMock).not.toHaveBeenCalled();
    expect(getUserListMock).not.toHaveBeenCalled();
  });

  it("propagates provider errors so callers cannot return unverified profiles", async () => {
    getUserListMock.mockRejectedValue(new Error("Clerk unavailable"));
    const { getVerifiedNonE2EClerkUserIds } = await import("./e2e-account-server");

    await expect(getVerifiedNonE2EClerkUserIds(["possibly-e2e"])).rejects.toThrow("Clerk unavailable");
  });
});
