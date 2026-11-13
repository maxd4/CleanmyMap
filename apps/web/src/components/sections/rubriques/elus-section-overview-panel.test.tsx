import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/pilotage/decision-cluster-section", () => ({
  DecisionClusterSection: () => React.createElement("div", { "data-testid": "decision-cluster" }),
}));

vi.mock("@/components/pilotage/pilotage-cluster-panels", () => ({
  buildPilotageClusterMetrics: (kpis: unknown[]) => kpis,
  PilotageInsightCard: ({ insight }: { insight: { title: string; detail: string; actionLabel: string } }) =>
    React.createElement(
      "aside",
      { "data-testid": "pilotage-insight" },
      insight.title,
      insight.detail,
      insight.actionLabel,
    ),
  PilotageMetricGrid: () => React.createElement("div", { "data-testid": "pilotage-metrics" }),
}));

import { ElusSectionOverviewPanel } from "./elus-section-overview-panel";

const data = {
  summary: {
    kpis: [
      {
        id: "neutral",
        label: "IUR (Sobriété)",
        value: "Indisponible",
        previousValue: "Indisponible",
        deltaAbsolute: "Non comparable",
        deltaPercent: "Non comparable",
        interpretation: "neutral" as const,
      },
    ],
    alert: {
      severity: "low" as const,
      title: "Aucune alerte prioritaire",
      detail: "Le pilotage ne detecte pas d'urgence immediate sur la fenetre courante.",
    },
    recommendedAction: {
      href: "/reports",
      label: "Renforcer geo-couverture",
      reason: "Qualite data en baisse (-2.0 pt, score actuel 72.0%).",
    },
  },
} as never;

describe("ElusSectionOverviewPanel", () => {
  it("preserves neutral semantics and localized French period/action text", () => {
    const markup = renderToStaticMarkup(
      <ElusSectionOverviewPanel data={data} locale="fr" />,
    );

    expect(markup).toContain("Analyses détaillées et tendances");
    expect(markup).toContain("Période : 30 derniers jours");
    expect(markup).toContain("Renforcer la géocouverture");
    expect(markup).toContain("bg-slate-500/15");
    expect(markup).not.toContain("bg-rose-500/10");
    expect(markup).not.toContain("TrendingDown");
  });

  it("renders English copy without changing the period or KPI values", () => {
    const markup = renderToStaticMarkup(
      <ElusSectionOverviewPanel data={data} locale="en" />,
    );

    expect(markup).toContain("Detailed analytics and trends");
    expect(markup).toContain("Period: last 30 days");
    expect(markup).toContain("IUR (Sustainability)");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Strengthen geographic coverage");
    expect(markup).not.toContain("Période : 30 derniers jours");
  });
});
