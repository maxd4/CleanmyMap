import { describe, expect, it } from "vitest";

import { shouldEmitMilestone } from "./useInfiniteBadgeController";

describe("InfiniteBadge controller milestone transition", () => {
  it("does not emit on the first render", () => {
    expect(shouldEmitMilestone(null, 1)).toBe(false);
  });

  it("emits when the level increases", () => {
    expect(shouldEmitMilestone(1, 2)).toBe(true);
  });

  it("does not emit when the level is identical or lower", () => {
    expect(shouldEmitMilestone(2, 2)).toBe(false);
    expect(shouldEmitMilestone(2, 1)).toBe(false);
  });
});
