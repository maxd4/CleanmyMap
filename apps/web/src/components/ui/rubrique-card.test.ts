import { describe, expect, it } from "vitest";
import { normalizeRubriqueCardInitial } from "./rubrique-card";

describe("RubriqueCard motion visibility contract", () => {
  it("keeps content visible when a caller requests an invisible initial state", () => {
    expect(normalizeRubriqueCardInitial({ opacity: 0, y: 20 })).toEqual({
      opacity: 1,
      y: 20,
    });
  });

  it("preserves visible and static initial states", () => {
    expect(normalizeRubriqueCardInitial({ opacity: 1, scale: 0.98 })).toEqual({
      opacity: 1,
      scale: 0.98,
    });
    expect(normalizeRubriqueCardInitial(false)).toBe(false);
  });
});
