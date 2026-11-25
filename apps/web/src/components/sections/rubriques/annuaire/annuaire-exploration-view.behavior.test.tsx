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

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({
    children,
    href,
    onClick,
    type,
    ariaLabel,
    ariaPressed,
    disabled,
  }: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
    ariaPressed?: boolean;
    disabled?: boolean;
  }) =>
    React.createElement(
      href ? "a" : "button",
      { href, onClick, type, disabled, "aria-label": ariaLabel, "aria-pressed": ariaPressed },
      children,
    ),
}));

vi.mock("lucide-react", () => {
  const Icon = () => React.createElement("span");
  return {
    AlertCircle: Icon,
    ChevronDown: Icon,
    PlusCircle: Icon,
    RotateCcw: Icon,
    Share2: Icon,
  };
});

vi.mock("./annuaire-partner-list", () => ({
  AnnuairePartnerList: ({
    entries,
    currentPage,
    onFocusMap,
  }: {
    entries: Array<{ id: string; name: string }>;
    currentPage: number;
    onFocusMap: (id: string) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "partner-list" },
      `page=${currentPage}:${entries.map((entry) => entry.name).join(",")}`,
      React.createElement(
        "button",
        { type: "button", "data-testid": "locate", onClick: () => onFocusMap(entries[0]?.id ?? "") },
        "locate",
      ),
    ),
  AnnuairePagination: () => null,
}));

import { AnnuaireExplorationView } from "./annuaire-exploration-view";

const entry = { id: "entry-1", name: "Structure restaurée", location: "Paris", coveredArrondissements: [] };
const initialFilters = {
  searchTerm: "mot-clé",
  filterKind: "association" as AnnuaireLogic["filterKind"],
  filterContribution: "materiel" as AnnuaireLogic["filterContribution"],
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

function Harness({
  fr,
  mode = "directory",
  targetArrondissement = null,
  onSelect = () => undefined,
  onLocate,
  domain = "social",
}: {
  domain?: AnnuaireLogic["engagementDomain"];
  fr: boolean;
  mode?: "directory" | "map";
  targetArrondissement?: number | null;
  onSelect?: (id: string | null) => void;
  onLocate?: (id: string) => void;
}) {
  const [filters, setFilters] = React.useState({ ...initialFilters, engagementDomain: domain });
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
    targetArrondissement,
  } as unknown as AnnuaireLogic;

  return (
    <>
      <AnnuaireExplorationView
        logic={logic}
        fr={fr}
        mode={mode}
        selectedActorId={null}
        onSelectedActorIdChange={onSelect}
        onLocateActor={onLocate}
      />
      <output data-testid="filter-state">{JSON.stringify(filters)}</output>
      <output data-testid="reset-calls">{resetFilters.mock.calls.length}</output>
    </>
  );
}

function state(container: HTMLElement) {
  return JSON.parse(container.querySelector('[data-testid="filter-state"]')?.textContent ?? "{}");
}

