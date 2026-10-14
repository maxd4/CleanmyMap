import { describe, expect, it } from "vitest";
import { buildDossierResponse } from "./route-response";

const payload = {
  generatedAt: "2026-10-14T00:00:00.000Z",
  periodDays: 30,
  isTruncated: true,
  sourceHealth: {
    partial: true,
    failedSources: ["history"],
    warnings: ["Historique partiel"],
  },
  decisionPriorities: [{ area: "Paris", urgency: "high", normalizedScore: 82.5, reason: "forte pression" }],
  territorialPriorities: [{ area: "Paris", normalizedScore: 82.5, actionsPerKm2: 1.2, kgPerKm2: 3.4, decisionLabel: "prioritaire" }],
  zoneComparisons: [{
    area: "Paris",
    currentActions: 4,
    previousActions: 2,
    deltaActionsAbsolute: 2,
    deltaActionsPercent: 100,
    currentKg: 12,
    previousKg: 10,
    deltaKgAbsolute: 2,
    deltaKgPercent: 20,
    currentCoverageRate: 80,
    previousCoverageRate: 70,
    deltaCoverageRateAbsolute: 10,
    currentModerationDelayDays: null,
    previousModerationDelayDays: 1,
    deltaModerationDelayDaysAbsolute: null,
    recommendedAction: "maintenir",
  }],
  summary: { totalActions: 4, totalKg: 12, totalVolunteers: 8, geocoverageRate: 80 },
  comparison: { current: {}, previous: {} },
  methodology: {
    version: "v1",
    proxyVersion: "p1",
    qualityRulesVersion: "q1",
    pollutionScoreAverage: null,
    formulas: ["kg / km2"],
    sources: ["Supabase"],
    limits: ["proxy"],
    errorMargins: { waterSavedLitersPct: 10, co2AvoidedKgPct: 20, surfaceCleanedM2Pct: 15, pollutionScoreMeanPoints: 4 },
  },
} as never;

describe("buildDossierResponse", () => {
  it("serializes JSON while preserving source warnings", async () => {
    const response = buildDossierResponse(payload, "json");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Export-Warning")).toBe("Dataset truncated to limit | Historique partiel");
    await expect(response.json()).resolves.toMatchObject({ summary: { totalActions: 4 } });
  });

  it("renders the markdown institutional pack with bounded optional values", async () => {
    const response = buildDossierResponse(payload, "md");
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(body).toContain("# Dossier elu - Pack institutionnel");
    expect(body).toContain("Historique partiel");
    expect(body).toContain("indisponible");
  });
});
