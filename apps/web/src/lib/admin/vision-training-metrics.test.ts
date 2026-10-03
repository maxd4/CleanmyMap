import { describe, expect, it } from "vitest";
import { computeVisionTrainingMetrics } from "./vision-training-metrics";

describe("computeVisionTrainingMetrics", () => {
  it("returns empty comparable metrics without inventing a data warning", () => {
    expect(computeVisionTrainingMetrics([], true)).toEqual({
      count: 0,
      labelledCount: 0,
      mae: null,
      rmse: null,
      latestModelVersion: null,
      paused: true,
      statusCounts: {
        pending_label: 0,
        labelled: 0,
        needs_review: 0,
        no_photo: 0,
      },
    });
  });

  it("computes errors only from valid pairs and picks the latest version", () => {
    const metrics = computeVisionTrainingMetrics(
      [
        {
          created_at: "2026-09-01T10:00:00.000Z",
          model_version: "vision-v1",
          poids_reel: 10,
          poids_estime: "12",
          status: "labelled",
        },
        {
          created_at: "2026-09-02T10:00:00.000Z",
          model_version: "vision-v2",
          poids_reel: 20,
          poids_estime: 17,
          status: "needs_review",
        },
        {
          created_at: "2026-09-03T10:00:00.000Z",
          model_version: null,
          poids_reel: null,
          poids_estime: 4,
          status: "pending_label",
        },
      ],
      false,
    );

    expect(metrics.count).toBe(3);
    expect(metrics.labelledCount).toBe(1);
    expect(metrics.mae).toBe(2.5);
    expect(metrics.rmse).toBeCloseTo(Math.sqrt(6.5), 10);
    expect(metrics.latestModelVersion).toBe("vision-v2");
    expect(metrics.paused).toBe(false);
    expect(metrics.statusCounts).toEqual({
      pending_label: 1,
      labelled: 1,
      needs_review: 1,
      no_photo: 0,
    });
  });
});
