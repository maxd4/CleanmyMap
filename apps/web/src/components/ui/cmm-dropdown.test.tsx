// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CmmDropdown, DEFAULT_HOVER_CLOSE_DELAY_MS } from "./cmm-dropdown";

const source = readFileSync(resolve(process.cwd(), "src/components/ui/cmm-dropdown.tsx"), "utf8");

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const activeRoots: Array<{ host: HTMLDivElement; root: Root }> = [];

afterEach(() => {
  for (const { host, root } of activeRoots.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CmmDropdown", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("getComputedStyle", () => ({ zoom: "" }));
  });

  it("renders one centered non-modal panel and arrow contract", () => {
    const markup = renderToStaticMarkup(
      <CmmDropdown
        id="test-dropdown-panel"
        ariaLabel="Menu de test"
        open
        panelRole="region"
        panelClassName="w-64 bg-slate-950"
        renderTrigger={(triggerProps) => (
          <button {...triggerProps} aria-label="Ouvrir le menu">
            Déclencheur
          </button>
        )}
      >
        <span>Contenu</span>
      </CmmDropdown>,
    );

    expect(markup).toContain('id="test-dropdown-panel"');
    expect(markup).toContain('role="region"');
    expect(markup).toContain('class="fixed z-[70]');
    expect(markup).toContain("left:50%");
    expect(markup).toContain("-translate-x-1/2");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-modal="true"');
    expect(markup).toContain("Contenu");
  });

  it("shares the ribbon interaction contract for dismissal and focus", () => {
    expect(source).toContain('document.addEventListener("pointerdown"');
    expect(source).toContain("closeAndRestoreFocus();");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("window.setTimeout(() => triggerRef.current?.focus(), 0)");
  });

  it("closes when clicking immediately after a hover-open", () => {
    expect(source).toContain("clickToggleOpenRef.current = true;");
    expect(source).not.toContain("clickToggleOpenRef.current = false;\n        setOpen(false);");
  });

  it("does not restore focus during a hover transition to another trigger", () => {
    expect(source).toContain("restoreFocusOnCloseRef");
    expect(source).toContain("restoreFocusOnCloseRef.current = false;");
    expect(source).toContain(
      "if (wasOpenRef.current && !isOpen && restoreFocusOnCloseRef.current)",
    );
  });

  it("can expose a non-menu navigation trigger without aria-haspopup", () => {
    const markup = renderToStaticMarkup(
      <CmmDropdown
        id="navigation-dropdown-panel"
        ariaLabel="Navigation"
        open
        panelRole="region"
        triggerHasPopup={null}
        renderTrigger={(triggerProps) => (
          <button {...triggerProps} aria-label="Navigation">
            Navigation
          </button>
        )}
      >
        <nav aria-label="Rubriques">
          <Link href="/">Accueil</Link>
        </nav>
      </CmmDropdown>,
    );

    expect(markup).not.toContain("aria-haspopup");
    expect(markup).toContain('role="region"');
    expect(markup).toContain('<nav aria-label="Rubriques">');
  });

  it("keeps the panel gap and hover bridge on the same vertical distance", () => {
    expect(source).toContain("DEFAULT_DROPDOWN_VERTICAL_GAP_PX");
    expect(source).toContain("height: `${verticalGap}px`");
    expect(source).toContain("bottom: `-${verticalGap}px`");
    expect(source).toContain("top: `-${verticalGap}px`");
    expect(source).not.toContain('top-[calc(100%+0.75rem)]');
    expect(source).not.toContain('bottom-[calc(100%+0.75rem)]');
  });

  it("uses the panel surface with a visible dark pointer border", () => {
    expect(source).toContain("backgroundColor: panelStyle?.backgroundColor");
    expect(source).toContain("backgroundImage: panelStyle?.backgroundImage");
    expect(source).toContain('borderColor: "rgba(15, 23, 42, 0.34)"');
    expect(source).not.toContain("border-white/15");
  });

  it("opens from the native trigger, dismisses on Escape and restores focus", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    let root!: Root;

    act(() => {
      root = createRoot(host);
      root.render(
        <CmmDropdown
          id="interactive-dropdown"
          ariaLabel="Interactive menu"
          renderTrigger={(triggerProps) => (
            <button {...triggerProps} aria-label="Open interactive menu">
              Open
            </button>
          )}
        >
          <span>Interactive content</span>
        </CmmDropdown>,
      );
    });
    activeRoots.push({ host, root });

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Open interactive menu"]');
    expect(trigger).not.toBeNull();
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 50,
      left: 20,
      width: 100,
    } as DOMRect);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const panel = document.body.querySelector<HTMLDivElement>("#interactive-dropdown");
    expect(panel).not.toBeNull();
    expect(panel?.parentElement).toBe(document.body);
    vi.spyOn(panel!, "getBoundingClientRect").mockReturnValue({
      top: 62,
      bottom: 262,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
    } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(panel?.style.left).toBe("20px");
    expect(panel?.style.top).toBe("62px");
    expect(panel?.style.maxHeight).toContain("calc(100vh - 1rem)");
    expect(panel?.querySelector("[data-cmm-dropdown-scroll-region]")?.className).toContain("overflow-y-auto");
    expect(panel?.textContent).toContain("Interactive content");

    act(() => {
      panel!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(document.body.querySelector("#interactive-dropdown")).not.toBeNull();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(document.body.querySelector("#interactive-dropdown")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.querySelector("#interactive-dropdown")).not.toBeNull();
    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(document.body.querySelector("#interactive-dropdown")).toBeNull();
  });

  it("focuses the first portaled navigation action from the keyboard but not from hover", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const host = document.createElement("div");
    document.body.appendChild(host);
    let root!: Root;
    act(() => {
      root = createRoot(host);
      root.render(
        <CmmDropdown
          id="keyboard-navigation-dropdown"
          ariaLabel="Navigation"
          renderTrigger={(triggerProps) => (
            <button {...triggerProps} aria-label="Open navigation">
              Navigation
            </button>
          )}
        >
          <nav aria-label="Navigation links">
            <a href="/actions/new">Créer une action</a>
            <a href="/map">Cartographie</a>
          </nav>
        </CmmDropdown>,
      );
    });
    activeRoots.push({ host, root });

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');
    expect(trigger).not.toBeNull();
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 50,
      left: 20,
      width: 100,
    } as DOMRect);
    trigger!.focus();

    act(() => {
      trigger!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    const firstLink = document.body.querySelector<HTMLAnchorElement>('#keyboard-navigation-dropdown a[href="/actions/new"]');
    expect(firstLink).not.toBeNull();
    expect(document.activeElement).toBe(firstLink);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(trigger);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const reopenedLink = document.body.querySelector<HTMLAnchorElement>('#keyboard-navigation-dropdown a[href="/actions/new"]');
    expect(document.activeElement).toBe(reopenedLink);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(trigger);

    trigger!.focus();
    act(() => {
      trigger!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(0);
    });
    expect(document.body.querySelector("#keyboard-navigation-dropdown")).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("constrains a measured panel to the available viewport space", () => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(640);

    const host = document.createElement("div");
    document.body.appendChild(host);
    let root!: Root;
    act(() => {
      root = createRoot(host);
      root.render(
        <CmmDropdown
          id="measured-placement-dropdown"
          ariaLabel="Measured placement"
          panelAlignment="start"
          renderTrigger={(triggerProps) => (
            <button {...triggerProps} aria-label="Open measured placement">
              Open
            </button>
          )}
        >
          <span>Long enough to require measured placement</span>
        </CmmDropdown>,
      );
    });
    activeRoots.push({ host, root });

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Open measured placement"]');
    expect(trigger).not.toBeNull();
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 297,
      bottom: 341,
      left: 285,
      width: 44,
    } as DOMRect);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const panel = document.body.querySelector<HTMLDivElement>("#measured-placement-dropdown");
    expect(panel).not.toBeNull();
    vi.spyOn(panel!, "getBoundingClientRect").mockReturnValue({
      top: 353,
      bottom: 649,
      left: 8,
      right: 382,
      width: 374,
      height: 296,
    } as DOMRect);

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(panel?.style.top).toBe("353px");
    expect(panel?.style.maxHeight).toContain("286px");
  });

  it("bounds a start-aligned portaled panel at the viewport edges", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(390);

    const host = document.createElement("div");
    document.body.appendChild(host);
    let root!: Root;

    act(() => {
      root = createRoot(host);
      root.render(
        <CmmDropdown
          id="bounded-dropdown"
          ariaLabel="Bounded menu"
          panelAlignment="start"
          renderTrigger={(triggerProps) => (
            <button {...triggerProps} aria-label="Open bounded menu">
              Open
            </button>
          )}
        >
          <span>Bounded content</span>
        </CmmDropdown>,
      );
    });
    activeRoots.push({ host, root });

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Open bounded menu"]');
    expect(trigger).not.toBeNull();
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 420,
      bottom: 464,
      left: 285,
      width: 44,
    } as DOMRect);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const panel = document.body.querySelector<HTMLDivElement>("#bounded-dropdown");
    expect(panel?.parentElement).toBe(document.body);
    vi.spyOn(panel!, "getBoundingClientRect").mockReturnValue({
      top: 476,
      bottom: 700,
      left: 8,
      right: 382,
      width: 374,
      height: 224,
    } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(panel?.style.left).toBe("8px");
    expect(panel?.style.transform).toBe("none");
  });

  it("keeps a hover-open portal alive while crossing into the panel", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const host = document.createElement("div");
    document.body.appendChild(host);
    let root!: Root;
    act(() => {
      root = createRoot(host);
      root.render(
        <CmmDropdown
          id="hover-dropdown"
          ariaLabel="Hover menu"
          openOnHover
          renderTrigger={(triggerProps) => <button {...triggerProps}>Hover</button>}
        >
          <span>Hover content</span>
        </CmmDropdown>,
      );
    });
    activeRoots.push({ host, root });

    const trigger = host.querySelector<HTMLButtonElement>("button");
    expect(trigger).not.toBeNull();
    vi.spyOn(trigger!, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 140,
      left: 80,
      width: 80,
    } as DOMRect);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(0);
    });
    const panel = document.body.querySelector<HTMLDivElement>("#hover-dropdown");
    expect(panel).not.toBeNull();

    act(() => {
      host.firstElementChild?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      panel!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(DEFAULT_HOVER_CLOSE_DELAY_MS);
    });
    expect(document.body.querySelector("#hover-dropdown")).not.toBeNull();
  });
});
