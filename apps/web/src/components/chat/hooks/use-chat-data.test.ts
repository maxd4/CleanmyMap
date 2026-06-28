import { describe, expect, it } from "vitest";
import { getChatRefreshIntervalMs } from "./use-chat-data";

describe("getChatRefreshIntervalMs", () => {
  it("pauses polling when the page is hidden or offline", () => {
    expect(
      getChatRefreshIntervalMs({
        activeChannelType: "community",
        realtimeEnabled: true,
        isVisible: false,
        isOnline: true,
      }),
    ).toBe(0);

    expect(
      getChatRefreshIntervalMs({
        activeChannelType: "dm",
        realtimeEnabled: false,
        isVisible: true,
        isOnline: false,
      }),
    ).toBe(0);
  });

  it("uses a slower fallback polling cadence when realtime is unavailable", () => {
    expect(
      getChatRefreshIntervalMs({
        activeChannelType: "dm",
        realtimeEnabled: false,
        isVisible: true,
        isOnline: true,
      }),
    ).toBe(600_000);

    expect(
      getChatRefreshIntervalMs({
        activeChannelType: "community",
        realtimeEnabled: false,
        isVisible: true,
        isOnline: true,
      }),
    ).toBe(900_000);
  });

  it("keeps a lighter reconciliation cadence when realtime is enabled", () => {
    expect(
      getChatRefreshIntervalMs({
        activeChannelType: "dm",
        realtimeEnabled: true,
        isVisible: true,
        isOnline: true,
      }),
    ).toBe(180_000);

    expect(
      getChatRefreshIntervalMs({
        activeChannelType: "territory",
        realtimeEnabled: true,
        isVisible: true,
        isOnline: true,
      }),
    ).toBe(240_000);
  });
});
