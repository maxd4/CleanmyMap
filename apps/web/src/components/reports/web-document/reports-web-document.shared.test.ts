import { describe, expect, it } from "vitest";
import {
  buildRecentReports,
  buildPdfData,
  buildReportTitle,
  buildScopeSelectValue,
  detailLevelLabel,
  detailLevelToModules,
  type ModuleState,
  REPORT_MODULE_DEFINITIONS,
  REQUIRED_CORE_CHAPTER_IDS,
  periodLabel,
  parseScopeSelectValue,
} from "./reports-web-document.shared";

const fixtureModel = {
  weatherAdvice: "Conditions stables.",
  wasteProfile: {
    dominantLabel: "Plastique",
    coveragePercent: 100,
    categories: [],
  },
  accountScopeCoverage: { coveragePercent: 100 },
  exportRows: [{ Date: "2026-06-01", Masse_Kg: 4.5 }],
  dataAvailability: {},
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
} as unknown as Parameters<typeof buildPdfData>[0]["model"];

function buildPdfDataWithModules(modules: ModuleState) {
  return buildPdfData({
    reportTitle: "Rapport d'impact - Paris - Exhaustif",
    scopeLabel: "Paris",
    period: "full_history",
    detailLevel: "exhaustif",
    modules,
    surfaceProxy: 42,
    model: fixtureModel,
  });
}

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
      transparencyAndMethods: true,
      rawData: false,
      detailedFiles: false,
    });
    expect(detailLevelToModules("exhaustif")).toEqual({
      dataAndCartography: true,
      transparencyAndMethods: true,
      rawData: true,
      detailedFiles: true,
    });
    expect(detailLevelToModules("default")).toEqual({
      dataAndCartography: true,
      transparencyAndMethods: true,
      rawData: false,
      detailedFiles: true,
    });
  });

  it("keeps the three core chapters and removes every disabled module from PDF chapters and raw rows", () => {
    const allModules = detailLevelToModules("exhaustif");
    const fullPdf = buildPdfDataWithModules(allModules);
    const fullChapterIds = fullPdf.chapters.map((chapter) => chapter.id);

    for (const definition of REPORT_MODULE_DEFINITIONS) {
      const modules = { ...allModules, [definition.id]: false } as ModuleState;
      const pdf = buildPdfDataWithModules(modules);
      const chapterIds = pdf.chapters.map((chapter) => chapter.id);

      expect(definition.chapterIds.every((chapterId) => !chapterIds.includes(chapterId))).toBe(true);
      expect(chapterIds).toEqual(
        fullChapterIds.filter((chapterId) => !definition.chapterIds.some((definitionChapterId) => definitionChapterId === chapterId)),
      );
      expect(REQUIRED_CORE_CHAPTER_IDS.every((chapterId) => chapterIds.includes(chapterId))).toBe(true);
    }

    const noModulesPdf = buildPdfDataWithModules({
      dataAndCartography: false,
      transparencyAndMethods: false,
      rawData: false,
      detailedFiles: false,
    });
    expect(noModulesPdf.rows).toEqual([]);
    expect(noModulesPdf.columns).toEqual([]);
    expect(noModulesPdf.summary).toContain("Modules optionnels inclus: aucun module optionnel.");
    expect(noModulesPdf.summary.join(" ")).not.toContain("Qualité de données:");
    expect(noModulesPdf.stats.map((stat) => stat.label)).not.toContain("Couverture géographique");
  });

  it("supports a custom combination with the same selection contract used by the PDF summary", () => {
    const pdf = buildPdfDataWithModules({
      dataAndCartography: true,
      transparencyAndMethods: false,
      rawData: true,
      detailedFiles: false,
    });
    const chapterIds = pdf.chapters.map((chapter) => chapter.id);

    expect(chapterIds).toEqual([
      "synthese-executive",
      "perimetre-rapport",
      "resultats-terrain",
      "cartographie-impact",
      "contexte-local",
      "communaute-mobilisation",
      "recommandations-operationnelles",
      "calendrier-previsionnel",
    ]);
    expect(chapterIds).not.toContain("indicateurs-environnementaux");
    expect(chapterIds).not.toContain("methodologie-fiabilite");
    expect(chapterIds).not.toContain("gouvernance-transparence");
    expect(chapterIds).not.toContain("glossaire-simplifie");
    expect(chapterIds).not.toContain("annexes");
    expect(pdf.rows).toEqual(fixtureModel.exportRows);
    expect(pdf.summary).toContain("Modules optionnels inclus: Données & cartographie, Données brutes.");
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
      modules: detailLevelToModules("exhaustif"),
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
