import { describe, expect, it } from "vitest";
import { normalizeActionId } from "./action-id";

describe("normalizeActionId", () => {
  it("trims a canonical action id", () => {
    expect(normalizeActionId("  action-1  ")).toBe("action-1");
  });

  it("rejects an empty action id", () => {
    expect(normalizeActionId("   ")).toBeNull();
  });
});
