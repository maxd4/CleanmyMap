import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), analysis: vi.fn() }));
const data = {
  overview: { periodDays: 90, dataAvailability: { isTruncated: false } },
  report: {
    generatedAt: "25 novembre 2026 à 10:00",
    totals: { actions: 2, kg: 12.4, knownWasteActions: 1, butts: 0, buttsKnownActions: 0, volunteers: 8, volunteersKnownActions: 2 },
    quality: { completenessScore: 50 },
    areas: [{ area: "10e", actions: 2, kg: 12.4, knownWasteActions: 1 }],
  },
  monthlyData: [{ month: "2026-11", kg: 12.4, actionCount: 2, wasteKnownActions: 1, volunteers: 8, volunteersKnownActions: 2 }],
  communityEventsAvailability: "available",
};

vi.mock("next/image", () => ({ default: ({ priority, ...props }: React.ComponentProps<"img"> & { priority?: boolean }) => { void priority; return React.createElement("img", props); } }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("header", { "data-testid": "page-header" }, title) }));
vi.mock("@/components/ui/clerk-required-gate", () => ({ ClerkRequiredGate: ({ lockedPreview }: { lockedPreview: React.ReactNode }) => React.createElement("section", { "data-testid": "locked-preview" }, lockedPreview) }));
vi.mock("@/components/maps/territory-map-comparison-cards", () => ({ TerritoryMapComparisonCards: ({ title }: { title: string }) => React.createElement("section", { "data-testid": "territory-map" }, title) }));
vi.mock("@/components/reports/analytics-cockpit", () => ({ AnalyticsCockpit: () => React.createElement("section", { "data-testid": "analytics-cockpit" }) }));
vi.mock("../brigade-verte/print-action-button", () => ({ PrintActionButton: () => React.createElement("button", null, "Imprimer / Enregistrer en PDF") }));
vi.mock("@/lib/auth/safe-session", () => ({ getSafeAuthSession: mocks.auth }));
vi.mock("@/lib/reports/page-data", () => ({ loadReportsAnalysisData: mocks.analysis }));

import Page from "./page";

describe("PrintReportPage", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ userId: "user-1" }); mocks.analysis.mockResolvedValue(data); });

  it("renders a traceable non-certified report with real results and print controls", async () => {
    const markup = renderToStaticMarkup(await Page());
    expect(markup).toContain("cmm-grid-shell");
    expect(markup).toContain("cmm-print-report__section");
    expect(markup).toContain("data-testid=\"analytics-cockpit\"");
    expect(markup).toContain("Imprimer / Enregistrer en PDF");
    expect(markup).toContain("Synthèse non certifiée");
    expect(markup).toContain("25 novembre 2026");
    expect(markup).toContain("12,4 kg");
    expect(markup).toContain("1/2 actions renseignées");
    expect(markup).toContain("Non renseigné");
    expect(markup).toContain("Méthode et proxy");
    expect(markup).toContain("indépendant du corpus analysé");
    for (const claim of ["Document certifié", "CMM-AUDIT-2026", "25/04/2026", "65%", "15%", "RGPD conforme", "Source ADEME Ref 2024", ">AA<"]) expect(markup).not.toContain(claim);
  });

  it("does not fetch or expose the report for anonymous visitors", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    const markup = renderToStaticMarkup(await Page());
    expect(mocks.analysis).not.toHaveBeenCalled();
    expect(markup).toContain("Compte requis");
    expect(markup).not.toContain("12,4 kg");
  });

  it("marks unavailable data without fabricating totals", async () => {
    mocks.analysis.mockRejectedValue(new Error("unavailable"));
    const markup = renderToStaticMarkup(await Page());
    expect(markup).toContain("temporairement indisponibles");
    expect(markup).not.toContain("Masse récoltée");
  });

  it("exposes truncation and differentiates empty corpus and missing observations", async () => {
    mocks.analysis.mockResolvedValue({ ...data, overview: { periodDays: 90, dataAvailability: { isTruncated: true } }, report: { ...data.report, totals: { actions: 0, kg: 0, knownWasteActions: 0, butts: 0, buttsKnownActions: 0, volunteers: 0, volunteersKnownActions: 0 }, areas: [] }, monthlyData: [] });
    const markup = renderToStaticMarkup(await Page());
    expect(markup).toContain("limite de chargement");
    expect(markup).toContain("Non renseigné");
    expect(markup).toContain("Aucun secteur représenté");
    expect(markup).not.toContain("0,0 kg");
  });
});
