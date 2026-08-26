import { describe, expect, it } from "vitest";
import {
  formatReportGenerationDate,
  isReportGenerationHistoryRow,
  toReportGenerationHistoryRow,
} from "./report-generation-history-contract";

describe("report generation history contract", () => {
  it("maps persisted identifiers to the visible history labels", () => {
    expect(
      toReportGenerationHistoryRow({
        id: "generation-1",
        payload: {
          title: "Rapport d'impact - Paris - Par défaut",
          rubrique: "reporting",
          periode: "six_months",
          organizationType: "Global",
          data: { generatedAt: "2026-08-27T10:30:00.000Z" },
        },
        scopeLabel: "Paris",
        detailLevel: "default",
        generatedAt: "2026-08-27T10:30:00.000Z",
      }),
    ).toMatchObject({
      id: "generation-1",
      report: "Rapport d'impact - Paris - Par défaut",
      period: "Six mois",
      perimeter: "Paris",
      detail: "Par défaut (12 à 16 pages)",
      generatedAt: expect.any(String),
    });
  });

  it("rejects invalid dates and malformed API rows", () => {
    expect(formatReportGenerationDate("not-a-date")).toBeNull();
    expect(isReportGenerationHistoryRow(null)).toBe(false);
    expect(isReportGenerationHistoryRow({ id: "only-id" })).toBe(false);
    expect(
      isReportGenerationHistoryRow({
        id: "generation-1",
        report: "Rapport",
        period: "Six mois",
        perimeter: "Global",
        detail: "Concis",
        generatedAt: "27/08/2026",
      }),
    ).toBe(true);
  });
});
