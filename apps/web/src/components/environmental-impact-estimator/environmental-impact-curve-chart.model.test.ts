import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeCurvePoint,
  EnvironmentalImpactScopeEstimate,
} from "@/lib/environmental-impact-estimator/types";
import { buildDriverBreakdown } from "./environmental-impact-curve-chart.breakdown";
import { formatKg, formatPercent } from "./environmental-impact-curve-chart.formatters";
import { formatSharePercent } from "./environmental-impact-estimator-panel.helpers";
import {
  buildChartPoints,
  buildCurveChartGeometry,
  buildLinePath,
  CURVE_CHART_HEIGHT,
  CURVE_CHART_PADDING,
  CURVE_CHART_WIDTH,
} from "./environmental-impact-curve-chart.model";

function createPoint(overrides: Partial<EnvironmentalImpactScopeCurvePoint> = {}) {
  return {
    index: 0,
    weekLabel: "S1",
    date: "2026-01-01",
    weeklyKgCo2eProxy: 0,
    cumulativeKgCo2eProxy: 0,
    lowerKgCo2eProxy: 0,
    upperKgCo2eProxy: 0,
    confidencePercent: 0,
    breakdown: {},
    driverBreakdown: {
      pageView: 0,
      community: 0,
      notifications: 0,
      actions: 0,
      pdf: 0,
      ia: 0,
      codex: 0,
    },
    ...overrides,
  } satisfies EnvironmentalImpactScopeCurvePoint;
}

function createScope(
  key: EnvironmentalImpactScopeEstimate["key"],
  curve: EnvironmentalImpactScopeCurvePoint[] = [],
): EnvironmentalImpactScopeEstimate {
  return {
    key,
    label: key,
    periodLabel: "2026",
    accountCreatedAt: null,
    measuredAt: null,
    status: "ready",
    totalKgCo2eProxy: 0,
    availablePostCount: 0,
    missingPostCount: 0,
    coveragePercent: 0,
    posts: [],
    curve,
  };
}

function createSignals(): EnvironmentalImpactProjectSignals {
  return {
    siteInput: {
      pageViews: 10,
      storageGbMonths: 5,
      apiRequests: 2,
      pdfExports: 1,
      maps: 3,
      aiCalls: 4,
    },
    userInput: {},
    signalBreakdown: {
      traffic: {
        pageViewEvents: 2,
        legacyPageViewEvents: 1,
        distinctRoutes: 0,
        topRoutes: [],
      },
      community: {
        events: 3,
        rsvps: 4,
        notifications: 2,
        unreadNotifications: 1,
      },
      communication: {
        emailsSent: 0,
        pdfExports: 1,
      },
    },
    codexUsage: null,
  } as unknown as EnvironmentalImpactProjectSignals;
}

describe("environmental impact curve pure calculations", () => {
  it("keeps empty paths and a safe maximum for absent curves", () => {
    const geometry = buildCurveChartGeometry({
      site: createScope("site"),
      user: createScope("user"),
    });

    expect(buildLinePath([])).toBe("");
    expect(buildChartPoints([], CURVE_CHART_WIDTH, CURVE_CHART_HEIGHT, CURVE_CHART_PADDING, 1)).toEqual(
      [],
    );
    expect(geometry.maxValue).toBe(1);
    expect(geometry.sitePoints).toEqual([]);
    expect(geometry.userPoints).toEqual([]);
    expect(geometry.siteLinePath).toBe("");
  });

  it("uses the highest cumulative value as the shared chart scale", () => {
    const geometry = buildCurveChartGeometry({
      site: createScope("site", [
        createPoint({ index: 0, cumulativeKgCo2eProxy: 4, lowerKgCo2eProxy: 2, upperKgCo2eProxy: 5 }),
      ]),
      user: createScope("user", [
        createPoint({ index: 0, cumulativeKgCo2eProxy: 8, lowerKgCo2eProxy: 6, upperKgCo2eProxy: 9 }),
      ]),
    });

    const chartHeight = CURVE_CHART_HEIGHT - CURVE_CHART_PADDING.top - CURVE_CHART_PADDING.bottom;
    expect(geometry.maxValue).toBe(8);
    expect(geometry.sitePoints[0]?.x).toBe(CURVE_CHART_PADDING.left);
    expect(geometry.sitePoints[0]?.y).toBeCloseTo(
      CURVE_CHART_PADDING.top + chartHeight - (4 / 8) * chartHeight,
    );
    expect(geometry.userPoints[0]?.y).toBeCloseTo(CURVE_CHART_PADDING.top);
    expect(geometry.axisLabels).toHaveLength(1);
  });

  it("returns zero breakdown rows for zero totals or absent signals", () => {
    const rows = buildDriverBreakdown({
      pointTotal: 0,
      scope: createScope("site"),
      signals: null,
    });

    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.kg === 0 && row.sharePercent === 0)).toBe(true);
  });

  it("keeps driver proportions normalized to the selected point total", () => {
    const rows = buildDriverBreakdown({
      pointTotal: 12,
      scope: createScope("site"),
      signals: createSignals(),
    });

    const totalWeight = 0.000145 + 0.00017 + 0.000042 + 0.00006 + 0.00006 + 0.0002;
    expect(rows.reduce((total, row) => total + row.sharePercent, 0)).toBeCloseTo(100);
    expect(rows.reduce((total, row) => total + row.kg, 0)).toBeCloseTo(12);
    expect(rows[0]?.sharePercent).toBeCloseTo((0.000145 / totalWeight) * 100);
    expect(rows.find((row) => row.key === "IA")?.sharePercent).toBeCloseTo((0.0002 / totalWeight) * 100);
    expect(rows.find((row) => row.key === "Codex")?.sharePercent).toBe(0);
  });

  it("preserves formatter fallbacks and French display precision", () => {
    expect(formatKg(null)).toBe("—");
    expect(formatPercent(Number.NaN)).toBe("—");
    expect(formatSharePercent(12.34)).toContain("12,3");
    expect(formatKg(1.234)).toContain("1,23 kg CO2e proxy");
  });
});
