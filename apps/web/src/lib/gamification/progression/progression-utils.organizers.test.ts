import { describe, expect, it } from "vitest";
import { computeActionValidationAward } from "./progression-utils";

describe("computeActionValidationAward", () => {
  it("splits the base XP across organizers", () => {
    expect(computeActionValidationAward(3, "A", 1)).toEqual({
      xpBase: 1,
      xpAwarded: 1,
    });

    expect(computeActionValidationAward(3, "A", 2)).toEqual({
      xpBase: 1,
      xpAwarded: 0.5,
    });

    expect(computeActionValidationAward(3, "A", 4)).toEqual({
      xpBase: 1,
      xpAwarded: 0.25,
    });
  });
});
