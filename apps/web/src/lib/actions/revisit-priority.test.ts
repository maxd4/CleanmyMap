import { describe, expect, it } from "vitest";
import {
  ACTION_POLLUTION_PROJECTION_CONSTANTS,
  presentActionPollutionProjection,
  projectedPollutionScore,
  resolveActionT80Days,
} from "./revisit-priority";

const NOW = new Date("2026-08-25T00:00:00.000Z");
const actionDateAt = (elapsedDays: number) =>
  new Date(NOW.getTime() - elapsedDays * 24 * 60 * 60 * 1000).toISOString();

describe("action pollution projection", () => {
  it("starts from the explicit post-action score at t=0", () => {
    expect(projectedPollutionScore(80, 0)).toBe(0);
    expect(projectedPollutionScore(80, 0, { postActionScore: 12 })).toBe(12);
  });

  it("grows monotonically from the post-action baseline", () => {
    const values = [0, 10, 30, 90].map((elapsedDays) =>
      projectedPollutionScore(50, elapsedDays),
    );

    expect(values[0]).toBe(0);
    expect(values[1]).toBeLessThan(values[2]);
    expect(values[2]).toBeLessThan(values[3]);
  });

  it("stays bounded at 100 for extreme scores and elapsed times", () => {
    expect(projectedPollutionScore(200, 1_000_000)).toBeLessThanOrEqual(100);
    expect(projectedPollutionScore(-20, -10)).toBeGreaterThanOrEqual(0);
  });

  it("converges toward the historical score without rewriting it", () => {
    const result = presentActionPollutionProjection(65, actionDateAt(1_000_000), NOW);

    expect(result.historicalScore).toBe(65);
    expect(result.postActionScore).toBe(0);
    expect(result.projectedPollutionScore).toBeCloseTo(65, 4);
  });

  it("makes high historical scores recover faster than low scores", () => {
    expect(resolveActionT80Days(80)).toBeCloseTo(34.08, 2);
    expect(resolveActionT80Days(80)).toBeLessThan(resolveActionT80Days(20));
    expect(projectedPollutionScore(80, 40)).toBeGreaterThan(
      projectedPollutionScore(20, 40),
    );
  });

  it("matches the calibrated T80 order of magnitude for 20, 50, 80 and 100", () => {
    expect(resolveActionT80Days(20)).toBeCloseTo(125.28, 2);
    expect(resolveActionT80Days(50)).toBeCloseTo(66, 2);
    expect(resolveActionT80Days(80)).toBeCloseTo(34.08, 2);
    expect(resolveActionT80Days(100)).toBeCloseTo(28, 2);
    expect(
      projectedPollutionScore(50, resolveActionT80Days(50)),
    ).toBeCloseTo(40, 6);
  });

  it("uses a measured post-action value before the model baseline", () => {
    const fallback = presentActionPollutionProjection(60, actionDateAt(0), NOW);
    const measured = presentActionPollutionProjection(60, actionDateAt(0), NOW, {
      postActionScore: 18,
    });

    expect(fallback.postActionScoreSource).toBe("model_baseline");
    expect(fallback.isEstimate).toBe(true);
    expect(measured.postActionScoreSource).toBe("measured");
    expect(measured.isEstimate).toBe(false);
    expect(measured.projectedPollutionScore).toBe(18);
  });

  it("does not add a second temporal malus and supports local T80 calibration", () => {
    const result = projectedPollutionScore(50, 10, {
      calibration: { t80Days: 10 },
    });

    expect(result).toBeCloseTo(40, 6);
    expect(result).toBeLessThan(50);
    expect(ACTION_POLLUTION_PROJECTION_CONSTANTS.targetFraction).toBe(0.8);
  });
});
