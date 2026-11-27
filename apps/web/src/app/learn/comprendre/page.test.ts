import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/ui/site-preferences-provider", async () => (await import("@/app/learn/test-helpers")).createLearnSitePreferencesModule());
vi.mock("@/components/learn/learn-rubric-shell", async () => (await import("@/app/learn/test-helpers")).createLearnRubricShellModule());
vi.mock("@/components/learn/learn-page-visit-tracker", () => ({ LearnPageVisitTracker: () => null }));
vi.mock("@/components/learn/learn-block-journey-section", () => ({ LearnBlockJourneySection: () => React.createElement("div", { "data-testid": "journey" }) }));
vi.mock("./learn-comprendre-sections", () => ({
  LearnReadingFlowSection: () => React.createElement("div", { "data-testid": "reperes" }),
  LearnScaleSection: () => React.createElement("div", { "data-testid": "scale" }),
  LearnClimateSection: () => React.createElement("div", { "data-testid": "climate" }),
  LearnGoalsSection: () => React.createElement("div", { "data-testid": "goals" }),
  LearnDeepDiveSection: () => React.createElement("div", { "data-testid": "art" }),
}));
const explorerCalls: Array<{ publishedPolicies: unknown[]; presidentialArchive: { candidates: unknown[]; validatedCommitments: unknown[] } }> = [];
vi.mock("@/components/learn/environmental-policy-explorer", () => ({
  EnvironmentalPolicyExplorer: (props: (typeof explorerCalls)[number]) => {
    explorerCalls.push(props);
    return React.createElement("div", { "data-testid": "policies" });
  },
}));
import Page from "./page";

describe("LearnVulgarisationPage", () => {
  it("preserves the public metadata and ISR", async () => {
    const page = await import("./page");
    expect(page.revalidate).toBe(86400);
    expect(page.metadata).toMatchObject({ title: "Vulgarisation", robots: { index: true, follow: true } });
  });
  it("renders six ordered accessible themes and keeps unpublished records private", () => {
    explorerCalls.length = 0;
    const markup = renderToStaticMarkup(React.createElement(Page));
    const tabs = [...markup.matchAll(/<button\b[^>]*\brole="tab"[^>]*>/g)].map((match) => match[0]);
    expect(tabs).toHaveLength(6);
    for (const [index, id] of ["reperes", "ordres-de-grandeur", "climat-planete", "odd", "politiques", "art"].entries()) {
      expect(tabs[index]).toContain(`-tab-${id}`);
      expect(tabs[index]).toContain(`aria-selected="${index === 0}"`);
    }
    const panels = [...markup.matchAll(/<div\b[^>]*\brole="tabpanel"[^>]*>/g)].map((match) => match[0]);
    expect(panels).toHaveLength(6);
    expect(panels.filter((panel) => /\bhidden=""/.test(panel))).toHaveLength(5);
    for (const id of ["reperes", "scale", "climate", "goals", "policies", "art", "journey"]) expect(markup).toContain(`data-testid="${id}"`);
    expect(explorerCalls).toHaveLength(1);
    expect(explorerCalls[0].publishedPolicies).toEqual([]);
    expect(explorerCalls[0].presidentialArchive.candidates).toHaveLength(33);
    expect(explorerCalls[0].presidentialArchive.validatedCommitments).toEqual([]);
  });
});
