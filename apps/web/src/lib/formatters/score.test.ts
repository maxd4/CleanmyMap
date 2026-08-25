import { describe, expect, it } from "vitest";
import { formatScorePercent } from "./score";

describe("formatScorePercent", () => {
  it("keeps the internal 0-100 value and renders a French percentage", () => {
    expect(formatScorePercent(63)).toBe("63 %");
    expect(formatScorePercent(63.5)).toBe("63,5 %");
  });

  it("preserves the requested display precision", () => {
    expect(formatScorePercent(63.56, 1)).toBe("63,6 %");
    expect(formatScorePercent(63, 1)).toBe("63,0 %");
  });
});
