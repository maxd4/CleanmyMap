import { describe, expect, it } from "vitest";
import { validateContentRecord } from "@/lib/content/content-validation";
import { GESTES_PROPRES_BAROMETER_2025 } from "./gestes-propres-barometer";
import { GESTES_PROPRES_CAMPAIGN } from "./gestes-propres-campaign";
import { GESTES_PROPRES_INSIGHTS } from "./gestes-propres-insights";
import { IFOP_DEPOTS_STUDY } from "./ifop-depots-study";

describe("published learning content provenance", () => {
  it("keeps the integrated source-backed content publishable", () => {
    const records = [
      GESTES_PROPRES_BAROMETER_2025.validation,
      GESTES_PROPRES_CAMPAIGN.validation,
      IFOP_DEPOTS_STUDY.validation,
      ...GESTES_PROPRES_INSIGHTS.map((insight) => insight.validation),
    ];

    expect(records).toHaveLength(9);
    expect(records.every((record) => record.status === "published")).toBe(true);
    expect(records.every((record) => validateContentRecord(record).readyForPublication)).toBe(true);
    expect(records.every((record) => record.owner && record.source.name && record.source.date && record.lastReviewedAt)).toBe(true);
  });

  it("keeps facts, estimates and recommendations in separate collections", () => {
    const records = [GESTES_PROPRES_BAROMETER_2025.validation, IFOP_DEPOTS_STUDY.validation];

    for (const record of records) {
      expect(record.claims.fact.every((claim) => claim.type === "fact")).toBe(true);
      expect(record.claims.estimate.every((claim) => claim.type === "estimate")).toBe(true);
      expect(record.claims.recommendation.every((claim) => claim.type === "recommendation")).toBe(true);
    }
  });
});
