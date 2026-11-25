import { describe, expect, it } from "vitest";
import {
  getRealizedParisSchoolOperations,
  PARIS_SCHOOL_CLEANWALK_RECORDS,
} from "./paris-cleanwalk-schools";

describe("paris-cleanwalk-schools", () => {
  it("registers all five Parisian colleges with valid sources", () => {
    expect(PARIS_SCHOOL_CLEANWALK_RECORDS).toHaveLength(5);
    const ids = PARIS_SCHOOL_CLEANWALK_RECORDS.map((r) => r.schoolId);
    expect(ids).toEqual([
      "college-antoine-coysevox",
      "college-saint-exupery",
      "college-la-grange-aux-belles",
      "college-condorcet",
      "college-georges-brassens",
    ]);
    for (const record of PARIS_SCHOOL_CLEANWALK_RECORDS) {
      expect(record.sources.length).toBeGreaterThan(0);
      for (const source of record.sources) {
        expect(source.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("excludes announced-only operations from realized operations", () => {
    const realized = getRealizedParisSchoolOperations();
    const realizedIds = realized.map((r) => r.schoolId);
    expect(realizedIds).toContain("college-antoine-coysevox");
    expect(realizedIds).toContain("college-saint-exupery");
    expect(realizedIds).toContain("college-condorcet");
    expect(realizedIds).not.toContain("college-la-grange-aux-belles");
    expect(realizedIds).not.toContain("college-georges-brassens");
  });

  it("never attributes false co-organization to Surfrider, GoodPlanet, AIP, or Retrace", () => {
    for (const record of PARIS_SCHOOL_CLEANWALK_RECORDS) {
      for (const link of record.externalLinks) {
        expect(link.isCoOrganizer).toBe(false);
      }
    }
  });
});
