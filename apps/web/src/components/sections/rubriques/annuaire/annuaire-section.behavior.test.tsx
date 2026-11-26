// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const logicMock = vi.hoisted(() => vi.fn());
const logicCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("./use-annuaire-logic", () => ({
  useAnnuaireLogic: () => {
    logicCalls.count += 1;
    return logicMock();
  },
}));
vi.mock("@/components/ui/cmm-feedback", () => ({
  CmmFeedback: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));
vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: React.ReactNode }) => React.createElement("section", null, children),
}));
vi.mock("@/components/ui/cmm-section", () => ({
  CmmSectionGroup: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));
vi.mock("@/components/ui/rubrique-card", () => ({
  RubriqueCard: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));
vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, href, onClick, ariaPressed }: { children: React.ReactNode; href?: string; onClick?: () => void; ariaPressed?: boolean }) =>
    React.createElement(href ? "a" : "button", { href, onClick, "aria-pressed": ariaPressed }, children),
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock("lucide-react", () => {
  const Icon = () => React.createElement("span");
  return { ArrowRight: Icon, Building2: Icon, Globe: Icon, RefreshCw: Icon };
});
vi.mock("./annuaire-featured-section", () => ({
  AnnuaireFeaturedSection: ({ entries, onFocusMap }: { entries: Array<{ id: string }>; onFocusMap: (id: string) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "featured" },
      entries.map((entry) =>
        React.createElement("button", { key: entry.id, type: "button", "data-featured": entry.id, onClick: () => onFocusMap(entry.id) }, entry.id),
      ),
    ),
}));
vi.mock("./annuaire-exploration-view", () => ({
  AnnuaireExplorationView: ({ logic, mode, onLocateActor, selectedActorId, onSelectedActorIdChange }: { logic: { searchTerm: string }; mode: string; onLocateActor?: (id: string) => void; selectedActorId?: string | null; onSelectedActorIdChange: (id: string) => void }) =>
    React.createElement(
      "div",
      { "data-testid": `exploration-${mode}`, "data-search": logic.searchTerm, "data-selected-actor": selectedActorId ?? "" },
      React.createElement("button", { type: "button", "data-locate": "", onClick: () => onLocateActor?.("target") }, "locate"),
      React.createElement("button", { type: "button", "data-select": "", onClick: () => onSelectedActorIdChange("target") }, "select"),
    ),
}));
vi.mock("./annuaire-partner-drawer", () => ({
  AnnuairePartnerDrawer: ({ entry, onClose }: { entry: { id: string }; onClose: () => void }) =>
    React.createElement("div", { "data-testid": "drawer" }, entry.id, React.createElement("button", { type: "button", "data-close": "", onClick: onClose }, "close")),
}));
vi.mock("./paris-network-contribution-card", () => ({
  ParisNetworkContributionCard: () => React.createElement("div", { "data-testid": "contribution" }),
}));
vi.mock("./public-cleanliness-organization", () => ({
  PublicCleanlinessOrganization: () => React.createElement("div", { "data-testid": "organization" }),
}));

import { AnnuaireSection } from "./annuaire-section";

let root: Root | null = null;
let host: HTMLDivElement | null = null;
const resetFilters = vi.fn();

const featured = Array.from({ length: 8 }, (_, index) => ({ id: `f${index + 1}` }));
const targetEntry = { id: "target" };

beforeEach(() => {
  logicCalls.count = 0;
  resetFilters.mockClear();
  logicMock.mockImplementation(() => ({
    searchTerm: "climat",
    featuredEntries: featured,
    enrichedEntries: [...featured, targetEntry],
    sortedAndFilteredEntries: featured,
    filterKey: "climat|all|all|all|all",
    resetFilters,
    isLoading: false,
    isValidating: false,
    isPublishedDirectoryUnavailable: false,
    isPublishedDirectoryStale: false,
    retryPublishedDirectory: vi.fn(),
  }));
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<AnnuaireSection />));
  return host as HTMLDivElement;
}

const tab = (container: HTMLElement, id: string) => container.querySelector<HTMLButtonElement>(`#annuaire-tab-${id}`) as HTMLButtonElement;
const panel = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`#annuaire-panel-${id}`) as HTMLElement;
const press = (element: HTMLElement, key: string) => act(() => { element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });
const selectedTabs = (container: HTMLElement) => Array.from(container.querySelectorAll('[role="tab"][aria-selected="true"]')).map((node) => node.id);

