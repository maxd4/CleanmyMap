import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";
import type { MethodDefinition } from "@/lib/pilotage/overview.types";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { ReportsAnalysisDashboard } from "./reports-analysis-dashboard";

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) =>
    React.createElement("header", null, title, subtitle, action),
}));

vi.mock("@/components/reports/analytics-cockpit", () => ({
  AnalyticsCockpit: () => React.createElement("div", { "data-testid": "analytics-cockpit" }),
}));

const report = {
  generatedAt: "2026-08-26T12:00:00.000Z",
  totals: { actions: 2, kg: 12.3, butts: 4, volunteers: 3, hours: 4.5 },
  map: { points: 2, traces: 1, polylines: 1, polygons: 0, geoCoverage: 81.2, traceCoverage: 63.4 },
  quality: { completenessScore: 91.3, coherenceScore: 87.6, freshnessDays: 2.5, geolocRate: 81.2 },
  recycling: { recyclableKg: 6.7, triIndex: 72.4 },
  climate: {
    six: { actions: 2, kg: 12.3, butts: 4 },
    twelve: { actions: 2, kg: 12.3, butts: 4 },
    waterProtectedLiters: 250,
    co2AvoidedKg: 14.4,
  },
} as unknown as ReportModel;

const method: MethodDefinition = {
  id: "co2",
  kpi: "Émissions évitées (proxy)",
  formula: "Σ(quantité triée × facteur d’émission)",
  source: "Calculateur d’impact existant",
  recalc: "Déclenché lors du rafraîchissement de l’overview.",
  limits: "Proxy, non mesure instrumentale.",
};

const monthlyData: MonthlyAnalyticsPoint[] = [{ month: "2026-08", kg: 12.3, volunteers: 3 }];

describe("ReportsAnalysisDashboard contract", () => {
  it("renders ReportModel fields with qualified labels and native units", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsAnalysisDashboard, {
        locale: "fr",
        roleLabel: "Bénévole",
        primaryAction: { href: "/actions/new", label: { fr: "Déclarer", en: "Declare" }, description: { fr: "", en: "" } },
        secondaryAction: null,
        summaryKpis: [],
        methods: [method],
        report,
        periodDays: 90,
        monthlyData,
      }),
    );

    expect(markup).toContain("Émissions évitées (proxy)");
    expect(markup).toContain("14,4");
    expect(markup).toContain("kg CO₂e");
    expect(markup).toContain("Eau préservée (proxy)");
    expect(markup).toContain("250");
    expect(markup).toContain(">L</span>");
    expect(markup).toContain("Masse recyclable estimée");
    expect(markup).toContain("6,7");
    expect(markup).toContain(">kg</span>");
    expect(markup).toContain("Indice de tri (proxy)");
    expect(markup).toContain("72,4");
    expect(markup).toContain("Score affiché en %");
    expect(markup).toContain("Complétude des données");
    expect(markup).toContain("Cohérence des données");
    expect(markup).toContain("Couverture géolocalisée");
    expect(markup).toContain("Couverture des traces");
  });

  it("keeps quality metrics distinct from environmental impact claims", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsAnalysisDashboard, {
        locale: "fr",
        roleLabel: "Bénévole",
        primaryAction: { href: "/actions/new", label: { fr: "Déclarer", en: "Declare" }, description: { fr: "", en: "" } },
        summaryKpis: [],
        methods: [method],
        report,
        periodDays: 90,
        monthlyData,
      }),
    );

    expect(markup).not.toContain("Pollution de l’air évitée");
    expect(markup).not.toContain("Pollution des sols évitée");
    expect(markup).not.toContain("Incertitudes");
    expect(markup).not.toContain("78%");
    expect(markup).not.toContain("45%");
    expect(markup).not.toContain("92%");
    expect(markup).not.toContain("65%");
  });

  it("exposes keyboard-navigable disclosure markup for the methodology", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsAnalysisDashboard, {
        locale: "fr",
        roleLabel: "Bénévole",
        primaryAction: { href: "/actions/new", label: { fr: "Déclarer", en: "Declare" }, description: { fr: "", en: "" } },
        summaryKpis: [],
        methods: [method],
        report,
        periodDays: 90,
        monthlyData,
      }),
    );

    expect(markup).toContain("<details");
    expect(markup).toContain("<summary");
    expect(markup).toContain("Source");
    expect(markup).toContain("Recalcul");
    expect(markup).toContain("Limites");
    expect(markup).toContain("90 jours glissants");
  });
});
