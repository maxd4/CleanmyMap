// @vitest-environment jsdom

import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNavigationSpacesForProfile } from "../../lib/navigation";
import { GlobalSearch } from "./global-search";

const mocks = vi.hoisted(() => ({
  pathname: "/sections/map",
  router: { push: vi.fn() },
  preferences: { locale: "fr" as const, displayMode: "exhaustif" as const },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("a", props, children),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => mocks.preferences,
}));

vi.mock("@/components/ui/cmm-dropdown", () => ({
  CmmDropdown: ({
    children,
    open,
    onOpenChange,
    renderTrigger,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (nextOpen: boolean) => void;
    renderTrigger: (props: Record<string, unknown>) => React.ReactNode;
  }) => (
    <div data-dropdown-open={String(Boolean(open))}>
      {renderTrigger({
        type: "button",
        "aria-expanded": Boolean(open),
        "aria-controls": "global-search-popover",
        onMouseDown: () => undefined,
        onMouseEnter: () => undefined,
        onKeyDown: () => undefined,
        onClick: () => onOpenChange?.(!open),
      })}
      {open ? children : null}
    </div>
  ),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const searchSource = readFileSync(resolve(process.cwd(), "src/components/navigation/global-search.tsx"), "utf8");
const dropdownSource = readFileSync(resolve(process.cwd(), "src/components/ui/cmm-dropdown.tsx"), "utf8");

describe("GlobalSearch", () => {
  beforeEach(() => {
    mocks.pathname = "/sections/map";
    mocks.router.push.mockReset();
  });

  function renderSearch() {
    let renderer!: ReactTestRenderer;
    const focus = vi.fn();
    act(() => {
      renderer = create(<GlobalSearch currentProfile="benevole" />, {
        createNodeMock: (element) =>
          element.type === "input" || element.type === "button"
            ? { focus }
            : {},
      });
    });
    return { renderer, focus };
  }

  function openSearch(renderer: ReactTestRenderer) {
    const trigger = renderer.root.findByProps({ "aria-label": "Rechercher" });
    act(() => {
      trigger.props.onClick();
    });
  }

  it("uses the shared non-modal dropdown without a viewport overlay", () => {
    expect(searchSource).toContain('import { CmmDropdown } from "@/components/ui/cmm-dropdown"');
    expect(searchSource).toContain('<CmmDropdown');
    expect(searchSource).toContain('panelRole="region"');
    expect(searchSource).toContain('triggerHasPopup="dialog"');
    expect(searchSource).toContain('panelClassName="w-[min(42rem,calc(100vw-1rem))]"');
    expect(searchSource).toContain("whitespace-nowrap font-black uppercase tracking-[0.14em]");
    expect(searchSource).toContain("NavigationItemText");
    expect(searchSource).toContain("cmm-text-caption");
    expect(searchSource).not.toContain("text-[10px]");
    expect(searchSource).not.toContain("truncate");
    expect(searchSource).not.toContain("line-clamp-2");
    expect(searchSource).toContain("verticalGap={8}");
    expect(searchSource).not.toContain("fixed inset-0");
    expect(searchSource).not.toContain("bg-slate-950/88");
    expect(searchSource).not.toContain("pt-[15vh]");
    expect(searchSource).not.toContain("pt-[20vh]");
    expect(searchSource).not.toContain("CmmDialog");
    expect(searchSource).not.toContain("AnimatePresence");
    expect(dropdownSource).toContain("left: panelLeft");
    expect(dropdownSource).toContain("max-w-[calc(100vw-1rem)]");
  });

  it("keeps the global search keyboard and navigation contract", () => {
    expect(searchSource).toContain("getNavigationSpacesForProfile");
    expect(searchSource).toContain(
      'import { filterGlobalSearchItems, type GlobalSearchItem } from "./global-search-matching"',
    );
    expect(searchSource).toContain("filterGlobalSearchItems(allItems, query, locale)");
    expect(searchSource).not.toContain("searchTerms");
    expect(searchSource).not.toContain("searchKeywords.includes(term)");
    expect(searchSource).toContain("event.metaKey || event.ctrlKey");
    expect(searchSource).toContain('event.key === "ArrowDown"');
    expect(searchSource).toContain('event.key === "ArrowUp"');
    expect(searchSource).toContain('event.key === "Enter"');
    expect(searchSource).toContain("searchInputRef.current?.focus()");
    expect(searchSource).not.toContain("autoFocus");
    expect(searchSource).toContain("router.push(filteredItems[selectedIndex].href)");
    expect(searchSource).toContain('setQuery("")');
    expect(dropdownSource).toContain('event.key === "Escape"');
    expect(dropdownSource).toContain("pointerdown");
    expect(dropdownSource).toContain("triggerRef.current?.focus()");
  });

  it("derives empty-state suggestions from the accessible navigation index", () => {
    expect(searchSource).toContain(
      "const suggestedItems = useMemo(() => allItems.slice(0, 5), [allItems]);",
    );
    expect(searchSource).toContain("suggestedItems.map((item)");
    expect(searchSource).toContain("onClick={() => setQuery(item.label[locale])}");
    expect(searchSource).toContain("buildSearchItems(currentProfile, displayMode, locale)");
    expect(searchSource).not.toContain('["Carte", "Impact", "Profil", "Admin", "Aide"]');
    expect(searchSource).not.toContain('title="Rechercher (Ctrl+K)"');
    expect(searchSource).not.toContain("Quick Search System");
  });

  it("keeps profile-specific destinations out of the search index", () => {
    const itemIdsFor = (profile: "benevole" | "admin") =>
      getNavigationSpacesForProfile(profile, "exhaustif", "fr")
        .flatMap((space) => space.items)
        .map((item) => item.id);

    expect(itemIdsFor("benevole")).not.toContain("admin");
    expect(itemIdsFor("admin")).toContain("admin");
  });

  it("keeps the French footer and restrained result interaction", () => {
    expect(searchSource).toContain(">Entrée</span>");
    expect(searchSource).toContain(">Échap</span>");
    expect(searchSource).toContain("Rubrique");
    expect(searchSource).toContain("item.spaceLabel");
    expect(searchSource).toContain("item.description[locale]");
    expect(searchSource).toContain("focus-visible:ring-2 focus-visible:ring-emerald-300");
    expect(searchSource).not.toContain("translate-x-1");
    expect(searchSource).not.toContain("scale-110");
  });

  it("covers the empty, filtered and no-result states from the rendered index", () => {
    const { renderer } = renderSearch();
    openSearch(renderer);

    expect(renderer.root.findByProps({ "aria-label": "Rechercher une rubrique, un outil ou une aide" })).toBeTruthy();
    expect(renderer.root.findByProps({ children: "Explorez les rubriques accessibles" })).toBeTruthy();

    const input = renderer.root.findByType("input");
    act(() => {
      input.props.onChange({ target: { value: "carte" } });
    });
    expect(renderer.root.findAllByType("a").length).toBeGreaterThan(0);

    act(() => {
      input.props.onChange({ target: { value: "[terme-inexistant]" } });
    });
    expect(renderer.root.findByProps({ children: "Aucun résultat pour cette recherche" })).toBeTruthy();
    renderer.unmount();
  });

  it("keeps keyboard selection, Enter navigation, focus and explicit close working", () => {
    const { renderer, focus } = renderSearch();
    openSearch(renderer);
    expect(focus).toHaveBeenCalled();

    const input = renderer.root.findByType("input");
    act(() => {
      input.props.onChange({ target: { value: "carte" } });
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(mocks.router.push).toHaveBeenCalledTimes(1);
    expect(mocks.router.push.mock.calls[0]?.[0]).toMatch(/^\//u);
    expect(renderer.root.findByProps({ "data-dropdown-open": "false" })).toBeTruthy();

    openSearch(renderer);
    const closeButton = renderer.root.findByProps({ "aria-label": "Fermer la recherche" });
    act(() => {
      closeButton.props.onClick();
    });
    expect(renderer.root.findByProps({ "data-dropdown-open": "false" })).toBeTruthy();
    renderer.unmount();
  });

  it("clears query and closes when the pathname changes", () => {
    vi.useFakeTimers();
    try {
      const { renderer } = renderSearch();
      openSearch(renderer);
      const input = renderer.root.findByType("input");
      act(() => {
        input.props.onChange({ target: { value: "carte" } });
      });
      expect(renderer.root.findAllByType("a").length).toBeGreaterThan(0);

      mocks.pathname = "/sections/methodologie";
      act(() => {
        renderer.update(<GlobalSearch currentProfile="benevole" />);
        vi.runAllTimers();
      });

      expect(renderer.root.findByProps({ "data-dropdown-open": "false" })).toBeTruthy();
      renderer.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
