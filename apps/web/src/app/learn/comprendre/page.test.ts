import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type IntroProps = {
  question: string;
  clue: string;
  action: {
    href: string;
    label: string;
  };
};

type JourneyProps = {
  currentPageId: string;
  compact?: boolean;
};

const introCalls: IntroProps[] = [];
const journeyCalls: JourneyProps[] = [];

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: "fr",
  }),
}));

vi.mock("@/components/learn/learn-rubric-shell", () => ({
  LearnRubricShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "shell" }, children),
}));

vi.mock("@/components/learn/learn-comprendre-visual-intro", () => ({
  LearnComprendreVisualIntro: (props: IntroProps) => {
    introCalls.push(props);
    return React.createElement("div", { "data-testid": "intro" });
  },
}));

vi.mock("@/components/learn/learn-vulgarisation-path-section", () => ({
  LearnVulgarisationPathSection: () => React.createElement("section", { "data-testid": "path" }),
}));

vi.mock("@/components/learn/learn-deferred-panels", () => ({
  DeferredLearnVulgarisationMagnitudeComparator: () =>
    React.createElement("section", { "data-testid": "comparator" }),
  DeferredImpactOrderOfMagnitudeSection: () =>
    React.createElement("section", { "data-testid": "impact" }),
  DeferredGIECContent: () => React.createElement("section", { "data-testid": "giec" }),
  DeferredPlanetaryBoundariesInteractive: () =>
    React.createElement("section", { "data-testid": "planetary" }),
  DeferredSustainableGoalsInteractive: () =>
    React.createElement("section", { "data-testid": "goals" }),
  DeferredLearnArtworkAccordion: () =>
    React.createElement("section", { "data-testid": "artwork" }),
}));

vi.mock("@/components/learn/learn-block-journey-section", () => ({
  LearnBlockJourneySection: (props: JourneyProps) => {
    journeyCalls.push(props);
    return React.createElement("section", {
      "data-testid": "journey",
      "data-compact": String(Boolean(props.compact)),
    });
  },
}));

vi.mock("@/components/learn/learn-page-visit-tracker", () => ({
  LearnPageVisitTracker: () => null,
}));

import Page from "./page";

describe("LearnVulgarisationPage", () => {
  beforeEach(() => {
    introCalls.length = 0;
    journeyCalls.length = 0;
  });

  it("keeps the reading flow in the expected order", () => {
    const markup = renderToStaticMarkup(React.createElement(Page));

    expect(markup).toContain("data-testid=\"intro\"");
    expect(markup).toContain("Chemin direct");
    expect(markup).toContain("Passer au quiz");
    expect(markup).toContain("Voir la méthodologie");
    expect(markup).toContain("data-testid=\"path\"");
    expect(markup).toContain("À retenir");
    expect(markup).toContain("Lire le contexte avant de comparer");
    expect(markup).toContain("data-testid=\"comparator\"");
    expect(markup).toContain("data-testid=\"impact\"");
    expect(markup).toContain("Pour aller plus loin");
    expect(markup).toContain("Passer des ordres de grandeur aux cadres de référence");
    expect(markup).toContain("data-testid=\"giec\"");
    expect(markup).toContain("data-testid=\"planetary\"");
    expect(markup).toContain("data-testid=\"goals\"");
    expect(markup).toContain("En synthèse");
    expect(markup).toContain("Relier les cadres pour situer");
    expect(markup).toContain("data-testid=\"artwork\"");
    expect(markup).toContain("data-testid=\"journey\"");

    expect(markup.indexOf("data-testid=\"path\"")).toBeLessThan(markup.indexOf("data-testid=\"comparator\""));
    expect(markup.indexOf("Chemin direct")).toBeLessThan(markup.indexOf("data-testid=\"path\""));
    expect(markup.indexOf("data-testid=\"path\"")).toBeLessThan(markup.indexOf("À retenir"));
    expect(markup.indexOf("À retenir")).toBeLessThan(markup.indexOf("data-testid=\"comparator\""));
    expect(markup.indexOf("data-testid=\"comparator\"")).toBeLessThan(markup.indexOf("data-testid=\"impact\""));
    expect(markup.indexOf("data-testid=\"impact\"")).toBeLessThan(markup.indexOf("Pour aller plus loin"));
    expect(markup.indexOf("Pour aller plus loin")).toBeLessThan(markup.indexOf("data-testid=\"giec\""));
    expect(markup.indexOf("data-testid=\"impact\"")).toBeLessThan(markup.indexOf("data-testid=\"giec\""));
    expect(markup.indexOf("data-testid=\"giec\"")).toBeLessThan(markup.indexOf("data-testid=\"planetary\""));
    expect(markup.indexOf("data-testid=\"planetary\"")).toBeLessThan(markup.indexOf("data-testid=\"goals\""));
    expect(markup.indexOf("data-testid=\"goals\"")).toBeLessThan(markup.indexOf("En synthèse"));
    expect(markup.indexOf("En synthèse")).toBeLessThan(markup.indexOf("data-testid=\"artwork\""));
    expect(markup.indexOf("data-testid=\"goals\"")).toBeLessThan(markup.indexOf("data-testid=\"artwork\""));
    expect(markup.indexOf("data-testid=\"artwork\"")).toBeLessThan(markup.indexOf("data-testid=\"journey\""));

    expect(introCalls).toHaveLength(1);
    expect(introCalls[0].action.href).toBe("/learn/sentrainer");
    expect(introCalls[0].action.label).toBe("Passer au quiz");
    expect(journeyCalls).toHaveLength(1);
    expect(journeyCalls[0].currentPageId).toBe("comprendre");
    expect(journeyCalls[0].compact).toBe(true);
  });
});
