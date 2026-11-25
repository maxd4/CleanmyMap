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
  AnnuaireExplorationView: ({ logic, mode, onLocateActor, onSelectedActorIdChange }: { logic: { searchTerm: string }; mode: string; onLocateActor?: (id: string) => void; onSelectedActorIdChange: (id: string) => void }) =>
    React.createElement(
      "div",
      { "data-testid": `exploration-${mode}`, "data-search": logic.searchTerm },
      React.createElement("button", { type: "button", "data-locate": "", onClick: () => onLocateActor?.("target") }, "locate"),
      React.createElement("button", { type: "button", "data-select": "", onClick: () => onSelectedActorIdChange("target") }, "select"),
    ),
}));
vi.mock("./annuaire-partner-drawer", () => ({
  AnnuairePartnerDrawer: ({ entry, onClose }: { entry: { id: string }; onClose: () => void }) =>
    React.createElement("div", { "data-testid": "drawer" }, entry.id, React.createElement("button", { type: "button", "data-close": "", onClick: onClose }, "close")),
}));
vi.mock("./paris-network-3d-section", () => ({
  ParisNetwork3DSection: ({ active }: { active: boolean }) => React.createElement("div", { "data-testid": "network-3d", "data-active": String(active) }),
}));
vi.mock("./paris-network-contribution-card", () => ({
  ParisNetworkContributionCard: () => React.createElement("div"),
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
  it("opens on the directory and mounts only the directory view with the shared hook", () => {
    const container = mount();
    expect(selectedTabs(container)).toEqual(["annuaire-tab-directory"]);
    expect(container.querySelector('[data-testid="exploration-directory"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="exploration-map"]')).toBeNull();
    expect(container.querySelector('[data-testid="featured"]')).toBeNull();
    expect(container.querySelectorAll('[role="tabpanel"]:not([hidden])').length).toBe(1);
  });

  it("supports roving tabindex with arrows, Home and End, moving focus with selection", () => {
    const container = mount();
    press(tab(container, "directory"), "ArrowRight");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-map"]);
    expect(document.activeElement).toBe(tab(container, "map"));
    expect(tab(container, "map").tabIndex).toBe(0);
    expect(tab(container, "directory").tabIndex).toBe(-1);

    press(tab(container, "map"), "End");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-organization"]);
    press(tab(container, "organization"), "ArrowRight");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-discover"]);
    press(tab(container, "discover"), "ArrowLeft");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-organization"]);
    press(tab(container, "organization"), "Home");
    expect(selectedTabs(container)).toEqual(["annuaire-tab-discover"]);
  });

  it("only unhides the active panel and keeps the 3D scene inactive outside its tab", () => {
    const container = mount();
    expect(container.querySelector('[data-testid="network-3d"]')?.getAttribute("data-active")).toBe("false");
    expect(panel(container, "network").hidden).toBe(true);
    act(() => tab(container, "network").click());
    expect(container.querySelector('[data-testid="network-3d"]')?.getAttribute("data-active")).toBe("true");
    expect(panel(container, "network").hidden).toBe(false);
    expect(panel(container, "directory").hidden).toBe(true);
    expect(container.querySelector('[data-testid="exploration-directory"]')).toBeNull();
  });

  it("shows 6 featured cards first, reveals all, and links back to the directory", () => {
    const container = mount();
    act(() => tab(container, "discover").click());
    expect(container.querySelectorAll("[data-featured]").length).toBe(6);
    const showAll = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Afficher toutes (8)");
    act(() => showAll?.click());
    expect(container.querySelectorAll("[data-featured]").length).toBe(8);
    const toDirectory = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Voir tout l'annuaire");
    act(() => toDirectory?.click());
    expect(selectedTabs(container)).toEqual(["annuaire-tab-directory"]);
  });

  it("keeps the filter state across directory and map through one hook instance per render", () => {
    const container = mount();
    expect(container.querySelector('[data-testid="exploration-directory"]')?.getAttribute("data-search")).toBe("climat");
    act(() => tab(container, "map").click());
    expect(container.querySelector('[data-testid="exploration-map"]')?.getAttribute("data-search")).toBe("climat");
    expect(logicCalls.count).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid^="exploration-"]').length).toBe(1);
  });

  it("Localiser opens the map with the selection, restoring filters when the target is excluded", () => {
    const container = mount();
    act(() => container.querySelector<HTMLButtonElement>("[data-locate]")?.click());
    expect(resetFilters).toHaveBeenCalledTimes(1);
    expect(selectedTabs(container)).toEqual(["annuaire-tab-map"]);
    expect(container.querySelector('[data-testid="drawer"]')?.textContent).toContain("target");

    act(() => container.querySelector<HTMLButtonElement>("[data-close]")?.click());
    expect(container.querySelector('[data-testid="drawer"]')).toBeNull();
  });

  it("opens one sheet only on the map and never keeps an orphan after a filter change", () => {
    const container = mount();
    act(() => tab(container, "map").click());
    act(() => container.querySelector<HTMLButtonElement>("[data-select]")?.click());
    expect(container.querySelectorAll('[data-testid="drawer"]').length).toBe(1);
    act(() => tab(container, "directory").click());
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
