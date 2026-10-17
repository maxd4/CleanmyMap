import { describe, expect, it } from "vitest";
import { buildOfficialReportHtml } from "@/lib/pdf-export/official-report-html";
import {
  DEFAULT_REPORT_DETAIL_LEVEL,
  DEFAULT_REPORT_GENERATION_PERIOD,
  DEFAULT_REPORT_MODULES,
  buildPdfData,
  buildScopeSelectValue,
  type ModuleState,
  REPORT_MODULE_DEFINITIONS,
  REQUIRED_CORE_CHAPTER_IDS,
  periodLabel,
  reportPeriodLabel,
  parseScopeSelectValue,
  detailLevelLabel,
  detailLevelDescription,
  resolveReportExportStatus,
} from "./reports-web-document.shared";

const fixtureModel = {
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
    totals: {
      actions: 2,
      kg: 4.5,
      knownWasteActions: 1,
      volunteers: 3,
      volunteersKnownActions: 1,
      volunteersActionCount: 2,
      volunteersCoverageRate: 50,
      butts: 1,
      buttsKnownActions: 1,
      buttsActionCount: 2,
      buttsCoverageRate: 50,
      hours: 2,
    },
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
    routeDistance: 1.2,
    routeSteps: [
      {
        index: 1,
        label: "Action sans mesure",
        kg: 0,
        wasteKnown: false,
        butts: 0,
        buttsKnown: false,
        segmentKm: 0,
        latitude: 48.85,
        longitude: 2.35,
      },
      {
        index: 2,
        label: "Action mesurée",
        kg: 4.5,
        wasteKnown: true,
        butts: 0,
        buttsKnown: true,
        segmentKm: 1.2,
        latitude: 48.86,
        longitude: 2.36,
      },
    ],
    monthRows6: [],
    monthRows12: [
      {
        month: "2026-01",
        actions: 1,
        kg: 0,
        knownWasteActions: 0,
        butts: 0,
        buttsKnownActions: 0,
        volunteers: 0,
        volunteersKnownActions: 0,
        minutes: 30,
      },
      {
        month: "2026-02",
        actions: 1,
        kg: 4.5,
        knownWasteActions: 1,
        butts: 0,
        buttsKnownActions: 1,
        volunteers: 3,
        volunteersKnownActions: 1,
        minutes: 60,
      },
    ],
    highlightActions: [
      {
        id: "unknown-highlight",
        label: "Action sans mesure",
        kg: 0,
        wasteKnown: false,
        butts: 0,
        buttsKnown: false,
        photos: ["data:image/png;base64,fixture"],
      },
      {
        id: "measured-highlight",
        label: "Action mesurée",
        kg: 4.5,
        wasteKnown: true,
        butts: 0,
        buttsKnown: true,
        photos: ["data:image/png;base64,fixture"],
      },
    ],
    highlightPhotos: [],
  },
} as unknown as Parameters<typeof buildPdfData>[0]["model"];

function buildPdfDataWithModules(modules: ModuleState) {
  return buildPdfData({
    reportTitle: "Rapport d'impact - Paris - Par défaut",
    scopeLabel: "Paris",
    period: "full_history",
    detailLevel: "default",
    modules,
    surfaceProxy: 42,
    model: fixtureModel,
  });
}

