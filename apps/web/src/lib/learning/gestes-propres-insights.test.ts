import { describe, expect, it } from "vitest";

import {
  GESTES_PROPRES_INSIGHTS,
  type GestesPropresInsight,
} from "./gestes-propres-insights";

function assertInsight(insight: GestesPropresInsight) {
  expect(insight.title.fr).toBeTruthy();
  expect(insight.summary.fr).toBeTruthy();
  expect(insight.keyPoints.length).toBeLessThanOrEqual(3);
  expect(insight.action.fr).toBeTruthy();
  expect(insight.sourceName.fr).toBe("Gestes Propres");
  expect(insight.sourceUrl).toMatch(/^https:\/\/www\.gestespropres\.com\/article\//);
  expect(insight.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(insight.permissionStatus).toBe("not_requested");
  expect(insight.image).toBeUndefined();
  expect(insight.imageCredit).toBeUndefined();
}

describe("GESTES_PROPRES_INSIGHTS", () => {
  it("contains six verified editorial entries", () => {
    expect(GESTES_PROPRES_INSIGHTS).toHaveLength(6);
    expect(new Set(GESTES_PROPRES_INSIGHTS.map((insight) => insight.id)).size).toBe(6);
    expect(new Set(GESTES_PROPRES_INSIGHTS.map((insight) => insight.sourceUrl)).size).toBe(6);
    expect(GESTES_PROPRES_INSIGHTS.filter((insight) => insight.theme === "tri")).toHaveLength(2);
    expect(GESTES_PROPRES_INSIGHTS.filter((insight) => insight.theme === "reduction")).toHaveLength(4);

    GESTES_PROPRES_INSIGHTS.forEach(assertInsight);
  });
});
