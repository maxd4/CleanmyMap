import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionsHistoryListControls } from "./actions-history-list-controls";
import { formatActionStatus } from "./actions-history-list.helpers";
import type { ActionsHistoryListQueryModel } from "./use-actions-history-list-query";

function buildQuery(overrides: Partial<ActionsHistoryListQueryModel> = {}): ActionsHistoryListQueryModel {
  return {
    statusFilter: "approved",
    qualityFilter: "all",
    toFixOnly: false,
    limit: 25,
    search: "",
    sortBy: "date_desc",
    data: undefined,
    error: null,
    isLoading: false,
    isValidating: false,
    reload: vi.fn(),
    items: [],
    filteredItems: [],
    approvedFilteredItems: [],
    qualityById: new Map(),
    selectedId: null,
    selectedIndex: -1,
    selectedItem: null,
    selectedQuality: null,
    selectedOperational: null,
    selectedLostPoints: 0,
    correctiveAction: null,
    hasActiveFilters: false,
    activeSecondaryFilterCount: 0,
    setStatusFilter: vi.fn(),
    setQualityFilter: vi.fn(),
    setToFixOnly: vi.fn(),
    setLimit: vi.fn(),
    setSearch: vi.fn(),
    setSortBy: vi.fn(),
    setSelectedId: vi.fn(),
    resetFilters: vi.fn(),
    ...overrides,
  } as ActionsHistoryListQueryModel;
}

function render(overrides: Partial<ActionsHistoryListQueryModel> = {}, partialSource?: boolean) {
  return renderToStaticMarkup(
    React.createElement(ActionsHistoryListControls, {
      partialSource,
      partialSourcesLabel: "map",
      query: buildQuery(overrides),
      pdfData: null,
    }),
  );
}

describe("ActionsHistoryListControls", () => {
  it("renders quick search, status tabs, filters toggle, PDF trigger and real count without secondary clutter", () => {
    const markup = render();

    expect(markup).toContain("Rechercher par bénévole ou lieu");
    expect(markup).toContain("Approuvé");
    expect(markup).toContain("En attente");
    expect(markup).toContain("Refusé");
    expect(markup).toContain("Filtres");
    expect(markup).toContain("Exporter PDF");
    expect(markup).toContain("0 enregistrement");
    expect(markup).toContain('aria-controls="history-secondary-filters"');
    expect(markup).not.toContain('id="history-secondary-filters"');
    expect(markup).not.toContain("<h2");
  });

  it("shows active secondary filter count and partial-source warning when applicable", () => {
    const markup = render(
      { activeSecondaryFilterCount: 2, hasActiveFilters: true, toFixOnly: true, qualityFilter: "C" },
      true,
    );

    expect(markup).toContain(">2<");
    expect(markup).toContain("Grade C");
    expect(markup).toContain("À corriger");
    expect(markup).toContain("Sources partielles : map");
    expect(markup).toContain("Réinitialiser les filtres");
  });

  it("labels record statuses in French", () => {
    expect(formatActionStatus("pending")).toBe("En attente");
    expect(formatActionStatus("approved")).toBe("Approuvé");
    expect(formatActionStatus("rejected")).toBe("Refusé");
    expect(formatActionStatus(null)).toBe("—");
  });
});
