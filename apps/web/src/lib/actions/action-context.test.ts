import { describe, expect, it } from "vitest";
import {
  hasStrictSchoolChildrenMajority,
  resolveActionContext,
  suggestPreActionContext,
} from "./action-context";

const valid = (volunteersCount: number, childrenCount: number, retiredCount = 0) => ({
  volunteersCount,
  childrenCount,
  retiredCount,
});

describe("action context classification", () => {
  it.each([
    [10, 6, false],
    [10, 7, true],
    [15, 10, false],
    [15, 11, true],
    [25, 16, false],
    [25, 17, true],
    [30, 20, false],
    [30, 21, true],
  ])("applies the strict 2/3 boundary for N=%i and E=%i", (n, e, expected) => {
    expect(hasStrictSchoolChildrenMajority(valid(n, e))).toBe(expected);
  });

  it.each([
    valid(0, 0),
    valid(null as unknown as number, 1),
    valid(10, null as unknown as number),
    { volunteersCount: 10, childrenCount: 8, retiredCount: 3 },
    { volunteersCount: 10.5, childrenCount: 8, retiredCount: 0 },
  ])("does not classify an invalid or incomplete composition: %j", (composition) => {
    expect(hasStrictSchoolChildrenMajority(composition)).toBeNull();
    expect(resolveActionContext({ composition })).toMatchObject({
      context: null,
      source: null,
      isVerifiedFinalComposition: false,
    });
  });

  it("lets an explicit context win without requiring a child majority", () => {
    expect(resolveActionContext({
      composition: valid(15, 1),
      explicitContext: "school",
    })).toMatchObject({ context: "school", source: "explicit" });

    expect(resolveActionContext({
      composition: valid(15, 14),
      explicitContext: "citizen",
    })).toMatchObject({ context: "citizen", source: "explicit" });

    expect(resolveActionContext({
      composition: valid(15, 14),
      explicitContext: "company",
    })).toMatchObject({ context: "company", source: "explicit" });
  });

  it("preserves an explicit choice when the composition changes", () => {
    expect(resolveActionContext({
      composition: valid(15, 14),
      currentContext: "citizen",
      currentSource: "explicit",
    })).toMatchObject({ context: "citizen", source: "explicit" });
  });

  it("returns to automatic classification after an explicit reset", () => {
    expect(resolveActionContext({
      composition: valid(15, 11),
      currentContext: "citizen",
      currentSource: "explicit",
      explicitContext: null,
      resetExplicitChoice: true,
    })).toMatchObject({
      context: "school",
      source: "automatic_children_ratio",
      isVerifiedFinalComposition: true,
    });
  });

  it("keeps the pre-action suggestion separate from verified final classification", () => {
    expect(suggestPreActionContext(valid(15, 11))).toMatchObject({
      context: "school",
      source: "automatic_children_ratio",
      isVerifiedFinalComposition: false,
    });
  });
});
