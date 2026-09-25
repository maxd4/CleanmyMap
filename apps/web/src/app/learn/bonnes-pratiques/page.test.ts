import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ThemeChange = "tri" | "compost" | "reduire" | "numerique";

type BehaviorProps = {
  id?: string;
};

type JourneyProps = {
  currentPageId: string;
  compact?: boolean;
};

type TabsProps = {
  activeTheme: ThemeChange;
  onThemeChange: (theme: ThemeChange) => void;
};

const tabsCalls: TabsProps[] = [];
const behaviorCalls: BehaviorProps[] = [];
const replaceMock = vi.fn();
let searchParamsValue = new URLSearchParams("theme=compost");

vi.mock("next/navigation", () => ({
  usePathname: () => "/learn/bonnes-pratiques",
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsValue.get(key),
    toString: () => searchParamsValue.toString(),
  }),
}));

vi.mock("@/components/ui/site-preferences-provider", async () =>
  (await import("@/app/learn/test-helpers")).createLearnSitePreferencesModule(),
);

vi.mock("@/components/learn/learn-rubric-shell", async () =>
  (await import("@/app/learn/test-helpers")).createLearnRubricShellModule(),
);

vi.mock("@/components/learn/learn-localized-heading", () => ({
  LearnLocalizedHeading: ({ en }: { fr: string; en: string }) =>
    React.createElement(
      "h1",
      { className: "cmm-page-header-title text-slate-950" },
      en,
    ),
}));

vi.mock("@/components/learn/learn-practice-theme-tabs", () => ({
  LearnPracticeThemeTabs: (props: TabsProps) => {
    tabsCalls.push(props);
    return React.createElement("div", { "data-testid": "theme-tabs" });
  },
}));

vi.mock("@/components/learn/learn-tri-context-section", () => ({
  LearnTriContextSection: () => React.createElement("div", { "data-testid": "tri-context" }),
}));

vi.mock("@/components/learn/learn-behavior-awareness-section", () => ({
  LearnBehaviorAwarenessSection: (props: BehaviorProps) => {
    behaviorCalls.push(props);
    return React.createElement("section", { "data-testid": "awareness", id: props.id });
  },
}));

vi.mock("@/components/learn/learn-block-journey-section", () => ({
  LearnBlockJourneySection: (props: JourneyProps) =>
    React.createElement("div", {
      "data-testid": "journey",
      "data-current-page-id": props.currentPageId,
      "data-compact": String(Boolean(props.compact)),
    }),
}));

vi.mock("@/components/learn/learn-gestes-propres-insights-section", () => ({
  LearnGestesPropresInsightsSection: (props: { scope: string; theme?: string }) =>
    React.createElement("div", {
      "data-testid": "gestes-propres-insights",
      "data-scope": props.scope,
      "data-theme": props.theme ?? "",
    }),
}));

vi.mock("@/components/learn/learn-page-visit-tracker", () => ({
  LearnPageVisitTracker: () => null,
}));

import Page from "./page";

describe("bonnes-pratiques page", () => {
  beforeEach(() => {
    tabsCalls.length = 0;
    behaviorCalls.length = 0;
    replaceMock.mockClear();
  });

  it("wires the active theme from the URL and keeps the compact structure", async () => {
    searchParamsValue = new URLSearchParams("theme=compost&origin=learn");

    const markup = renderToStaticMarkup(await Page());

    expect(markup).toContain("data-testid=\"theme-tabs\"");
    expect(markup).toContain("data-testid=\"tri-context\"");
    expect(markup).toContain("data-testid=\"awareness\"");
    expect(markup).toContain("data-testid=\"journey\"");
    expect(markup).toContain("data-testid=\"gestes-propres-insights\"");
    expect(markup.indexOf("data-testid=\"theme-tabs\"")).toBeLessThan(markup.indexOf("data-testid=\"tri-context\""));
    expect(markup.indexOf("data-testid=\"tri-context\"")).toBeLessThan(markup.indexOf("data-testid=\"awareness\""));
    expect(markup.indexOf("data-testid=\"awareness\"")).toBeLessThan(markup.indexOf("data-testid=\"journey\""));
    expect(markup.indexOf("data-testid=\"journey\"")).toBeLessThan(markup.indexOf("data-testid=\"gestes-propres-insights\""));

    expect(tabsCalls).toHaveLength(1);
    expect(tabsCalls[0].activeTheme).toBe("compost");
    expect(behaviorCalls).toHaveLength(1);
    expect(behaviorCalls[0].id).toBe("ressources-utiles");
    expect(markup).toContain("data-scope=\"overview\"");

    tabsCalls[0].onThemeChange("reduire");
    expect(replaceMock).toHaveBeenCalledWith("/learn/bonnes-pratiques?theme=reduire&origin=learn", {
      scroll: false,
    });
  });

  it("persists the numerique theme in the URL", async () => {
    searchParamsValue = new URLSearchParams("theme=tri");

    renderToStaticMarkup(await Page());

    expect(tabsCalls).toHaveLength(1);
    tabsCalls[0].onThemeChange("numerique");
    expect(replaceMock).toHaveBeenCalledWith("/learn/bonnes-pratiques?theme=numerique", {
      scroll: false,
    });
  });

  it("falls back to tri when the URL theme is unknown", async () => {
    searchParamsValue = new URLSearchParams("theme=inconnu");

    renderToStaticMarkup(await Page());

    expect(tabsCalls).toHaveLength(1);
    expect(tabsCalls[0].activeTheme).toBe("tri");
  });

  it("passes the localized heading labels to the client boundary", async () => {
    const markup = renderToStaticMarkup(await Page());

    expect(markup).toContain("Good practices");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });
});
