import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  PilotageComparisonResult,
  PilotageMetricComparison,
} from "@/lib/pilotage/metrics";
import { KpiComparisonGrid } from "./kpi-comparison-grid";

const metric: PilotageMetricComparison = {
  current: 1,
  previous: 1,
  deltaAbsolute: 0,
  deltaPercent: 0,
  trend: "flat",
  interpretation: "neutral",
  strength: "stable",
};

const comparison: PilotageComparisonResult = {
  formulaVersion: "test",
  periodDays: 30,
  generatedAt: "2026-08-23T00:00:00.000Z",
  current: {
    approvedActions: 1,
    impactVolumeKg: 1,
    mobilizationCount: 1,
    qualityScore: 1,
    coverageRate: 1,
    moderationDelayDays: null,
    pendingCount: null,
    iurIndex: 1,
    anomaliesCount: 0,
    reliability: {
      level: "moyenne",
      score: 60,
      completeness: 60,
      geoloc: 60,
      freshness: 60,
      sampleSize: 1,
      reason: "test",
    },
  },
  previous: {
    approvedActions: 1,
    impactVolumeKg: 1,
    mobilizationCount: 1,
    qualityScore: 1,
    coverageRate: 1,
    moderationDelayDays: null,
    pendingCount: null,
    iurIndex: 1,
    anomaliesCount: 0,
    reliability: {
      level: "moyenne",
      score: 60,
      completeness: 60,
      geoloc: 60,
      freshness: 60,
      sampleSize: 1,
      reason: "test",
    },
  },
  metrics: {
    approvedActions: metric,
    impactVolumeKg: metric,
    mobilizationCount: metric,
    qualityScore: metric,
    coverageRate: metric,
    moderationDelayDays: null,
    iurIndex: metric,
    anomaliesCount: metric,
  },
};

describe("KpiComparisonGrid", () => {
  it("keeps moderation metrics explicitly unavailable", () => {
    const markup = renderToStaticMarkup(
      React.createElement(KpiComparisonGrid, { comparison }),
    );

    expect(markup).toContain("Actions approuvees");
    expect(markup).toContain("Volume collecte");
    expect(markup).toContain("Qualite data");
    expect(markup).toContain("Geo-couverture");
    expect(markup).toContain("Delai moderation");
    expect(markup).toContain("Mobilisation");
    expect(markup.match(/Indisponible/g)).toHaveLength(4);
    expect(markup).not.toContain("NaN");
  });
});
