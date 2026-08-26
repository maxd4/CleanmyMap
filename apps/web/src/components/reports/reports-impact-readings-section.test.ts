import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { ReportsImpactReadingsSection } from "./reports-impact-readings-section";

const report = {
  generatedAt: "2026-08-26T12:00:00.000Z",
  totals: { actions: 2, kg: 12.3, butts: 4, volunteers: 3, hours: 4.5 },
  map: {
    points: 2,
    traces: 1,
    polylines: 1,
    polygons: 0,
    geoCoverage: 81.2,
    traceCoverage: 63.4,
  },
  moderation: {
    availability: "available",
    pending: 0,
    approved: 2,
    rejected: 0,
    conversion: 100,
    delayDays: 1,
  },
  quality: {
    completenessScore: 91.3,
    coherenceScore: 87.6,
    freshnessDays: 2.5,
    geolocRate: 81.2,
  },
  areas: [],
  trendPercent: 0,
  monthRows6: [],
  monthRows12: [],
  routeSteps: [],
  routeDistance: 0,
  terrain: { actionCount: 2, spotCount: 0, cleanPlaceCount: 0 },
  recycling: { recyclableKg: 6.7, triIndex: 72.4 },
  climate: {
    six: { actions: 2, kg: 12.3, butts: 4 },
    twelve: { actions: 2, kg: 12.3, butts: 4 },
    waterProtectedLiters: 250,
    co2AvoidedKg: 14.4,
    streetCleaningSavingsEuros: undefined,
  },
  community: {
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    rsvp: { yes: 0, maybe: 0, no: 0 },
    participationRate: 0,
    topLeaderboard: [],
    badgeConfirmed: 0,
    badgeExpert: 0,
    sourceBuckets: { citoyen: 1, associatif: 0, institutionnel: 0 },
  },
  impactMethodology: {
    sources: { co2: "source", water: "source" },
    proxyVersion: "impact-proxy-test",
    qualityRulesVersion: "quality-rules-test",
  },
  annualRows: [],
  calendar: [],
  highlightPhotos: [],
  highlightActions: [],
  executive: {
    readinessScore: 0,
    readinessLabel: "",
    headline: "",
    summary: "",
    evidence: [],
    budgetUseCases: [],
    watchouts: [],
  },
} as unknown as ReportModel;

describe("ReportsImpactReadingsSection contract", () => {
  it("maps ReportModel fields to qualified, unit-correct labels", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsImpactReadingsSection, { report }),
    );

    expect(markup).toContain("Émissions évitées (proxy)");
    expect(markup).toContain("14,4 kg CO₂e");
    expect(markup).toContain("Eau préservée (proxy)");
    expect(markup).toContain("250 L");
    expect(markup).toContain("Masse recyclable estimée");
    expect(markup).toContain("6,7 kg");
    expect(markup).toContain("Indice de tri (proxy)");
    expect(markup).toContain("72,4 %");
    expect(markup).toContain("Complétude des données");
    expect(markup).toContain("91,3 %");
    expect(markup).toContain("Cohérence des données");
    expect(markup).toContain("87,6 %");
    expect(markup).toContain("Couverture géolocalisée");
    expect(markup).toContain("81,2 %");
    expect(markup).toContain("Couverture des traces");
    expect(markup).toContain("63,4 %");
  });

  it("does not turn quality or proxy fields into environmental claims", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsImpactReadingsSection, { report }),
    );

    expect(markup).not.toContain("Pollution de l’air évitée");
    expect(markup).not.toContain("Pollution de l’eau évitée");
    expect(markup).not.toContain("Pollution des sols évitée");
    expect(markup).not.toContain("Incertitudes");
    expect(markup).not.toContain("8,7 %");
    expect(markup).not.toContain("78%");
    expect(markup).not.toContain("45%");
    expect(markup).not.toContain("92%");
    expect(markup).not.toContain("65%");
  });
});
