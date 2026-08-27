import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildDefaultActionsMapFilters } from "./actions-map-filters.utils";
import { ActionsMapFilterControls } from "./actions-map-filter-controls";

describe("ActionsMapFilterControls", () => {
  it("only renders controls that affect the public map", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionsMapFilterControls, {
        filters: buildDefaultActionsMapFilters(90),
        categoryCounts: {
          blue: 0,
          orange: 0,
          red: 0,
          violet: 0,
          black: 0,
          green: 0,
          bin: 0,
          ashtray: 0,
          combo: 0,
        },
        onZoneQueryChange: vi.fn(),
        onDateScopeChange: vi.fn(),
        onCategoryToggle: vi.fn(),
        onReset: vi.fn(),
      }),
    );

    expect(markup).toContain("Zone");
    expect(markup).toContain("Période");
    expect(markup).toContain("Catégories visibles");
    expect(markup).toContain("Réinitialiser");
    expect(markup).not.toContain("Statut");
    expect(markup).not.toContain("Toutes les actions");
  });
});
