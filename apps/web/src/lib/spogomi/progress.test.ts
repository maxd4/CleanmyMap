import { describe, expect, it } from "vitest";
import { buildSpogomiSpecializedProgress } from "./progress";

describe("SPOGOMI specialized progressions", () => {
  it("continues beyond 100 without a completed state", () => {
    const progress = buildSpogomiSpecializedProgress("spogomi_collector_progress", 125);
    expect(progress).toMatchObject({ currentValue: 125, lastThreshold: 125, nextThreshold: 150, completed: false, state: "in_progress" });
    expect(progress.distinctions).toContain("spogomi_collector_progress:125");
  });

  it("keeps zero explicit and not started", () => {
    expect(buildSpogomiSpecializedProgress("spogomi_referee_progress", 0)).toMatchObject({ currentValue: 0, lastThreshold: null, nextThreshold: 1, state: "not_started", completed: false });
  });
});
