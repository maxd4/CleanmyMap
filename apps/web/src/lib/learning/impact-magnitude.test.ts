import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  buildImpactMagnitudeSnapshot,
  clampImpactMagnitudeInput,
  DEFAULT_IMPACT_MAGNITUDE_INPUTS,
} from "./impact-magnitude";

describe("impact magnitude helpers", () => {
  it("builds order-of-magnitude snapshots from proxy factors", () => {
    const snapshot = buildImpactMagnitudeSnapshot(
      DEFAULT_IMPACT_MAGNITUDE_INPUTS,
      IMPACT_PROXY_CONFIG.factors,
    );

    expect(snapshot.waterLiters).toBe(5000);
    expect(snapshot.co2Kg).toBe(24);
    expect(snapshot.surfaceM2FromWaste).toBe(50);
    expect(snapshot.surfaceM2FromVolunteerTime).toBe(3.5999999999999996);
    expect(snapshot.euroSaved).toBe(30);
  });

  it("clamps invalid or out-of-range inputs safely", () => {
    expect(clampImpactMagnitudeInput(Number.NaN, 12)).toBe(12);
    expect(clampImpactMagnitudeInput(-10, 12)).toBe(0);
    expect(clampImpactMagnitudeInput(500_000, 12)).toBe(100_000);
  });
});
