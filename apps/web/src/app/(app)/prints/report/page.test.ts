import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOverview = {
  comparison: {
    current: {
      impactVolumeKg: 12.4,
      mobilizationCount: 8,
    },
  },
  zones: [{ id: "zone-1" }, { id: "zone-2" }, { id: "zone-3" }],
};

vi.mock("next/image", () => ({
  default: ({ priority, ...props }: React.ComponentProps<"img"> & { priority?: boolean }) => {
    void priority;
    return React.createElement("img", props);
  },
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) =>
    React.createElement("header", { "data-testid": "page-header" }, title),
  PageHeaderBadge: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/components/maps/territory-map-comparison-cards", () => ({
  TerritoryMapComparisonCards: ({ title, tone }: { title: string; tone: string }) =>
    React.createElement(
      "section",
      {
        "data-testid": "territory-map",
        "data-tone": tone,
      },
      title,
    ),
}));

vi.mock("@/components/reports/analytics-cockpit", () => ({
  AnalyticsCockpit: () => React.createElement("section", { "data-testid": "analytics-cockpit" }, "analytics"),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: () => Promise.resolve({ userId: "user-1" }),
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: () => Promise.resolve(mockOverview),
}));

vi.mock("@/lib/actions/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: () =>
    Promise.resolve({
      items: [{ id: "contract-1" }, { id: "contract-2" }],
    }),
}));

vi.mock("@/lib/pilotage/analytics-data-utils", () => ({
  aggregateMonthlyAnalytics: () => [{ month: "2026-04", kg: 12, volunteers: 8 }],
}));

vi.mock("@/lib/ui/page-families", () => ({
  resolvePageFamily: () => ({
    hero: {
      eyebrow: "Eyebrow",
      title: "Title",
      subtitle: "Subtitle",
      badge: "Badge",
      badgeMuted: "BadgeMuted",
    },
  }),
}));

import Page from "./page";

describe("PrintReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the printable report with a canonical grid structure", async () => {
    const markup = renderToStaticMarkup(await Page());

    expect(markup).toContain("cmm-print-report");
    expect(markup).toContain("cmm-grid-shell");
    expect(markup).toContain("cmm-print-report__section");
    expect(markup).toContain("data-testid=\"territory-map\"");
    expect(markup).toContain("data-testid=\"analytics-cockpit\"");
    expect(markup).toContain(">Impression<");
    expect(markup).toContain(">Export<");
    expect(markup).toContain("Rapport d&#x27;impact imprimable");
    expect(markup).toContain("Masse récoltée");
    expect(markup).toContain("Méthode et proxy");
    expect(markup.indexOf("data-testid=\"territory-map\"")).toBeLessThan(
      markup.indexOf("data-testid=\"analytics-cockpit\""),
    );
  });
});
