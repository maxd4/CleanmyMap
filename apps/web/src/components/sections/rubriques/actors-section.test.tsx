import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

vi.mock("swr", () => ({
  default: (key: unknown[]) =>
    key[0] === "section-actors-map"
      ? { data: { items: [{ location_label: "Lyon 10e" }] }, isLoading: false }
      : {
          data: {
            items: [
              {
                id: "action-1",
                created_at: "2026-04-01T10:00:00.000Z",
                actor_name: "Association observée",
                action_date: "2026-04-01",
                location_label: "Lyon 10e",
                latitude: 48.87,
                longitude: 2.36,
                waste_kg: 10,
                cigarette_butts: 100,
                volunteers_count: 3,
                duration_minutes: 60,
                notes: null,
                status: "approved",
              },
            ],
          },
          isLoading: false,
        },
}));

vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
    subtitle: React.ReactNode;
  }) => React.createElement("section", null, title, subtitle, children),
}));

vi.mock("@/components/ui/cmm-skeleton", () => ({
  CmmSkeleton: () => React.createElement("div"),
}));

vi.mock("@/components/ui/rubrique-card", () => ({
  RubriqueCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement("article", null, children),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    li: ({ children }: { children: React.ReactNode }) =>
      React.createElement("li", null, children),
  },
}));

vi.mock("lucide-react", () => ({
  Gauge: () => React.createElement("span"),
  ListChecks: () => React.createElement("span"),
  MapPin: () => React.createElement("span"),
  Target: () => React.createElement("span"),
  TrendingUp: () => React.createElement("span"),
  Users: () => React.createElement("span"),
}));

import { ActorsSection } from "./actors-section";

describe("ActorsSection data contract", () => {
  it("renders observed action activity without partner claims or prescriptions", () => {
    const markup = renderToStaticMarkup(<ActorsSection />);

    expect(markup).toContain("Activité des acteurs");
    expect(markup).toContain("Association observée");
    expect(markup).toContain("Qualité des actions");
    expect(markup).toContain("Acteurs observés dans les actions");
    expect(markup).not.toContain("Fiches Partenaires");
    expect(markup).not.toContain("Capacité");
    expect(markup).not.toContain("Prochaine Action");
    expect(markup).not.toContain("Prioritaire");
    expect(markup).not.toContain("Coordinateur terrain");
  });
});
