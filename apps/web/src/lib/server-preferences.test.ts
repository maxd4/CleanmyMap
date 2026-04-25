import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("server preferences", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ userId: "user-1" });
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prefers Clerk display mode metadata over cookies", async () => {
    const getUser = vi.fn().mockResolvedValue({
      unsafeMetadata: { displayMode: "minimaliste" },
      publicMetadata: { displayMode: "sobre" },
      privateMetadata: { displayMode: "exhaustif" },
    });
    clerkClientMock.mockResolvedValue({
      users: { getUser },
    });

    const { getServerDisplayModePreference } = await import("./server-preferences");
    await expect(getServerDisplayModePreference()).resolves.toEqual({
      displayMode: "minimaliste",
      isExplicit: true,
    });
  });

  it("falls back to cookies when Clerk has no preference", async () => {
    const getUser = vi.fn().mockResolvedValue({
      unsafeMetadata: {},
      publicMetadata: {},
      privateMetadata: {},
    });
    clerkClientMock.mockResolvedValue({
      users: { getUser },
    });
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) =>
        key === "cleanmymap.display_mode"
          ? { value: "sobre" }
          : undefined,
      ),
    });

    const { getServerDisplayModePreference } = await import("./server-preferences");
    await expect(getServerDisplayModePreference()).resolves.toEqual({
      displayMode: "sobre",
      isExplicit: true,
    });
  });

  it("returns the default mode when no preference exists", async () => {
    authMock.mockResolvedValue({ userId: null });
    clerkClientMock.mockResolvedValue({
      users: { getUser: vi.fn() },
    });

    const { getServerDisplayModePreference } = await import("./server-preferences");
    await expect(getServerDisplayModePreference()).resolves.toEqual({
      displayMode: "exhaustif",
      isExplicit: false,
    });
  });
});

