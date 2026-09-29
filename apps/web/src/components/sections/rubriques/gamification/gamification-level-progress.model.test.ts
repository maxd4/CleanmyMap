import { describe, expect, it } from "vitest";
import { getLevelProgressPercent } from "./gamification-level-progress.model";

describe("getLevelProgressPercent", () => {
  it("bounds the display-only progress derived from the API values", () => {
    expect(getLevelProgressPercent(2, 3)).toBe(67);
    expect(getLevelProgressPercent(10, 3)).toBe(100);
    expect(getLevelProgressPercent(-1, 3)).toBe(0);
  });

  it("does not invent progress when the target is unavailable", () => {
    expect(getLevelProgressPercent(10, 0)).toBe(0);
    expect(getLevelProgressPercent(Number.NaN, 3)).toBe(0);
  });
});
