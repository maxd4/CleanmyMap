import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MapEmptyState } from "./map-empty-state";
import { resolveMapEmptyStateMode } from "./map-data-status";

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("button", { type: "button" }, children),
}));

const baseProps = {
  freshnessLabel: null,
  hasPartialSource: false,
  isTruncated: true,
  partialSourcesLabel: "inconnues",
  onResetFilters: vi.fn(),
  onReload: vi.fn(),
  isValidating: false,
};

describe("MapEmptyState", () => {
  it("uses a bounded empty state when local filtering finds no visible item", () => {
    expect(resolveMapEmptyStateMode(3, 0, true)).toBe("truncated");
    expect(resolveMapEmptyStateMode(3, 0, false)).toBe("filtered");
    expect(resolveMapEmptyStateMode(3, 1, true)).toBe("filtered");
    expect(resolveMapEmptyStateMode(0, 0, false)).toBe("empty");
  });

  it("does not present a bounded empty window as proof of perimeter-wide absence", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MapEmptyState, {
        ...baseProps,
        mode: "truncated",
      }),
    );

    expect(markup).toContain("Aucun résultat dans la fenêtre chargée");
    expect(markup).toContain("ne permet pas de conclure à l&#x27;absence d&#x27;action dans tout le périmètre");
    expect(markup).toContain("Résultats limités à la fenêtre chargée");
    expect(markup).not.toContain("Aucune action remontée sur ce périmètre");
  });

  it("keeps the perimeter-wide empty state when the source was not truncated", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MapEmptyState, {
        ...baseProps,
        isTruncated: false,
        mode: "empty",
      }),
    );

    expect(markup).toContain("Aucune action remontée sur ce périmètre");
    expect(markup).not.toContain("Résultats limités à la fenêtre chargée");
  });
});
