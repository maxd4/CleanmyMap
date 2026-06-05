import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EnvironmentalImpactSnapshotRecord } from "@/lib/environmental-impact-estimator/types";
import { MonthlyImpactHistoryChart } from "./monthly-impact-history-chart";

function snapshot(
  overrides: Partial<EnvironmentalImpactSnapshotRecord> & Pick<EnvironmentalImpactSnapshotRecord, "snapshotDate" | "monthlyKgCo2eProxy">,
): EnvironmentalImpactSnapshotRecord {
  return {
    id: overrides.id ?? `snapshot-${overrides.snapshotDate}`,
    snapshotKey: overrides.snapshotKey ?? "cleanmymap-project",
    snapshotDate: overrides.snapshotDate,
    generatedAt: overrides.generatedAt ?? `${overrides.snapshotDate}T12:00:00.000Z`,
    version: overrides.version ?? "environmental-impact-estimator-test",
    totalKgCo2eProxy: overrides.totalKgCo2eProxy ?? overrides.monthlyKgCo2eProxy,
    monthlyKgCo2eProxy: overrides.monthlyKgCo2eProxy,
    annualKgCo2eProxy: overrides.annualKgCo2eProxy ?? null,
    siteKgCo2eProxy: overrides.siteKgCo2eProxy ?? null,
    userKgCo2eProxy: overrides.userKgCo2eProxy ?? null,
    confidencePercent: overrides.confidencePercent ?? 80,
    uncertaintyPercent: overrides.uncertaintyPercent ?? 20,
    launchedAt: overrides.launchedAt ?? "2026-02-24T00:00:00.000Z",
    accountCreatedAt: overrides.accountCreatedAt ?? null,
    model: overrides.model ?? ({} as EnvironmentalImpactSnapshotRecord["model"]),
    signals: overrides.signals ?? ({} as EnvironmentalImpactSnapshotRecord["signals"]),
  };
}

describe("MonthlyImpactHistoryChart", () => {
  it("renders the monthly pollution curve and the dotted AI development curve", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MonthlyImpactHistoryChart, {
        snapshots: [
          snapshot({ snapshotDate: "2026-02-28", monthlyKgCo2eProxy: 1.1 }),
          snapshot({ snapshotDate: "2026-03-31", monthlyKgCo2eProxy: 1.5 }),
          snapshot({ snapshotDate: "2026-04-30", monthlyKgCo2eProxy: 1.7 }),
          snapshot({ snapshotDate: "2026-05-31", monthlyKgCo2eProxy: 1.9 }),
          snapshot({ snapshotDate: "2026-06-05", monthlyKgCo2eProxy: 2.2 }),
        ],
        launchedAt: "2026-02-24T00:00:00.000Z",
        generatedAt: "2026-06-05T12:00:00.000Z",
      }),
    );

    expect(markup).toContain("Historique mensuel");
    expect(markup).toContain("Courbe de pollution et impact IA de développement");
    expect(markup).toContain("environmental_impact_snapshots");
    expect(markup).toContain("10 h = 20 kWh");
    expect(markup).toContain("10 h = 2 kgCO2e");
    expect(markup).toContain("10 h = 20 km voiture thermique");
    expect(markup).toContain("10 h = 100 L d");
    expect(markup).toContain('stroke-dasharray="10 8"');
    expect(markup).toContain("févr. 2026");
    expect(markup).toContain("mars 2026");
    expect(markup).toContain("avr. 2026");
    expect(markup).toContain("mai 2026");
    expect(markup).toContain("juin 2026");
    expect(markup).not.toContain("Aucun historique mensuel");
    expect(markup).not.toContain(">NA<");
  });

  it("shows NA when no monthly history is available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MonthlyImpactHistoryChart, {
        snapshots: [],
        launchedAt: null,
        generatedAt: null,
      }),
    );

    expect(markup).toContain("NA");
    expect(markup).toContain("Aucun historique mensuel");
  });
});
