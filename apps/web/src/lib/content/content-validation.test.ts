import { describe, expect, it } from "vitest";

import {
  assertPublishedContent,
  canTransitionContentStatus,
  transitionContentStatus,
  validateContentRecord,
  type ContentValidationRecord,
} from "./content-validation";

function buildRecord(overrides: Partial<ContentValidationRecord> = {}): ContentValidationRecord {
  return {
    id: "content.example",
    kind: "environmental",
    status: "published",
    owner: "CleanMyMap — équipe éditoriale",
    source: {
      name: "Source primaire",
      url: "https://example.com/source",
      date: "2025-09",
      datePrecision: "month",
      dateBasis: "fieldwork",
    },
    evidenceLevel: "strong",
    lastReviewedAt: "2026-08-04",
    reviewedBy: "CleanMyMap — revue éditoriale",
    claims: {
      fact: [{ id: "fact-1", type: "fact", text: { fr: "Un fait.", en: "A fact." } }],
      estimate: [],
      recommendation: [{ id: "recommendation-1", type: "recommendation", text: { fr: "Une recommandation.", en: "A recommendation." } }],
    },
    ...overrides,
  };
}

describe("content validation workflow", () => {
  it("accepts a published record with explicit provenance and claim types", () => {
    const result = validateContentRecord(buildRecord());

    expect(result.readyForPublication).toBe(true);
    expect(result.issues).toEqual([]);
    expect(() => assertPublishedContent(buildRecord())).not.toThrow();
  });

  it("blocks publication when the source date or review owner is missing", () => {
    const result = validateContentRecord(
      buildRecord({
        source: { ...buildRecord().source, date: null, datePrecision: "unknown" },
        reviewedBy: null,
      }),
    );

    expect(result.readyForPublication).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["missing_source_date", "missing_reviewer"]));
    expect(() => assertPublishedContent(buildRecord({ reviewedBy: null }))).toThrow(/missing_reviewer/);
  });

  it("keeps a draft incomplete without making it publishable", () => {
    const result = validateContentRecord(
      buildRecord({
        status: "draft",
        source: { ...buildRecord().source, date: null, datePrecision: "unknown" },
        lastReviewedAt: null,
        reviewedBy: null,
      }),
    );

    expect(result.readyForPublication).toBe(false);
    expect(result.issues.find((issue) => issue.code === "missing_source_date")?.severity).toBe("warning");
  });

  it("rejects a claim stored in the wrong semantic group", () => {
    const result = validateContentRecord(
      buildRecord({
        claims: {
          fact: [{ id: "estimate-in-fact", type: "estimate", text: { fr: "Environ 10.", en: "About 10." } }],
          estimate: [],
          recommendation: [],
        },
      }),
    );

    expect(result.issues.map((issue) => issue.code)).toContain("claim_type_mismatch");
  });

  it("enforces the human review state machine", () => {
    expect(canTransitionContentStatus("draft", "in_review")).toBe(true);
    expect(canTransitionContentStatus("in_review", "published")).toBe(true);
    expect(canTransitionContentStatus("published", "draft")).toBe(false);
    expect(transitionContentStatus(buildRecord({ status: "in_review" }), "published").status).toBe("published");
    expect(() => transitionContentStatus(buildRecord(), "rejected")).toThrow(/published -> rejected/);
  });
});
