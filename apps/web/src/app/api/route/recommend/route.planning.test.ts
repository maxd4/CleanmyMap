import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getRoutePlannerCandidatePoolLimit } from "./route.planning";

describe("route planner candidate pool limits", () => {
  it("keeps enough candidates for street-level deduplication before segment planning", () => {
    expect(getRoutePlannerCandidatePoolLimit({
      maxStops: 2,
      groupCount: 1,
      planningMode: { type: "free" },
      pedestrianNetwork: {} as never,
      pedestrianRiskProjection: {} as never,
    })).toBe(672);
  });

  it("keeps the existing bounded pool for the non-segment planner", () => {
    expect(getRoutePlannerCandidatePoolLimit({
      maxStops: 2,
      groupCount: 1,
      planningMode: { type: "free" },
      pedestrianNetwork: null,
      pedestrianRiskProjection: null,
    })).toBe(8);
  });
});
