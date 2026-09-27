import { describe, expect, it } from "vitest";
import { convertCigaretteButtsToKg } from "./model";

describe("action form cigarette-butt conversion", () => {
  it("uses the canonical qualified runtime conversion", () => {
    expect(convertCigaretteButtsToKg(2_500, "propre")).toBe(1);
    expect(convertCigaretteButtsToKg(2_500, "humide")).toBeCloseTo(1 / 0.7, 10);
    expect(convertCigaretteButtsToKg(2_500, "mouille")).toBe(2.5);
  });
});