function change(select: HTMLSelectElement | HTMLInputElement, value: string) {
  const proto = select instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  act(() => {
    setter?.call(select, value);
    select.dispatchEvent(new Event(select instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

function selectByLabel(container: HTMLElement, label: string) {
  const labelNode = Array.from(container.querySelectorAll("label")).find((node) =>
    node.textContent?.startsWith(label),
  );
  expect(labelNode, `label ${label}`).toBeTruthy();
  const control = container.querySelector<HTMLSelectElement>(`#${labelNode?.getAttribute("for")}`);
  expect(control?.tagName).toBe("SELECT");
  return control as HTMLSelectElement;
}

describe("Annuaire reset from the empty filtered state", () => {
  it.each([
    [true, "Réinitialiser"],
    [false, "Reset"],
  ])("uses the canonical reset control in %s locale", (fr, resetLabel) => {
    const container = mount(<Harness fr={fr} />);
    const resetButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === resetLabel,
    );

    expect(container.querySelector('[data-testid="partner-list"]')?.textContent).toContain("page=3");
    act(() => {
      change(selectByLabel(container, fr ? "Domaine d'engagement" : "Engagement domain"), "all");
    });
    const emptyReset = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === resetLabel,
    );
    expect(emptyReset ?? resetButton).toBeTruthy();
    expect(container.textContent).not.toContain(fr ? "Aucun résultat" : "No results");
  });

  it("shows the empty state and resets every filter and the page at once", () => {
    const container = mount(<Harness fr />);
    expect(container.textContent).toContain("Aucun résultat");
    expect(state(container)).toEqual(initialFilters);
    const resetButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Réinitialiser",
    );
    expect(resetButton?.getAttribute("type")).toBe("button");
    act(() => resetButton?.click());

    expect(container.querySelector('[data-testid="reset-calls"]')?.textContent).toBe("1");
    expect(state(container)).toEqual({
      searchTerm: "",
      filterKind: "all",
      filterContribution: "all",
      engagementDomain: "all",
      zoneFilter: "all",
      actorCardsPage: 1,
    });
    expect(container.querySelector('[data-testid="partner-list"]')?.textContent).toContain(
      "page=1:Structure restaurée",
    );
  });
});

describe("Annuaire filter menus", () => {
  it("replaces chip blocks with labelled native selects wired to the same filters and page reset", () => {
    const container = mount(<Harness fr targetArrondissement={11} />);
    expect(container.querySelectorAll("select").length).toBe(5);

    change(selectByLabel(container, "Type de structure"), "commerce");
    expect(state(container)).toMatchObject({ filterKind: "commerce", actorCardsPage: 1 });

    change(selectByLabel(container, "Domaine d'engagement"), "unclassified");
    expect(state(container)).toMatchObject({ engagementDomain: "unclassified", actorCardsPage: 1 });

    const zone = selectByLabel(container, "Arrondissement");
    expect(Array.from(zone.options).map((option) => option.value)).toContain("nearby");
    change(zone, "nearby");
    expect(state(container).zoneFilter).toBe("nearby");
    change(zone, "12");
    expect(state(container).zoneFilter).toBe(12);

    change(selectByLabel(container, "Type d'aide"), "logistique");
    expect(state(container).filterContribution).toBe("logistique");
  });

  it("offers Domaine non renseigné and hides Proches de moi without a known arrondissement", () => {
    const container = mount(<Harness fr />);
    const domain = selectByLabel(container, "Domaine d'engagement");
    expect(Array.from(domain.options).map((option) => option.textContent)).toContain("Domaine non renseigné");
    const zone = selectByLabel(container, "Arrondissement");
    expect(Array.from(zone.options).map((option) => option.value)).not.toContain("nearby");
  });

  it("keeps keywords as text search semantics, in one search field", () => {
    const container = mount(<Harness fr />);
    expect(container.querySelectorAll('input[type="search"]').length).toBe(1);
    change(selectByLabel(container, "Mot-clé"), "climat");
    expect(state(container)).toMatchObject({ searchTerm: "climat", actorCardsPage: 1 });
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe("climat");
    change(container.querySelector<HTMLInputElement>('input[type="search"]') as HTMLInputElement, "autre");
    expect(selectByLabel(container, "Mot-clé").value).toBe("");
  });

  it("localizes labels and the result counter in English", () => {
    const container = mount(<Harness fr={false} />);
    expect(container.textContent).toContain("Structure type");
    expect(container.textContent).toContain("More filters");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("results found");
  });
});

describe("Annuaire exploration modes", () => {
  it("directory mode shows the list and no heavy visualization", () => {
    const container = mount(<Harness fr domain="all" />);
    expect(container.querySelector('[data-testid="partner-list"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="map"]')).toBeNull();
    expect(container.querySelector('[data-testid="graph"]')).toBeNull();
  });

  it("directory Localiser delegates to the locate handler instead of opening the sheet", () => {
    const onLocate = vi.fn();
    const onSelect = vi.fn();
    const container = mount(<Harness fr domain="all" onLocate={onLocate} onSelect={onSelect} />);
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="locate"]')?.click());
    expect(onLocate).toHaveBeenCalledWith("entry-1");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("map mode shows the unified map, toggles documented relations, and exposes outside/unknown panels", () => {
    const onSelect = vi.fn();
    const container = mount(<Harness fr domain="all" mode="map" onSelect={onSelect} />);
    expect(container.querySelector('[data-testid="map"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="partner-list"]')).toBeNull();
    expect(container.querySelector('section[aria-label="Hors de Paris"]')).toBeTruthy();
    expect(container.querySelector('section[aria-label="Localisation non établie"]')).toBeTruthy();

    const parisScope = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Paris intramuros",
    );
    const nationalScope = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "National (France métropolitaine)",
    );
    expect(parisScope?.getAttribute("aria-pressed")).toBe("true");
    expect(nationalScope?.getAttribute("aria-pressed")).toBe("false");
    act(() => nationalScope?.click());
    expect(nationalScope?.getAttribute("aria-pressed")).toBe("true");

    const relButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Relations documentées"),
    );
    expect(relButton?.getAttribute("aria-pressed")).toBe("true");
    act(() => relButton?.click());
    expect(relButton?.getAttribute("aria-pressed")).toBe("false");

    const compact = container.querySelector('ul[aria-label="Résultats de l\'annuaire"] button');
    expect(compact?.textContent).toContain("Structure restaurée");
    act(() => (compact as HTMLButtonElement).click());
    expect(onSelect).toHaveBeenCalledWith("entry-1");
  });
});