describe("reports web document shared helpers", () => {
  it("round-trips scope select values", () => {
    expect(buildScopeSelectValue("global", "")).toBe("global");
    expect(parseScopeSelectValue("global")).toEqual({
      kind: "global",
      value: "",
    });
    expect(parseScopeSelectValue("")).toEqual({
      kind: "global",
      value: "",
    });
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

  it("produces distinct document densities without changing common KPI values", () => {
    expect(DEFAULT_REPORT_MODULES).toEqual({
      dataAndCartography: true,
      transparencyAndMethods: true,
      rawData: false,
      detailedFiles: true,
    });

    const outputs = (["concis", "default", "exhaustif"] as const).map((detailLevel) =>
      buildPdfData({
        reportTitle: "Rapport d'impact - Paris",
        scopeLabel: "Paris",
        period: "full_history",
        detailLevel,
        modules: DEFAULT_REPORT_MODULES,
        surfaceProxy: 42,
        model: fixtureModel,
      }),
    );
    const [concise, standard, exhaustive] = outputs;
    expect(concise?.chapters.map((chapter) => chapter.id)).toEqual(
      standard?.chapters.map((chapter) => chapter.id),
    );
    expect(exhaustive?.chapters.length).toBeGreaterThan(standard?.chapters.length ?? 0);
    expect(concise?.rows).toEqual([]);
    expect(concise?.columns).toEqual([]);
    expect(JSON.stringify(concise)).not.toBe(JSON.stringify(standard));
    expect(JSON.stringify(standard)).not.toBe(JSON.stringify(exhaustive));
    const rendered = outputs.map((data) => buildOfficialReportHtml({
      title: data.title,
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "multi_action",
      data,
    }));
    expect(rendered[0]).not.toContain("Détails spatiaux");
    expect(rendered[1]).not.toContain("Détails spatiaux");
    expect(rendered[2]).toContain("Détails spatiaux");
    expect(outputs.every((output) => output.chapters.every((chapter) => !chapter.locked))).toBe(true);

    for (const label of ["Actions", "Masse impact (calculée)", "Mégots", "Bénévoles"]) {
      const values = outputs.map((output) => output.stats.find((stat) => stat.label === label)?.value);
      expect(values[0]).toBe(values[1]);
      expect(values[1]).toBe(values[2]);
    }
  });

  it("keeps the three core chapters and removes every disabled module from PDF chapters and raw rows", () => {
    const allModules = { ...DEFAULT_REPORT_MODULES, rawData: true };
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

  it("keeps exhaustive supplements independent from module activation", () => {
    const exhaustiveRawOnly = buildPdfData({
      reportTitle: "Rapport d'impact - Paris - Exhaustif",
      scopeLabel: "Paris",
      period: "full_history",
      detailLevel: "exhaustif",
      modules: {
        dataAndCartography: false,
        transparencyAndMethods: false,
        rawData: true,
        detailedFiles: false,
      },
      surfaceProxy: 42,
      model: fixtureModel,
    });
    const rawOnlyChapterIds = exhaustiveRawOnly.chapters.map((chapter) => chapter.id);

    expect(rawOnlyChapterIds).toContain("tendance-mensuelle-detaillee");
    expect(rawOnlyChapterIds).not.toContain("details-spatiaux");
    expect(rawOnlyChapterIds).not.toContain("sources-et-limites");
    expect(rawOnlyChapterIds).not.toContain("actions-mises-en-avant");

    const conciseRawOnly = buildPdfData({
      reportTitle: "Rapport d'impact - Paris - Concis",
      scopeLabel: "Paris",
      period: "full_history",
      detailLevel: "concis",
      modules: {
        dataAndCartography: false,
        transparencyAndMethods: false,
        rawData: true,
        detailedFiles: false,
      },
      surfaceProxy: 42,
      model: fixtureModel,
    });

    expect(conciseRawOnly.rows).toEqual([]);
    expect(conciseRawOnly.chapters.map((chapter) => chapter.id)).not.toContain(
      "tendance-mensuelle-detaillee",
    );
  });

  it("uses row-level availability in every exhaustive table", () => {
    const pdf = buildPdfData({
      reportTitle: "Rapport d'impact - Paris - Exhaustif",
      scopeLabel: "Paris",
      period: "full_history",
      detailLevel: "exhaustif",
      modules: {
        dataAndCartography: true,
        transparencyAndMethods: true,
        rawData: true,
        detailedFiles: true,
      },
      surfaceProxy: 42,
      model: fixtureModel,
    });

    const spatialRows = pdf.chapters.find((chapter) => chapter.id === "details-spatiaux")?.rows;
    expect(spatialRows).toEqual([
      expect.objectContaining({ Zone: "Action sans mesure", "Masse (kg)": "n/a", Mégots: "n/a" }),
      expect.objectContaining({ "Masse (kg)": "4.5", Mégots: 0 }),
    ]);

    const monthlyRows = pdf.chapters.find((chapter) => chapter.id === "tendance-mensuelle-detaillee")?.rows;
    expect(monthlyRows).toEqual([
      expect.objectContaining({ Mois: "2026-01", "Masse (kg)": "n/a", Mégots: "n/a", Bénévoles: "n/a" }),
      expect.objectContaining({ Mois: "2026-02", "Masse (kg)": "4.5", Mégots: 0, Bénévoles: 3 }),
    ]);

    const highlightedRows = pdf.chapters.find((chapter) => chapter.id === "actions-mises-en-avant")?.rows;
    expect(highlightedRows).toEqual([
      expect.objectContaining({ Lieu: "Action sans mesure", "Masse (kg)": "n/a", Mégots: "n/a" }),
      expect.objectContaining({ Lieu: "Action mesurée", "Masse (kg)": "4.5", Mégots: 0 }),
    ]);

    const rendered = buildOfficialReportHtml({
      title: pdf.title,
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "multi_action",
      data: pdf,
    });
    expect(rendered).toContain("Action sans mesure");
    expect(rendered).toContain("n/a");
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
      "resultats-terrain",
      "perimetre-rapport",
      "cartographie-impact",
      "contexte-local",
      "communaute-mobilisation",
    ]);
    expect(chapterIds).not.toContain("indicateurs-environnementaux");
    expect(chapterIds).not.toContain("methodologie-fiabilite");
    expect(chapterIds).not.toContain("gouvernance-transparence");
    expect(chapterIds).not.toContain("glossaire-simplifie");
    expect(chapterIds).not.toContain("annexes");
    expect(pdf.rows).toEqual(fixtureModel.exportRows);
    expect(pdf.summary).toContain("Modules optionnels inclus: Données & cartographie, Données brutes.");
  });

  it("keeps the shareable hierarchy factual and does not expose participant names", () => {
    const pdf = buildPdfData({
      reportTitle: "Rapport d'impact - Action terrain",
      scopeLabel: "Action terrain",
      period: "full_history",
      detailLevel: "default",
      modules: {
        dataAndCartography: false,
        transparencyAndMethods: true,
        rawData: true,
        detailedFiles: true,
      },
      surfaceProxy: null,
      provenance: {
        type: "single_action",
        actionId: "action-canonique-1",
        source: "public.actions",
        resolvedAt: "2026-08-27T12:00:00.000Z",
      },
      model: {
        ...fixtureModel,
        report: {
          ...fixtureModel.report,
          areas: [],
          calendar: [],
          community: {
            ...fixtureModel.report.community,
            topLeaderboard: [{ name: "Nom privé", actions: 1, kg: 2, butts: 3 }],
          },
        },
      },
    });

    expect(pdf.chapters.map((chapter) => chapter.id)).toEqual([
      "synthese-executive",
      "resultats-terrain",
      "perimetre-rapport",
      "indicateurs-environnementaux",
      "gouvernance-transparence",
      "methodologie-fiabilite",
      "communaute-mobilisation",
      "glossaire-simplifie",
    ]);
    expect(pdf.chapters.find((chapter) => chapter.id === "perimetre-rapport")?.lines).toContain(
      "Action canonique: action-canonique-1.",
    );
    expect(pdf.chapters.find((chapter) => chapter.id === "perimetre-rapport")?.lines).toContain(
      "Titre de l'action: Action terrain.",
    );
    expect(pdf.chapters.find((chapter) => chapter.id === "indicateurs-environnementaux")?.title).toBe(
      "Impacts et proxys qualifiés",
    );
    expect(pdf.chapters.find((chapter) => chapter.id === "gouvernance-transparence")?.title).toBe(
      "Qualité, couverture et transparence",
    );
    expect(pdf.chapters.find((chapter) => chapter.id === "indicateurs-environnementaux")?.lines).toContain(
      "Les valeurs CO2e, eau, voirie et surface sont des proxys ; elles ne constituent pas des mesures physiques directes.",
    );
    expect(pdf.chapters.find((chapter) => chapter.id === "communaute-mobilisation")?.rows).toBeUndefined();
    expect(JSON.stringify(pdf)).not.toContain("Nom privé");
    expect(JSON.stringify(pdf)).not.toContain("recommandations-operationnelles");

    const html = buildOfficialReportHtml({
      title: pdf.title,
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "single_action",
      organizationName: "Action terrain",
      data: pdf,
    });
    expect(html).toContain("Sommaire cliquable");
    expect(html).toContain("Impacts et proxys qualifiés");
    expect(html).not.toContain("Nom privé");
    expect(html).not.toContain("Recommandations opérationnelles");
    expect(html.indexOf("Résultats terrain")).toBeLessThan(html.indexOf("Périmètre du rapport"));
    expect(html.indexOf("Périmètre du rapport")).toBeLessThan(html.indexOf("Impacts et proxys qualifiés"));
    expect(html).not.toContain("Calendrier prévisionnel");
    expect(html).not.toContain("Annexes");
  });

  it("keeps same-titled mono-action PDFs distinguishable by canonical action id", () => {
    const buildSingleActionPdf = (actionId: string) => buildPdfData({
      reportTitle: "Rapport d'impact - Action terrain",
      scopeLabel: "Action terrain",
      period: "full_history",
      detailLevel: "default",
      modules: {
        dataAndCartography: false,
        transparencyAndMethods: true,
        rawData: false,
        detailedFiles: false,
      },
      surfaceProxy: null,
      provenance: {
        type: "single_action",
        actionId,
        source: "public.actions",
        resolvedAt: "2026-08-27T12:00:00.000Z",
      },
      model: fixtureModel,
    });

    const first = buildSingleActionPdf("11111111-1111-4111-8111-111111111111");
    const second = buildSingleActionPdf("22222222-2222-4222-8222-222222222222");
    const firstPerimeter = first.chapters.find((chapter) => chapter.id === "perimetre-rapport");
    const secondPerimeter = second.chapters.find((chapter) => chapter.id === "perimetre-rapport");

    expect(firstPerimeter?.lines).toEqual(expect.arrayContaining([
      "Action canonique: 11111111-1111-4111-8111-111111111111.",
      "Titre de l'action: Action terrain.",
    ]));
    expect(secondPerimeter?.lines).toEqual(expect.arrayContaining([
      "Action canonique: 22222222-2222-4222-8222-222222222222.",
      "Titre de l'action: Action terrain.",
    ]));
    expect(firstPerimeter?.lines).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(secondPerimeter?.lines).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(JSON.stringify(first)).not.toMatch(/Clerk|preparationData|notes logistiques|Nom privé/i);
    expect(JSON.stringify(second)).not.toMatch(/Clerk|preparationData|notes logistiques|Nom privé/i);
  });

  it("keeps the supported periods and filter labels stable", () => {
    expect(DEFAULT_REPORT_GENERATION_PERIOD).toBe("six_months");
    expect(DEFAULT_REPORT_DETAIL_LEVEL).toBe("default");
    expect(periodLabel("six_months")).toBe("Six mois");
    expect(periodLabel("current_year")).toBe("Année en cours");
    expect(periodLabel("full_history")).toBe("Historique complet");
    expect(reportPeriodLabel("full_history", true)).toBe("Historique complet");
    expect(detailLevelLabel("default")).toBe("Par défaut");
    expect(detailLevelDescription("concis")).toContain("Résultats principaux");
    expect(detailLevelDescription("exhaustif")).toContain("Sources");
    expect(detailLevelLabel("default")).not.toMatch(/pages/i);
  });

  it.each([
    ["available", "ready", "Prêt à générer"],
    ["used", "quota-used", "Quota quotidien atteint"],
    ["unavailable", "quota-unavailable", "Quota indisponible"],
  ] as const)("resolves the %s quota state without a contradictory ready label", (quota, kind, label) => {
    const status = resolveReportExportStatus({
      state: "idle",
      hasData: true,
      isLoading: false,
      hasError: false,
      dailyExportAvailability: quota,
    });

    expect(status).toMatchObject({ kind, label });
    if (quota !== "available") {
      expect(status.label).not.toBe("Prêt à générer");
    }
  });

  it("prioritizes loading, errors and success over the quota copy", () => {
    expect(
      resolveReportExportStatus({
        state: "pending",
        hasData: true,
        isLoading: true,
        hasError: false,
        dailyExportAvailability: "used",
      }),
    ).toMatchObject({ kind: "loading", label: "Génération en cours" });
    expect(
      resolveReportExportStatus({
        state: "error",
        hasData: true,
        isLoading: false,
        hasError: false,
        dailyExportAvailability: "available",
        message: "Erreur de génération.",
      }),
    ).toMatchObject({ kind: "error", label: "Erreur d’export", description: "Erreur de génération." });
    expect(
      resolveReportExportStatus({
        state: "success",
        hasData: true,
        isLoading: false,
        hasError: false,
        dailyExportAvailability: "used",
      }),
    ).toMatchObject({ kind: "success", label: "Rapport généré", description: "Rapport imprimable ouvert." });
  });

  it("builds PDF payloads with the selected period and detail level", () => {
    const pdf = buildPdfData({
      reportTitle: "Rapport d'impact - Paris - Exhaustif",
      scopeLabel: "Paris",
      period: "full_history",
      detailLevel: "exhaustif",
      modules: { ...DEFAULT_REPORT_MODULES, rawData: true },
      surfaceProxy: 42,
      model: {
        ...fixtureModel,
        dataAvailability: {
          isTruncated: true,
          communityEventsAvailability: "available",
        },
      } as never,
    });

    expect(pdf.title).toBe("Rapport d'impact - Paris - Exhaustif");
    expect(pdf.rows).toEqual([{ Date: "2026-06-01", Masse_Kg: 4.5 }]);
    expect(pdf.chapters[0]?.lines).toContain(
      "Période: Historique complet · Exhaustif.",
    );
    expect(pdf.chapters.find((chapter) => chapter.id === "perimetre-rapport")?.lines).toContain(
      "Période analysée: Historique complet.",
    );
    expect(JSON.stringify(pdf)).not.toMatch(/weather|météo/i);
    expect(pdf.chapters[0]?.lines).toContain(
      "Données potentiellement partielles : la limite de chargement a été atteinte.",
    );
  });
});
