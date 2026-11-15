import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPublicImpactMetrics } from "@/lib/impact/public-impact-kpis";

vi.mock("./accueil-map-preview", () => ({
  HomeMapPreview: () => <div data-testid="home-map-preview" />,
}));

const preferences = vi.hoisted(() => ({
  locale: "fr" as "fr" | "en",
  setLocale: vi.fn(),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => preferences,
}));

import { HomeHero } from "./accueil-hero";

afterEach(() => {
  preferences.locale = "fr";
  preferences.setLocale.mockReset();
});

describe("HomeHero orientation and impact links", () => {
  it("links to the canonical impact-terrain methodology section", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        metrics={
          buildPublicImpactMetrics(
            {
              wasteKg: 0,
              butts: 0,
              volunteers: 0,
              co2: 0,
              water: 0,
              euro: 0,
            },
            false,
          )
        }
        impactSnapshot={null}
      />,
    );

    expect(html).toContain('href="/methodologie#indicateurs-impact-terrain"');
    expect(html).toContain(">CleanMyMap</h1>");
    expect(html).not.toContain("Clean My Map");
    expect(html).toContain("text-white");
    expect(html).toContain("grid-cols-2 gap-3 px-1 min-[768px]:grid-cols-3");
    expect(html).toContain("h-9 !border !border-[#047957]");
    expect(html).toContain('class="text-[#7c3aed]">Méthodologie</span>');
    expect(html).toContain('data-cmm-button-size="md"');
    expect(html).toContain("Données d’impact indisponibles");
    expect(html).toContain("Mise à jour mensuelle le 1er du mois");
    expect(html).toContain('data-impact-snapshot-version="unavailable"');
    expect(html).toContain("flex flex-wrap items-center justify-start gap-3");
    expect(html).not.toContain("ⓘ");
    expect(html.indexOf("Impact terrain 2026")).toBeLessThan(
      html.indexOf("Méthodologie"),
    );
    expect(html).toContain('data-navigation-tutorial-entry="homepage"');
    expect(html).toContain("Nouveau sur CleanMyMap ?");
    expect(html).toContain("Découvrez le ruban en 1 minute.");
    expect(html).toContain("Découvrir le ruban");
    expect(html).toContain('data-cmm-button-tone="primary"');
    expect(html).toContain('data-navigation-tutorial-trigger');
    expect(html).toContain('data-homepage-locale-switcher="true"');
    expect(html).toContain('aria-label="Français"');
    expect(html).toContain('aria-label="Anglais"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("bg-[var(--action-primary-bg)]");
    expect(html).toContain("mt-5 flex max-w-full flex-wrap items-center gap-x-4 gap-y-3");
    expect(html).toContain("text-[clamp(1.05rem,1.4vw,1.24rem)] leading-[1.48]");
    expect(html).toContain("mt-6 max-w-[38rem] gap-1.5 sm:mt-7 sm:gap-2");
  });

  it("keeps the onboarding entry point separate from the primary impact actions", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        metrics={
          buildPublicImpactMetrics(
            {
              wasteKg: 0,
              butts: 0,
              volunteers: 0,
              co2: 0,
              water: 0,
              euro: 0,
            },
            false,
          )
        }
        impactSnapshot={null}
      />,
    );

    expect(html.indexOf('data-cmm-button-group-layout="two-column"')).toBeLessThan(
      html.indexOf('data-navigation-tutorial-entry="homepage"'),
    );
    expect(html).toContain('data-navigation-tutorial-entry="homepage"');
    expect(html).not.toContain('aria-modal="true"');
  });

  it("renders four equal two-row actions with real destinations", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        metrics={
          buildPublicImpactMetrics(
            {
              wasteKg: 0,
              butts: 0,
              volunteers: 0,
              co2: 0,
              water: 0,
              euro: 0,
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
    expect(html).toContain('href="/sections/rejoindre-une-action"');
    expect(html).toContain('href="/sign-in"');
    expect(html).toContain('data-cmm-button-tone="primary"');
    expect(html).toContain('data-cmm-button-tone="critical"');
    expect(html).toContain('data-cmm-button-width="auto"');
    expect(html).toContain("Se connecter / S&#x27;inscrire");

    expect(html.indexOf('href="/actions/map"')).toBeLessThan(
      html.indexOf('href="/sign-in"'),
    );
    expect(html.indexOf('href="/sections/rejoindre-une-action"')).toBeLessThan(
      html.indexOf('href="/actions/new"'),
    );
  });

  it("uses the shared locale preference for English hero and tutorial content", () => {
    preferences.locale = "en";
    const html = renderToStaticMarkup(
      <HomeHero metrics={[]} impactSnapshot={null} />,
    );

    expect(html).toContain("Cleaner places, together");
    expect(html).toContain("Let&#x27;s work together");
    expect(html).toContain("New to CleanMyMap?");
    expect(html).toContain("Ribbon tutorial");
    expect(html).toContain('aria-label="French"');
    expect(html).toContain('aria-label="English"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('href="/actions/map"');
  });
});
