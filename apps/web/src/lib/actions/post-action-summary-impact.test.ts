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

  it.each([
    { wasteKg: -1, cigaretteButts: 3, durationMinutes: 20, operationalVolunteerUnits: 2 },
    { wasteKg: Number.NaN, cigaretteButts: 3, durationMinutes: 20, operationalVolunteerUnits: 2 },
    { wasteKg: 10, cigaretteButts: Number.POSITIVE_INFINITY, durationMinutes: 20, operationalVolunteerUnits: 2 },
    { wasteKg: 10, cigaretteButts: 3, durationMinutes: Number.NaN, operationalVolunteerUnits: 2 },
    { wasteKg: 10, cigaretteButts: 3, durationMinutes: 20, operationalVolunteerUnits: -1 },
  ])("does not publish invalid inputs as physical proxy values (%j)", (input) => {
    const metrics = buildPostActionImpactMetrics({ ...input, qualityScore: 50 });
    const invalidMetric = input.wasteKg < 0 || Number.isNaN(input.wasteKg)
      ? metrics.find((metric) => metric.id === "co2")
      : input.cigaretteButts === Number.POSITIVE_INFINITY
        ? metrics.find((metric) => metric.id === "water")
        : metrics.find((metric) => metric.id === "surface");

    expect(invalidMetric?.value).toBeNull();
  });

  it("keeps overflow unavailable per component without contaminating valid metrics", () => {
    const extremeWaste = buildPostActionImpactMetrics({
      wasteKg: Number.MAX_VALUE,
      cigaretteButts: 3,
      durationMinutes: 20,
      operationalVolunteerUnits: 2,
      qualityScore: 50,
    });
    const extremeButts = buildPostActionImpactMetrics({
      wasteKg: 10,
      cigaretteButts: Number.MAX_VALUE,
      durationMinutes: 20,
      operationalVolunteerUnits: 2,
      qualityScore: 50,
    });
    const extremeDuration = buildPostActionImpactMetrics({
      wasteKg: 10,
      cigaretteButts: 3,
      durationMinutes: Number.MAX_VALUE,
      operationalVolunteerUnits: 2,
      qualityScore: 50,
    });

    expect(extremeWaste.find((metric) => metric.id === "co2")?.value).toBeNull();
    expect(extremeWaste.find((metric) => metric.id === "water")?.value).toBe(1500);
    expect(extremeWaste.find((metric) => metric.id === "surface")?.value).toBeNull();

    expect(extremeButts.find((metric) => metric.id === "co2")?.value).toBe(12);
    expect(extremeButts.find((metric) => metric.id === "water")?.value).toBeNull();
    expect(extremeButts.find((metric) => metric.id === "surface")?.value).toBe(29.8);

    expect(extremeDuration.find((metric) => metric.id === "co2")?.value).toBe(12);
    expect(extremeDuration.find((metric) => metric.id === "water")?.value).toBe(1500);
    expect(extremeDuration.find((metric) => metric.id === "surface")?.value).toBeNull();

    for (const metric of [...extremeWaste, ...extremeButts, ...extremeDuration]) {
      expect(metric.value === null || Number.isFinite(metric.value)).toBe(true);
    }
  });
});
