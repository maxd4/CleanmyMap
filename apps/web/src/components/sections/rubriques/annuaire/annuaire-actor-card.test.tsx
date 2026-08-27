import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

vi.mock("@/components/ui/cmm-card", () => ({
  CmmCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children }: { children: React.ReactNode }) =>
    React.createElement("button", null, children),
}));

vi.mock("lucide-react", () => {
  const Icon = () => React.createElement("span");
  return {
    Clock: Icon,
    Info: Icon,
    MapPin: Icon,
    MessageSquare: Icon,
    ShieldCheck: Icon,
    Sparkles: Icon,
    Star: Icon,
    Zap: Icon,
  };
});

import { AnnuaireActorCard } from "./annuaire-actor-card";

describe("AnnuaireActorCard provenance", () => {
  it("renders a seed as an editorial resource without trust claims", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES[0];
    expect(seed).toBeDefined();

    const markup = renderToStaticMarkup(
      <AnnuaireActorCard
        entry={{ ...seed, distanceKm: null }}
        onFocusMap={vi.fn()}
      />,
    );

    expect(markup).toContain("RESSOURCE ÉDITORIALE");
    expect(markup).not.toContain("CERTIFIÉ");
    expect(markup).not.toContain("Vérifiée");
    expect(markup).not.toContain("Structure active");
    expect(markup).not.toContain("Structure validée");
    expect(markup).not.toContain("Partenaire actif");
    expect(markup).not.toContain("Dernière action");
    expect(markup).not.toContain("Disponibilité");
    expect(markup).not.toContain("Mise à jour");
    expect(markup).not.toContain("Impact");
    expect(markup).toContain("Zones associées");
    expect(markup).toContain("Contributions repérées");
    expect(markup).toContain("Consulter");
  });

  it("keeps published availability, freshness and contact labels distinct", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES[0];
    expect(seed).toBeDefined();

    const markup = renderToStaticMarkup(
      <AnnuaireActorCard
        entry={{
          ...seed,
          provenance: "published_partner" as const,
          verificationStatus: "verifie" as const,
          qualificationStatus: "partenaire_actif" as const,
          recentActivityAt: "2026-08-26T10:00:00.000Z",
          availability: "Sur rendez-vous",
          lastUpdatedAt: "2026-08-26T10:00:00.000Z",
          primaryChannel: {
            platform: "site web" as const,
            label: "Contact direct",
            url: "https://published.example.test",
          },
          distanceKm: null,
        }}
        onFocusMap={vi.fn()}
      />,
    );

    expect(markup).toContain("FICHE CONFIRMÉE");
    expect(markup).toContain("MISE À JOUR RÉCENTE");
    expect(markup).toContain("Périmètre déclaré");
    expect(markup).toContain("Disponibilité déclarée");
    expect(markup).toContain("Contributions déclarées");
    expect(markup).toContain("Contacter");
    expect(markup).not.toContain("ACTIF");
    expect(markup).not.toContain("CERTIFIÉ");
  });
});
