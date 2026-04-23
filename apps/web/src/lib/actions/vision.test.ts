import { describe, expect, it } from "vitest";
import { estimateVisionFromStats } from "./vision";

describe("estimateVisionFromStats", () => {
  it("returns the simplified training signals and a discrete fill level", () => {
    const estimate = estimateVisionFromStats(
      [
        {
          brightness: 0.42,
          contrast: 0.54,
          saturation: 0.36,
          darkRatio: 0.48,
          warmRatio: 0.26,
          whiteRatio: 0.09,
          edgeDensity: 0.31,
        },
      ],
      {
        locationLabel: "Boulevard test",
        durationMinutes: 75,
        placeType: "Boulevard",
      },
    );

    expect([25, 50, 75, 100]).toContain(estimate.fillLevel.value);
    expect(["sec", "humide_dense", "mouille"]).toContain(
      estimate.density.value,
    );
    expect(estimate.bagsCount.value).toBeGreaterThanOrEqual(1);
    expect(estimate.wasteKg.value).toBeGreaterThan(0);
  });
});
