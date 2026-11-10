import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("a", props, children),
}));
vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => React.createElement("h1", null, title),
}));

import { SpogomiPublicEventNavigation } from "./spogomi-public-event-navigation";

describe("SpogomiPublicEventNavigation", () => {
  it("uses five keyboard links with anchor semantics instead of a false tab widget", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPublicEventNavigation
        baseHref="/spogomi/paris-2026"
        name="SPOGOMI Paris"
        locationLabel="Paris"
        startsAtLabel="1 juin 2026"
        modeLabel="Casual & World Cup"
        lifecycleLabel="À venir"
        resultsLabel="Résultats indisponibles"
        divisions={[
          { id: "division-casual", type: "casual" },
          { id: "division-world", type: "world_cup" },
        ]}
        selectedDivisionType="world_cup"
        activeTab="rankings"
        keyFigures={[{ label: "Équipes", value: "2" }]}
      />,
    );

    expect(markup.match(/href=/g)).toHaveLength(7);
    expect(markup).toContain('aria-current="location"');
    expect(markup).toContain(
      'href="/spogomi/paris-2026?tab=rankings&amp;division=world_cup#spogomi-tab-rankings"',
    );
    expect(markup).toContain(
      'href="/spogomi/paris-2026?tab=rankings&amp;division=casual#spogomi-tab-rankings"',
    );
    expect(markup).not.toContain('role="tablist"');
    expect(markup).not.toContain('role="tab"');
    expect(markup).not.toContain("aria-selected");
    expect(markup).toContain("focus-visible:ring-2");
  });
});