describe("AnnuaireSection main tabs", () => {
  it("opens on public services by default and mounts only that panel", () => {
    const container = mount();
    expect(selectedTabs(container)).toEqual(["annuaire-tab-organization"]);
    expect(container.querySelector('[data-testid="organization"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="exploration-directory"]')).toBeNull();
    expect(container.querySelector('[data-testid="exploration-map"]')).toBeNull();
    expect(container.querySelector('[data-testid="featured"]')).toBeNull();
    expect(container.querySelectorAll('[role="tabpanel"]:not([hidden])').length).toBe(1);
  });

  it("supports roving tabindex with arrows, Home and End across the three tabs", () => {
    const container = mount();
    press(tab(container, "organization"), "ArrowRight");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-directory"]);
    expect(document.activeElement).toBe(tab(container, "directory"));
    expect(tab(container, "directory").tabIndex).toBe(0);
    expect(tab(container, "organization").tabIndex).toBe(-1);

    press(tab(container, "directory"), "End");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-map"]);
    press(tab(container, "map"), "ArrowRight");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-organization"]);
    press(tab(container, "organization"), "ArrowLeft");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-map"]);
    press(tab(container, "map"), "Home");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-organization"]);
  });

  it("only unhides the active panel and mounts the unified map lazily", () => {
    const container = mount();
    expect(container.querySelector('[data-testid="exploration-map"]')).toBeNull();
    expect(panel(container, "map").hidden).toBe(true);
    act(() => tab(container, "map").click());
    expect(container.querySelector('[data-testid="exploration-map"]')).toBeTruthy();
    expect(panel(container, "map").hidden).toBe(false);
    expect(panel(container, "organization").hidden).toBe(true);
    expect(container.querySelector('[data-testid="exploration-directory"]')).toBeNull();
  });

  it("centralizes featured cards (6 initial, reveal all) inside the directory tab", () => {
    const container = mount();
    act(() => tab(container, "directory").click());
    expect(container.querySelectorAll("[data-featured]").length).toBe(6);
    const showAll = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Afficher toutes (8)");
    act(() => showAll?.click());
    expect(container.querySelectorAll("[data-featured]").length).toBe(8);
    expect(container.querySelector('[data-testid="exploration-directory"]')).toBeTruthy();
  });

  it("keeps the filter state across directory and map through one hook instance per render", () => {
    const container = mount();
    act(() => tab(container, "directory").click());
    expect(container.querySelector('[data-testid="exploration-directory"]')?.getAttribute("data-search")).toBe("climat");
    act(() => tab(container, "map").click());
    expect(container.querySelector('[data-testid="exploration-map"]')?.getAttribute("data-search")).toBe("climat");
    expect(logicCalls.count).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid^="exploration-"]').length).toBe(1);
  });

  it("Localiser opens the map with the selection, restoring filters when the target is excluded", () => {
    const container = mount();
    act(() => tab(container, "directory").click());
    act(() => container.querySelector<HTMLButtonElement>("[data-locate]")?.click());
    expect(resetFilters).toHaveBeenCalledTimes(1);
    expect(selectedTabs(container)).toEqual(["annuaire-tab-map"]);
    expect(container.querySelector('[data-testid="exploration-map"]')?.getAttribute("data-selected-actor")).toBe("target");
    expect(container.querySelector('[data-testid="drawer"]')).toBeNull();
  });

  it("opens one sheet across directory and map, hides it outside directory tabs, and never keeps an orphan after a filter change", () => {
    const container = mount();
    act(() => tab(container, "directory").click());
    act(() => container.querySelector<HTMLButtonElement>("[data-select]")?.click());
    expect(container.querySelectorAll('[data-testid="drawer"]').length).toBe(1);
    act(() => tab(container, "map").click());
    expect(container.querySelector('[data-testid="drawer"]')).toBeNull();
    expect(container.querySelector('[data-testid="exploration-map"]')?.getAttribute("data-selected-actor")).toBe("target");
    act(() => tab(container, "organization").click());
    expect(container.querySelector('[data-testid="drawer"]')).toBeNull();

    logicMock.mockImplementation(() => ({
      searchTerm: "autre",
      featuredEntries: featured,
      enrichedEntries: [...featured, targetEntry],
      sortedAndFilteredEntries: [],
      filterKey: "autre|all|all|all|all",
      resetFilters,
      isLoading: false,
      isValidating: false,
      isPublishedDirectoryUnavailable: false,
      isPublishedDirectoryStale: false,
      retryPublishedDirectory: vi.fn(),
    }));
    act(() => root?.render(<AnnuaireSection />));
    act(() => tab(container, "map").click());
    expect(container.querySelector('[data-testid="drawer"]')).toBeNull();
  });
});
