import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildHomeMetrics } from "@/lib/accueil/config";

vi.mock("./accueil-map-preview", () => ({
  HomeMapPreview: () => <div data-testid="home-map-preview" />,
}));

import { HomeHero } from "./accueil-hero";

describe("HomeHero impact methodology link", () => {
  it("links to the canonical impact-terrain methodology section", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        metrics={
          buildHomeMetrics(
            {
              wasteKg: 0,
              butts: 0,
              volunteers: 0,
              co2AvoidedKg: 0,
              waterSavedLiters: 0,
              euroSaved: 0,
            },
            false,
          )
        }
        impactSnapshot={null}
      />,
    );

    expect(html).toContain('href="/methodologie#indicateurs-impact-terrain"');
  });

  it("renders four equal two-row actions with real destinations", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        metrics={
          buildHomeMetrics(
            {
              wasteKg: 0,
              butts: 0,
              volunteers: 0,
              co2AvoidedKg: 0,
              waterSavedLiters: 0,
              euroSaved: 0,
            },
            false,
          )
        }
        impactSnapshot={null}
      />,
    );

    expect(html).toContain('data-cmm-button-group-layout="two-column"');
    expect(html).toContain('href="/actions/map"');
    expect(html).not.toContain('href="/sections/messagerie"');
    expect(html).toContain('href="/actions/new"');
    expect(html).toContain('href="/sections/rejoindre-un-formulaire"');
    expect(html).toContain('href="/sign-in"');
    expect(html).toContain('data-cmm-button-tone="primary"');
    expect(html).toContain('data-cmm-button-tone="critical"');
    expect(html).toContain('data-cmm-button-width="auto"');
    expect(html).toContain("Se connecter / S&#x27;inscrire");
  });
});
