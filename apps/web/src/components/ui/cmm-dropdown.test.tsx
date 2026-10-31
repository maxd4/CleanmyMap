// @vitest-environment jsdom

import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CmmDropdown } from "./cmm-dropdown";

const source = readFileSync(resolve(process.cwd(), "src/components/ui/cmm-dropdown.tsx"), "utf8");

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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
    const focus = vi.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(
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
        {
          createNodeMock: (element) =>
            element.type === "button"
              ? {
                  focus,
                  getBoundingClientRect: () => ({
                    top: 10,
                    bottom: 50,
                    left: 20,
                    width: 100,
                  }),
                  parentElement: null,
                }
              : {},
        },
      );
    });

    const trigger = renderer.root.findByProps({ "aria-label": "Open interactive menu" });
    act(() => {
      trigger.props.onClick({ defaultPrevented: false });
    });
    expect(renderer.root.findByProps({ id: "interactive-dropdown" })).toBeTruthy();

    await act(async () => {
      trigger.props.onKeyDown({ key: "Escape", preventDefault: vi.fn() });
      await Promise.resolve();
    });
    expect(renderer.root.findAll((node) => node.type === "div" && node.props.id === "interactive-dropdown")).toHaveLength(0);
    expect(focus).toHaveBeenCalled();

    act(() => {
      renderer.unmount();
    });
  });
});
