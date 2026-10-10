import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { buildPostActionImpactMetrics } from "./post-action-summary-impact";

describe("buildPostActionImpactMetrics", () => {
  it("computes each proxy independently when all measurements exist", () => {
    const metrics = buildPostActionImpactMetrics({
      wasteKg: 10,
      cigaretteButts: 3,
      durationMinutes: 20,
      operationalVolunteerUnits: 2,
      qualityScore: 87,
    });

    expect(metrics.map(({ id }) => id)).toEqual(["co2", "water", "surface"]);
    expect(metrics[0]).toMatchObject({
      value: 12,
      unit: "kg CO₂e",
      confidence: 87,
    });
    expect(metrics[1].value).toBe(
      Math.round(3 * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    );
    expect(metrics[2].value).toBe(29.8);
    expect(metrics.every(({ method }) => method.includes(IMPACT_PROXY_CONFIG.version))).toBe(
      true,
    );
  });

  it("keeps available metrics when another measurement is null", () => {
    const wasteOnly = buildPostActionImpactMetrics({
      wasteKg: 10,
      cigaretteButts: null,
      durationMinutes: null,
      operationalVolunteerUnits: 2,
      qualityScore: 87,
    });
    const buttsOnly = buildPostActionImpactMetrics({
      wasteKg: null,
      cigaretteButts: 3,
      durationMinutes: 20,
      operationalVolunteerUnits: 2,
      qualityScore: 87,
    });

    expect(wasteOnly[0].value).toBe(12);
    expect(wasteOnly[1].value).toBeNull();
    expect(wasteOnly[2].value).toBeNull();
    expect(buttsOnly[0].value).toBeNull();
    expect(buttsOnly[1].value).not.toBeNull();
    expect(buttsOnly[2].value).toBeNull();
  });
});
