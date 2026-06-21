import { describe, expect, it } from "vitest";
import { parseChatRealtimeFlag } from "./chat-config";

describe("chat config", () => {
  it("keeps chat realtime disabled by default", () => {
    expect(parseChatRealtimeFlag(undefined)).toBe(false);
    expect(parseChatRealtimeFlag(null)).toBe(false);
    expect(parseChatRealtimeFlag("0")).toBe(false);
    expect(parseChatRealtimeFlag("false")).toBe(false);
  });

  it("accepts explicit truthy values for the realtime flag", () => {
    expect(parseChatRealtimeFlag("1")).toBe(true);
    expect(parseChatRealtimeFlag("true")).toBe(true);
    expect(parseChatRealtimeFlag("yes")).toBe(true);
    expect(parseChatRealtimeFlag("on")).toBe(true);
  });
});

