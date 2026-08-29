import { afterEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("server preferences", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("preserves the enabled sober display mode from the cookie", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) =>
        key === "cleanmymap.display_mode" ? { value: "sobre" } : undefined,
      ),
    });

    const { getServerDisplayModePreference } = await import("./server-preferences");
    await expect(getServerDisplayModePreference()).resolves.toEqual({
      displayMode: "sobre",
      isExplicit: true,
    });
  });

  it("preserves the enabled minimaliste display mode from the cookie", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) =>
        key === "cleanmymap.display_mode" ? { value: "minimaliste" } : undefined,
      ),
    });

    const { getServerDisplayModePreference } = await import("./server-preferences");
    await expect(getServerDisplayModePreference()).resolves.toEqual({
      displayMode: "minimaliste",
      isExplicit: true,
    });
  });

  it("returns the default mode when no cookie exists", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const { getServerDisplayModePreference } = await import("./server-preferences");
    await expect(getServerDisplayModePreference()).resolves.toEqual({
      displayMode: "exhaustif",
      isExplicit: false,
    });
  });
});
