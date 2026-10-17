import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { ReportCover } from "./report-cover";

const reportWithoutMeasuredMass = {
  generatedAt: "2026-08-27",
  totals: {
    actions: 1,
    kg: 0,
    knownWasteActions: 0,
    butts: 0,
    volunteers: 0,
    volunteersKnownActions: 0,
    hours: 0,
  },
  map: { points: 1, traces: 0, polylines: 0, polygons: 0, geoCoverage: 100, traceCoverage: 0 },
  moderation: {
    availability: "available",
    pending: 0,
    approved: 1,
    rejected: 0,
    conversion: 100,
    delayDays: 0,
  },
  quality: { completenessScore: 40, coherenceScore: 40, freshnessDays: 1, geolocRate: 100 },
  areas: [{ area: "Quai de test", actions: 1, kg: 0, butts: 0, recurrence: 0, score: 0 }],
} as unknown as ReportModel;

describe("ReportCover", () => {
  it("states that an absent mass is unknown instead of displaying zero", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportCover, {
        report: reportWithoutMeasuredMass,
        activeScopeLabel: "Action terrain",
      }),
    );

    expect(markup).toContain("Masse collectée: Non renseignée");
    expect(markup).toContain("une masse non renseignée");
    expect(markup).not.toContain("Masse collectée: 0 kg");
  });
});
