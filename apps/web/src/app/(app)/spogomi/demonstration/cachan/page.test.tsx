import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("lucide-react", () => ({ ArrowLeft: () => null }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, href, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", { ...props, href }, children) }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => React.createElement("header", null, title, subtitle) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => "spogomi" }));

import SpogomiCachanDemonstrationPage from "./page";

describe("public SPOGOMI Cachan demonstration", () => {
  const casualTeams = ["CAS-01", "CAS-02", "CAS-03", "CAS-04", "CAS-05"];
  const worldCupTeams = ["WC-01", "WC-02", "WC-03", "WC-04", "WC-05", "WC-06"];

  async function renderCachan(searchParams: { division?: string } = {}) {
    return renderToStaticMarkup(
      await SpogomiCachanDemonstrationPage({
        searchParams: Promise.resolve(searchParams),
      }),
    );
  }

  function expectSharedReadOnlyContract(markup: string) {
    expect(markup).toContain("Démonstration fictive, données synthétiques, règlement non officiel");
    expect(markup).toContain("Données synthétiques / non officielles · lecture seule.");
    expect(markup).toContain("simulation clôturée");
    expect(markup).toContain("Classement final simulé, non officiel");
    expect(markup).toContain("Classements de simulation");
    expect(markup).toContain("Bilan environnemental synthétique");
    expect(markup).toContain("37 / 37");
    expect(markup).toContain("Elle ne crée aucune édition");
    expect(markup).toContain("registration_closed");
    expect(markup).toContain("synthetic_edition_closed");
    expect(markup).not.toContain("Classement officiel");
  }

  it("renders the Casual division by default without exposing World Cup teams", async () => {
    const markup = await renderCachan();

    expectSharedReadOnlyContract(markup);
    expect(markup).toContain("DIV-CASUAL");
    expect(markup).toContain("division=casual");
    expect(markup).toMatch(/2[\s\u202f]421,5 points/);
    for (const teamRef of casualTeams) {
      expect(markup).toContain(teamRef);
    }
    for (const teamRef of worldCupTeams) {
      expect(markup).not.toContain(teamRef);
    }
    expect(markup).not.toContain("DIV-WORLD-CUP");
  });

  it("renders World Cup only after explicit selection and preserves explicit zero values", async () => {
    const markup = await renderCachan({ division: "world_cup" });

    expectSharedReadOnlyContract(markup);
    expect(markup).toContain("DIV-WORLD-CUP");
    expect(markup).toContain("division=world_cup");
    expect(markup).toContain("809,5 points");
    expect(markup).toContain("WC-03");
    expect(markup).toContain("0 points");
    expect(markup).toContain("0 g");
    expect(markup).toContain("0 mégots/participant");
    for (const teamRef of worldCupTeams) {
      expect(markup).toContain(teamRef);
    }
    for (const teamRef of casualTeams) {
      expect(markup).not.toContain(teamRef);
    }
    expect(markup).not.toContain("DIV-CASUAL");
  });

  it("covers all eleven synthetic teams across the two division views", async () => {
    const casualMarkup = await renderCachan();
    const worldCupMarkup = await renderCachan({ division: "world_cup" });
    const combinedMarkup = `${casualMarkup}\n${worldCupMarkup}`;

    for (const teamRef of [...casualTeams, ...worldCupTeams]) {
      expect(combinedMarkup).toContain(teamRef);
    }
  });
});
