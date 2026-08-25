import { beforeEach, describe, expect, it, vi } from "vitest";

const checkBotIdMock = vi.hoisted(() => vi.fn());

vi.mock("botid/server", () => ({
  checkBotId: checkBotIdMock,
}));

describe("BotID server guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the stable 403 response for a detected bot without invoking a route", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: true });

    const { requireBotIdHuman } = await import("./server");
    const response = await requireBotIdHuman();

    expect(checkBotIdMock).toHaveBeenCalledWith({
      advancedOptions: { checkLevel: "basic" },
    });
    expect(response?.status).toBe(403);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(await response?.json()).toEqual({
      error: "Access denied",
      code: "BOT_DETECTED",
    });
  });

  it("allows a human verification to continue", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: false });

    const { requireBotIdHuman } = await import("./server");

    await expect(requireBotIdHuman()).resolves.toBeNull();
  });
});
