import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StorageBusinessContributionPanel } from "./storage-business-contribution-panel";
import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";

const report: StorageBusinessContributionReport = {
  previousSnapshotMonth: "2026-04-01",
  historyMonths: ["2026-05-01", "2026-04-01", "2026-03-01"],
  alerts: [],
  items: [
    {
      id: "socle_estimateur_impact",
      label: "Socle d’estimateur d’impact",
      description: "Exports, rapports et livrables du socle d’estimation.",
      currentBytes: 4_000,
      currentCount: 2,
      currentSharePercent: 40,
      currentAverageBytes: 2_000,
      previousBytes: 2_000,
      previousCount: 1,
      deltaBytes: 2_000,
      deltaPercent: 100,
      deltaCount: 1,
      cumulative3MonthBytes: 2_000,
      cumulative3MonthPercent: 100,
      accelerationBytes: 1_000,
      accelerationPercent: 100,
      history: [
        {
          snapshotMonth: "2026-05-01",
          monthLabel: "mai 2026",
          currentBytes: 4_000,
          currentCount: 2,
          sharePercent: 40,
          deltaBytes: 2_000,
          deltaCount: 1,
          deltaPercent: 100,
          cumulative3MonthBytes: 2_000,
          cumulative3MonthPercent: 100,
          accelerationBytes: 1_000,
          accelerationPercent: 100,
        },
      ],
      topFiles: [
        {
          bucketId: "prints",
          bucketLabel: "prints",
          name: "reports/rapport-1.pdf",
          extension: "pdf",
          bytes: 2_500,
          sizeLabel: "2.44 KB",
          createdAt: null,
          updatedAt: null,
        },
      ],
      mimeSubtypes: [
        {
          key: "application/pdf",
          label: "application/pdf",
          bytes: 4_000,
          count: 2,
          sharePercent: 100,
          averageBytes: 2_000,
        },
      ],
      alerts: [],
    },
  ],
};

describe("StorageBusinessContributionPanel", () => {
  it("renders the monthly donut and selection summary for each business category", () => {
    const markup = renderToStaticMarkup(
      React.createElement(StorageBusinessContributionPanel, {
        report,
      }),
    );

    expect(markup).toContain("Contribution par catégorie");
    expect(markup).toContain("Camembert mensuel");
    expect(markup).toContain("Stockage");
    expect(markup).toContain("Pression");
    expect(markup).toContain("Détail sélectionné");
    expect(markup).toContain("Mois N-1: avril 2026");
    expect(markup).toContain("Volume absolu");
    expect(markup).toContain("Part relative");
    expect(markup).toContain("Évolution mensuelle");
    expect(markup).toContain("Top sous-types MIME");
    expect(markup).toContain("application/pdf");
    expect(markup).toContain("100% du domaine");
  });
});
