// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnnuaireLogic } from "./use-annuaire-logic";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("next/dynamic", () => ({
  default: () => () => React.createElement("div", { "data-testid": "map" }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) =>
      React.createElement("div", props, children),
  },
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({
    children,
    href,
    onClick,
    type,
    ariaLabel,
  }: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
  }) =>
    React.createElement(
      href ? "a" : "button",
      { href, onClick, type, "aria-label": ariaLabel },
      children,
    ),
}));

vi.mock("lucide-react", () => {
  const Icon = () => React.createElement("span");
  return {
    AlertCircle: Icon,
    Building2: Icon,
    ChevronDown: Icon,
    Filter: Icon,
    Map: Icon,
    MapPin: Icon,
    PlusCircle: Icon,
    RotateCcw: Icon,
    Search: Icon,
    Share2: Icon,
    Zap: Icon,
  };
});

vi.mock("./annuaire-network-graph", () => ({
  AnnuaireNetworkGraph: () => React.createElement("div"),
}));

vi.mock("./annuaire-partner-drawer", () => ({
  AnnuairePartnerDrawer: () => null,
}));

vi.mock("./annuaire-partner-list", () => ({
  AnnuairePartnerList: ({
    entries,
    currentPage,
  }: {
    entries: Array<{ name: string }>;
    currentPage: number;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "partner-list" },
      `page=${currentPage}:${entries.map((entry) => entry.name).join(",")}`,
    ),
}));

vi.mock("@/components/ui/use-in-view-once", () => ({
  useInViewOnce: () => ({ ref: { current: null }, isInView: true }),
}));

import { AnnuaireExplorationView } from "./annuaire-exploration-view";

const entry = { id: "entry-1", name: "Structure restaurée" };
const initialFilters = {
  searchTerm: "mot-clé",
  filterKind: "association" as AnnuaireLogic["filterKind"],
  filterContribution: "benevolat" as AnnuaireLogic["filterContribution"],
  engagementDomain: "social" as AnnuaireLogic["engagementDomain"],
  zoneFilter: 5 as AnnuaireLogic["zoneFilter"],
  actorCardsPage: 3,
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function mount(element: React.ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}

function Harness({ fr }: { fr: boolean }) {
  const [filters, setFilters] = React.useState(initialFilters);
  const resetFilters = React.useMemo(
    () =>
      vi.fn(() => {
        setFilters({
          searchTerm: "",
          filterKind: "all",
          filterContribution: "all",
          engagementDomain: "all",
          zoneFilter: "all",
          actorCardsPage: 1,
        });
      }),
    [],
  );
  const results = filters.engagementDomain === "all" ? [entry] : [];
  const logic = {
    ...filters,
    setSearchTerm: (value: string) => setFilters((current) => ({ ...current, searchTerm: value })),
    setFilterKind: (value: AnnuaireLogic["filterKind"]) => setFilters((current) => ({ ...current, filterKind: value })),
    setFilterContribution: (value: AnnuaireLogic["filterContribution"]) => setFilters((current) => ({ ...current, filterContribution: value })),
    setEngagementDomain: (value: AnnuaireLogic["engagementDomain"]) => setFilters((current) => ({ ...current, engagementDomain: value })),
    setZoneFilter: (value: AnnuaireLogic["zoneFilter"]) => setFilters((current) => ({ ...current, zoneFilter: value })),
    setActorCardsPage: (value: number | ((previous: number) => number)) =>
      setFilters((current) => ({
        ...current,
        actorCardsPage: typeof value === "function" ? value(current.actorCardsPage) : value,
      })),
    resetFilters,
    enrichedEntries: results,
    sortedAndFilteredEntries: results,
    paginatedEntries: results,
    totalPages: results.length > 0 ? 1 : 0,
    locale: fr ? "fr" : "en",
    targetArrondissement: null,
  } as unknown as AnnuaireLogic;

  return (
    <>
      <AnnuaireExplorationView
        logic={logic}
        fr={fr}
        selectedActorId={null}
        onSelectedActorIdChange={() => undefined}
      />
      <output data-testid="filter-state">{JSON.stringify(filters)}</output>
      <output data-testid="reset-calls">{resetFilters.mock.calls.length}</output>
    </>
  );
}

describe("Annuaire reset from the empty filtered state", () => {
  it.each([
    [true, "Filtres Avancés", "Réinitialiser"],
    [false, "Advanced Filters", "Reset"],
  ])("uses the canonical reset control in %s locale", (fr, filtersLabel, resetLabel) => {
    const container = mount(<Harness fr={fr} />);
    const findButton = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === label,
      );

    const filtersButton = findButton(filtersLabel);
    expect(filtersButton).toBeTruthy();
    act(() => filtersButton?.click());

    const resetButton = findButton(resetLabel);
    expect(resetButton).toBeTruthy();
    expect(container.textContent).toContain(fr ? "Aucun résultat" : "No results");
    expect(resetButton?.getAttribute("type")).toBe("button");
    expect(container.querySelector('[data-testid="filter-state"]')?.textContent).toBe(
      JSON.stringify(initialFilters),
    );
    act(() => resetButton?.click());

    expect(container.querySelector('[data-testid="reset-calls"]')?.textContent).toBe("1");
    expect(container.querySelector('[data-testid="filter-state"]')?.textContent).toBe(
      JSON.stringify({
        searchTerm: "",
        filterKind: "all",
        filterContribution: "all",
        engagementDomain: "all",
        zoneFilter: "all",
        actorCardsPage: 1,
      }),
    );
    expect(container.querySelector('[data-testid="partner-list"]')?.textContent).toBe(
      "page=1:Structure restaurée",
    );
  });
});
