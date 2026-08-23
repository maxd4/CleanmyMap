import { describe, expect, it } from "vitest";
import {
  buildRecentReports,
  buildPdfData,
  buildReportTitle,
  buildScopeSelectValue,
  detailLevelLabel,
  detailLevelToModules,
  periodLabel,
  parseScopeSelectValue,
} from "./reports-web-document.shared";

describe("reports web document shared helpers", () => {
  it("round-trips scope select values", () => {
    expect(buildScopeSelectValue("account", "compte-1")).toBe("account:compte-1");
    expect(parseScopeSelectValue("account:compte-1")).toEqual({
      kind: "account",
      value: "compte-1",
    });
    expect(parseScopeSelectValue("invalid")).toEqual({
      kind: "global",
      value: "",
    });
  });

  it("maps detail levels to module toggles", () => {
    expect(detailLevelToModules("concis")).toEqual({
      dataAndCartography: true,
      environmentalImpact: true,
      rawData: false,
      detailedFiles: false,
    });
    expect(detailLevelToModules("exhaustif")).toEqual({
      dataAndCartography: true,
      environmentalImpact: true,
      rawData: true,
      detailedFiles: true,
    });
  });

  it("builds readable report labels", () => {
    expect(detailLevelLabel("default")).toBe("Par défaut (12 à 16 pages)");
    expect(buildReportTitle("Global", "default")).toBe("Rapport d'impact - Global - Par défaut");

    const rows = buildRecentReports({
      overviewGeneratedAt: "2026-05-04T14:30:00.000Z",
      activeScopeLabel: "Global",
      period: "current_year",
      detailLevel: "default",
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]?.period).toBe("Année en cours");
    expect(rows[2]?.detail).toBe("Exhaustif (20 à 28 pages)");
  });

  it("keeps the supported periods and filter labels stable", () => {
    expect(periodLabel("six_months")).toBe("Six mois");
    expect(periodLabel("current_year")).toBe("Année en cours");
    expect(periodLabel("full_history")).toBe("Historique complet");
    expect(buildRecentReports({
      overviewGeneratedAt: "2026-06-01T00:00:00.000Z",
      activeScopeLabel: "Paris",
      period: "full_history",
      detailLevel: "concis",
    })[0]).toMatchObject({
      period: "Historique complet",
      perimeter: "Paris",
      detail: "Concis (6 à 8 pages)",
    });
  });

  it("builds PDF payloads with the selected period and detail level", () => {
    const pdf = buildPdfData({
      reportTitle: "Rapport d'impact - Paris - Exhaustif",
      scopeLabel: "Paris",
      period: "full_history",
      detailLevel: "exhaustif",
      surfaceProxy: 42,
      model: {
        weatherAdvice: "Conditions stables.",
        wasteProfile: {
          dominantLabel: "Plastique",
          coveragePercent: 100,
          categories: [],
        },
        accountScopeCoverage: { coveragePercent: 100 },
        exportRows: [{ Date: "2026-06-01", Masse_Kg: 4.5 }],
        report: {
          executive: {
            summary: "Résumé contrôlé.",
            watchouts: [],
            budgetUseCases: ["Prioriser le terrain."],
            readinessLabel: "Prêt",
            readinessScore: 92,
            evidence: [],
            headline: "Impact suivi",
          },
          totals: { actions: 2, kg: 4.5, volunteers: 3, butts: 1, hours: 2 },
          map: { geoCoverage: 80, traceCoverage: 75, points: 5 },
          terrain: { spotCount: 1 },
          climate: { co2AvoidedKg: 2.5, waterProtectedLiters: 10 },
          recycling: { triIndex: 70 },
          quality: { completenessScore: 95, coherenceScore: 90 },
          impactMethodology: {
            sources: { local: "fixture" },
            pollutionScoreAverage: 65,
            proxyVersion: "v1",
            qualityRulesVersion: "v1",
            formulas: [],
          },
          community: { totalEvents: 1, participationRate: 50, topLeaderboard: [] },
          areas: [{ area: "Paris", actions: 2, kg: 4.5, recurrence: "stable", score: 80 }],
          trendPercent: 4,
          moderation: { approved: 2, rejected: 0, delayDays: 1 },
          calendar: [],
        },
        dataAvailability: {
          isTruncated: true,
          communityEventsAvailability: "available",
        },
      } as never,
    });

    expect(pdf.title).toBe("Rapport d'impact - Paris - Exhaustif");
    expect(pdf.rows).toEqual([{ Date: "2026-06-01", Masse_Kg: 4.5 }]);
    expect(pdf.chapters[0]?.lines).toContain("Période: Historique complet · Exhaustif (20 à 28 pages).");
    expect(pdf.chapters[0]?.lines).toContain(
      "Données potentiellement partielles : la limite de chargement a été atteinte.",
    );
  });
});
