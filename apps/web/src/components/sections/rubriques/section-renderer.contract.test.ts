import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";

vi.mock("next/dynamic", () => ({
  default: () => function DynamicSectionStub(props: Record<string, unknown>) {
    return React.createElement("div", { "data-dynamic-section": "true", ...props });
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("a", props, children),
}));

import {
  FINALIZED_SECTION_RENDERERS,
  SectionRenderer,
} from "./section-renderer";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("composed Climate heading contract", () => {
  it("keeps Climate as the only primary heading", () => {
    const renderer = read("./section-renderer.tsx");
    const compare = read("./compare-section.tsx");

    expect(renderer).toContain(
      "<ClimateSection initialData={initialData?.climate} />",
    );
    expect(renderer).toContain("<CompareSection />");
    expect(compare).toContain('headingLevel="h2"');
  });

  it("keeps Open Data primary and links to the dedicated Funding page", () => {
    const renderer = read("./section-renderer.tsx");
    const openData = read("./open-data-section.tsx");
    const funding = read("./funding-section.tsx");

    expect(renderer).toContain("<OpenDataSection />");
    const openDataRenderer = renderer.match(/"open-data": \(\) => \([\s\S]*?\n  \),\n  funding:/)?.[0] ?? "";
    expect(openDataRenderer).toContain("<OpenDataFundingLink />");
    expect(openDataRenderer).not.toContain("<FundingSection");
    expect(renderer).toContain('href="/sections/funding"');
    expect(renderer).toContain(
      "funding: (fundingOnParticipeUrl?: string) => (\n    <FundingSection onParticipeUrl={fundingOnParticipeUrl} />",
    );
    expect(openData).toContain("<PageHeader");
    expect(funding).toContain("headingLevel={headingLevel}");
  });

  it("dispatches every finalized section through its registered renderer", () => {
    for (const [id, render] of Object.entries(FINALIZED_SECTION_RENDERERS)) {
      const output = render(
        id === "funding" ? "/sections/funding?source=test" : undefined,
        {
          actors: { actors: [] },
          recycling: { categories: [] },
          climate: { metrics: [] },
        } as never,
        { status: "open" } as never,
      );

      expect(React.isValidElement(output), `${id} must return a React element`).toBe(true);
    }
  });

  it("preserves pending-section purpose and does not dispatch it as finalized", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        SitePreferencesProvider,
        null,
        React.createElement(SectionRenderer, {
          section: {
            id: "future-section",
            categoryId: "resources",
            priority: 99,
            kind: "section",
            route: "/sections/future-section",
            label: { fr: "Rubrique future", en: "Future section" },
            description: { fr: "Description future", en: "Future description" },
            availability: "available",
            implementation: "pending",
            anonymousPresentation: "visible",
            pendingNote: { fr: "Bientôt", en: "Soon" },
          },
        }),
      ),
    );

    expect(markup).toContain("Rubrique future");
    expect(markup).toContain("Description future");
    expect(markup).toContain("Bientôt");
    expect(markup).not.toContain("data-dynamic-section");
  });

  it("keeps private initial data and the funding capability on their owning renderers", () => {
    const actors = FINALIZED_SECTION_RENDERERS.actors(undefined, {
      actors: { actors: [{ id: "actor-1" }] },
    } as never) as React.ReactElement<{ initialData?: unknown }>;
    const funding = FINALIZED_SECTION_RENDERERS.funding("/actions/new?source=funding") as React.ReactElement<{ onParticipeUrl?: string }>;

    expect(actors.props.initialData).toEqual({ actors: [{ id: "actor-1" }] });
    expect(funding.props.onParticipeUrl).toBe("/actions/new?source=funding");
  });
});
