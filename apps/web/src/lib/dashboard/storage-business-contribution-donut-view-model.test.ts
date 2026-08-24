import { describe, expect, it } from "vitest";
import {
  buildPressureChartData,
  buildStorageBusinessContributionDonutViewModel,
  buildStorageChartData,
  computePressureValue,
  formatMonthReference,
  formatSignedPercent,
  getModeDescription,
  getModeLabel,
  getModeValueLabel,
} from "./storage-business-contribution-donut-view-model";
import type {
  StorageBusinessContributionHistoryPoint,
  StorageBusinessContributionItem,
  StorageBusinessContributionReport,
} from "@/lib/supabase/storage-business-contribution";

function makeHistoryPoint(
  overrides: Partial<StorageBusinessContributionHistoryPoint> = {},
): StorageBusinessContributionHistoryPoint {
  return {
    snapshotMonth: "2026-05-01",
    monthLabel: "mai 2026",
    currentBytes: 100,
    currentCount: 0,
    sharePercent: 0,
    deltaBytes: 0,
    deltaCount: 0,
    deltaPercent: 0,
    cumulative3MonthBytes: 0,
    cumulative3MonthPercent: 0,
    accelerationBytes: 0,
    accelerationPercent: 0,
    ...overrides,
  };
}

function makeItem(
  id: StorageBusinessContributionItem["id"],
  overrides: Partial<StorageBusinessContributionItem> = {},
): StorageBusinessContributionItem {
  return {
    id,
    label: id,
    description: "Test",
    currentBytes: 100,
    currentCount: 1,
    currentSharePercent: 50,
    currentAverageBytes: 100,
    previousBytes: 50,
    previousCount: 1,
    deltaBytes: 50,
    deltaPercent: 100,
    deltaCount: 0,
    cumulative3MonthBytes: 50,
    cumulative3MonthPercent: 100,
    accelerationBytes: 0,
    accelerationPercent: 0,
    history: [],
    topFiles: [],
    mimeSubtypes: [],
    alerts: [],
    ...overrides,
  };
}

function makeReport(items: StorageBusinessContributionItem[]): StorageBusinessContributionReport {
  return {
    previousSnapshotMonth: "2026-04-01",
    historyMonths: ["2026-05-01", "2026-04-01"],
    alerts: [],
    items,
  };
}

describe("storage business contribution donut view-model", () => {
  it("prépare les données stockage sans muter l'ordre du rapport", () => {
    const items = [
      makeItem("socle_estimateur_impact", {
        currentBytes: 200,
        previousBytes: 100,
        deltaBytes: 100,
        currentSharePercent: 40,
      }),
      makeItem("pieces_jointes_photo", {
        currentBytes: 500,
        previousBytes: 400,
        deltaBytes: 100,
        currentSharePercent: 60,
      }),
    ];
    const report = makeReport(items);

    const model = buildStorageBusinessContributionDonutViewModel(report, "storage");

    expect(model.data).toEqual([
      {
        key: "pieces_jointes_photo",
        label: "pieces_jointes_photo",
        value: 500,
        previousValue: 400,
        deltaValue: 100,
        deltaPercent: 100,
        sharePercent: 60,
      },
      {
        key: "socle_estimateur_impact",
        label: "socle_estimateur_impact",
        value: 200,
        previousValue: 100,
        deltaValue: 100,
        deltaPercent: 100,
        sharePercent: 40,
      },
    ]);
    expect(model.currentTotalValue).toBe(700);
    expect(model.previousTotalValue).toBe(500);
    expect(model.deltaValue).toBe(200);
    expect(model.leadingItem?.key).toBe("pieces_jointes_photo");
    expect(model.leadingDelta?.key).toBe("pieces_jointes_photo");
    expect(report.items.map((item) => item.id)).toEqual([
      "socle_estimateur_impact",
      "pieces_jointes_photo",
    ]);
  });

  it("conserve le calcul de pression historique et son fallback", () => {
    const historicalItem = makeItem("socle_estimateur_impact", {
      currentBytes: 100,
      previousBytes: 1,
      history: [
        makeHistoryPoint({ currentBytes: 1_000 }),
        makeHistoryPoint({ snapshotMonth: "2026-04-01", currentBytes: 100 }),
      ],
    });
    const fallbackItem = makeItem("pieces_jointes_photo", {
      currentBytes: 100,
      previousBytes: 1,
    });

    const historicalData = buildPressureChartData(makeReport([historicalItem]));
    const fallbackData = buildPressureChartData(makeReport([fallbackItem]));

    expect(historicalData[0]).toMatchObject({
      value: 8,
      previousValue: 5,
      deltaValue: 3,
      deltaPercent: 60,
      sharePercent: 100,
    });
    expect(fallbackData[0]).toMatchObject({
      value: 52,
    });
    expect(computePressureValue({
      currentBytes: 100,
      currentCount: 1,
      sharePercent: 50,
      deltaPercent: 100,
      accelerationPercent: 0,
    })).toBe(52);
  });

  it("conserve les labels et formats utilisés par le rendu", () => {
    expect(formatSignedPercent(null)).toBe("Base absente");
    expect(formatSignedPercent(-12.34)).toBe("-12,3%");
    expect(formatMonthReference("2026-04-01")).toBe("avril 2026");
    expect(getModeLabel("storage")).toBe("Stockage");
    expect(getModeLabel("pressure")).toBe("Pression");
    expect(getModeValueLabel("pressure", 12.7)).toBe("13 pts");
    expect(getModeDescription("storage")).toContain("comparaison au mois N-1");
  });

  it("retourne une préparation vide compatible avec les états sans données", () => {
    const report = makeReport([]);

    expect(buildStorageChartData(report)).toEqual([]);
    expect(buildStorageBusinessContributionDonutViewModel(report, "pressure")).toMatchObject({
      data: [],
      currentTotalValue: 0,
      previousTotalValue: 0,
      deltaValue: 0,
      leadingItem: null,
      leadingDelta: null,
    });
  });
});
