import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type LocalizedText = {
  fr: string;
  en: string;
};

type EntryLink = {
  href: string;
  label: LocalizedText;
  detail: LocalizedText;
};

type IntroProps = {
  entryLinks: EntryLink[];
  cta: {
    href: string;
    label: LocalizedText;
  };
};

type BehaviorProps = {
  id?: string;
};

type JourneyProps = {
  currentPageId: string;
  compact?: boolean;
};

type VisualCardProps = {
  card: {
    href: string;
  };
};

const introCalls: IntroProps[] = [];
const behaviorCalls: BehaviorProps[] = [];

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: "fr",
  }),
}));

vi.mock("@/components/learn/learn-rubric-shell", () => ({
  LearnRubricShell: ({ children }: { children: React.ReactNode }) => (
    React.createElement("div", { "data-testid": "shell" }, children)
  ),
}));

vi.mock("@/components/learn/learn-practice-guide-intro", () => ({
  LearnPracticeGuideIntro: (props: IntroProps) => {
    introCalls.push(props);
    return React.createElement("div", { "data-testid": "intro" });
  },
}));

vi.mock("@/components/learn/learn-block-journey-section", () => ({
  LearnBlockJourneySection: (props: JourneyProps) => (
    React.createElement("div", {
      "data-testid": "journey",
      "data-current-page-id": props.currentPageId,
      "data-compact": String(Boolean(props.compact)),
    })
  ),
}));

vi.mock("@/components/learn/learn-behavior-awareness-section", () => ({
  LearnBehaviorAwarenessSection: (props: BehaviorProps) => {
    behaviorCalls.push(props);
    return React.createElement("section", { "data-testid": "awareness", id: props.id });
  },
}));

vi.mock("@/components/learn/learn-tri-context-section", () => ({
  LearnTriContextSection: () => React.createElement("div", { "data-testid": "tri-context" }),
}));

vi.mock("@/components/learn/learn-visual-card", () => ({
  LearnVisualCard: (props: VisualCardProps) =>
    React.createElement("article", {
      "data-testid": "visual-card",
      "data-href": props.card.href,
    }),
}));

vi.mock("@/components/learn/learn-page-visit-tracker", () => ({
  LearnPageVisitTracker: () => null,
}));

import Page from "./page";

describe("bonnes-pratiques page", () => {
  beforeEach(() => {
    introCalls.length = 0;
    behaviorCalls.length = 0;
  });

  it("exposes the three quick entry points and anchors the useful resources section", () => {
    const markup = renderToStaticMarkup(React.createElement(Page));

    expect(markup).toContain("data-testid=\"intro\"");
    expect(markup).toContain("data-testid=\"awareness\"");
    expect(markup).toContain("data-testid=\"tri-context\"");
    expect(markup.indexOf("data-testid=\"visual-card\"")).toBeGreaterThan(-1);
    expect(markup.indexOf("data-testid=\"visual-card\"")).toBeLessThan(markup.indexOf("data-testid=\"awareness\""));
    expect(markup.indexOf("data-testid=\"awareness\"")).toBeLessThan(markup.indexOf("data-testid=\"journey\""));

    expect(introCalls).toHaveLength(1);
    expect(introCalls[0].entryLinks).toHaveLength(3);
    expect(introCalls[0].entryLinks.map((entry) => entry.label.fr)).toEqual([
      "Tri",
      "Composte",
      "Comportements utiles",
    ]);
    expect(introCalls[0].entryLinks[2].href).toBe("#ressources-utiles");
    expect(introCalls[0].cta.href).toBe("/sections/recycling");

    expect(markup).toContain("data-current-page-id=\"bonnes-pratiques\"");
    expect(markup).toContain("data-testid=\"journey\"");
    expect(markup).toContain("data-compact=\"true\"");
    expect(markup).toContain("data-testid=\"tri-context\"");

    expect(behaviorCalls).toHaveLength(1);
    expect(behaviorCalls[0].id).toBe("ressources-utiles");
  });
});
