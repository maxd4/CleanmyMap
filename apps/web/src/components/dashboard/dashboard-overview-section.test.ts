import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement(href ? "a" : "button", { href }, children),
}));

vi.mock("@/components/ui/system-state", () => ({
  SystemStateLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement("section", { "data-testid": "system-state" }, children),
  SystemStateAction: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  SystemStateDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children),
  SystemStateIcon: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
  SystemStateMeta: ({ children, label }: { children: React.ReactNode; label: string }) =>
    React.createElement("p", null, label, children),
  SystemStateTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement("h2", null, children),
}));

vi.mock("@/components/ui/system-state-retry-button", () => ({
  SystemStateRetryButton: ({ label }: { label: string }) =>
    React.createElement("button", null, label),
}));

vi.mock("@/components/pilotage/thirty-seconds-summary", () => ({
  ThirtySecondsSummary: ({ kpis }: { kpis: Array<{ label: string; value: string }> }) =>
    React.createElement(
      "section",
      { "data-testid": "dashboard-kpis" },
      kpis.map((kpi) => React.createElement("p", { key: kpi.label }, `${kpi.label}: ${kpi.value}`)),
    ),
}));

vi.mock("@/components/pilotage/decision-cluster-section", () => ({
  DecisionClusterSection: () => React.createElement("div", { "data-testid": "decision-cluster" }),
}));

vi.mock("@/components/dashboard/dashboard-today-panel", () => ({
  DashboardTodayPanel: () => React.createElement("div", { "data-testid": "dashboard-today" }),
}));

vi.mock("@/lib/dashboard/today", () => ({
  buildDashboardTodayState: vi.fn(() => ({ state: "ready" })),
}));

vi.mock("@/lib/profiles", () => ({
  isAdminLikeProfile: vi.fn(() => false),
}));

import { DashboardOverviewSection } from "./dashboard-overview-section";

const primaryAction = {
  href: "/actions/new",
  label: { fr: "Déclarer une action", en: "Declare an action" },
  description: { fr: "Créer une déclaration", en: "Create a declaration" },
};

describe("DashboardOverviewSection", () => {
  it("renders the main metrics for a healthy overview", async () => {
    const markup = renderToStaticMarkup(
      await DashboardOverviewSection({
        overviewPromise: Promise.resolve({
          status: "ok",
          overview: {
            summary: {
              kpis: [
                { label: "Masse collectée", value: "12,4 kg" },
                { label: "Actions", value: "8" },
                { label: "Bénévoles", value: "5" },
              ],
              alert: null,
              recommendedAction: {
                href: "/reports",
                label: { fr: "Lire les rapports", en: "Read reports" },
                reason: { fr: "Suivre l'impact", en: "Track impact" },
              },
            },
          } as never,
        }),
        locale: "fr",
        profile: "benevole",
        primaryAction,
      }),
    );

    expect(markup).toContain('data-testid="dashboard-kpis"');
    expect(markup).toContain("Masse collectée: 12,4 kg");
    expect(markup).toContain("Actions: 8");
    expect(markup).toContain("Bénévoles: 5");
  });

  it("renders an actionable error state when Supabase data is unavailable", async () => {
    const markup = renderToStaticMarkup(
      await DashboardOverviewSection({
        overviewPromise: Promise.resolve({
          status: "error",
          message: "Supabase est momentanément indisponible.",
        }),
        locale: "fr",
        profile: "benevole",
        primaryAction,
      }),
    );

    expect(markup).toContain('data-testid="system-state"');
    expect(markup).toContain("Les données du tableau de bord sont indisponibles");
    expect(markup).toContain("Supabase est momentanément indisponible.");
    expect(markup).toContain("Réessayer le chargement");
    expect(markup).toContain('href="/actions/new"');
  });
});
