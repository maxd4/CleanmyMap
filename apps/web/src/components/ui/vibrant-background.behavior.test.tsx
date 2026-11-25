// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { VibrantBackground } from "./vibrant-background";

describe("VibrantBackground palette lifecycle", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    mockPathname = "/dashboard";
    delete document.body.dataset.cmmPagePalette;
    document.body.removeAttribute("style");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    delete document.body.dataset.cmmPagePalette;
    document.body.removeAttribute("style");
  });

  it("renders a neutral page canvas and exposes family variables on body for standard routes", () => {
    act(() => {
      root?.render(<VibrantBackground />);
    });

    expect(container?.querySelector(".cmm-page-canvas")).not.toBeNull();
    expect(document.body.dataset.cmmPagePalette).toBe("pilotage");
    expect(document.body.style.getPropertyValue("--cmm-family-primary")).toBe("#9A3412");
    expect(document.body.style.getPropertyValue("--cmm-family-deep")).toBe("#431407");
    expect(document.body.style.getPropertyValue("--cmm-family-soft")).toBe("#FFF1E6");
    expect(document.body.style.getPropertyValue("--cmm-family-tint")).toBe("#FED7AA");
    expect(document.body.style.getPropertyValue("--cmm-family-accent")).toBe("#B88736");
    expect(document.body.style.getPropertyValue("--cmm-family-dark")).toBe("#382016");
  });

  it("updates family variables when navigating between families and cleans up on standalone routes", () => {
    act(() => {
      root?.render(<VibrantBackground />);
    });
    expect(document.body.dataset.cmmPagePalette).toBe("pilotage");

    mockPathname = "/sections/rejoindre-un-formulaire";
    act(() => {
      root?.render(<VibrantBackground />);
    });
    expect(container?.querySelector(".cmm-page-canvas")).not.toBeNull();
    expect(document.body.dataset.cmmPagePalette).toBe("agir");
    expect(document.body.style.getPropertyValue("--cmm-family-primary")).toBe("#047857");

    for (const exceptionRoute of ["/", "/accueil", "/explorer", "/sign-in", "/sign-up", "/prints/report"]) {
      mockPathname = "/dashboard";
      act(() => {
        root?.render(<VibrantBackground />);
      });
      expect(document.body.dataset.cmmPagePalette).toBe("pilotage");

      mockPathname = exceptionRoute;
      act(() => {
        root?.render(<VibrantBackground />);
      });
      expect(container?.querySelector(".cmm-page-canvas")).toBeNull();
      expect(document.body.dataset.cmmPagePalette).toBeUndefined();
      expect(document.body.style.getPropertyValue("--cmm-family-primary")).toBe("");
    }
  });

  it("cleans up body palette attributes and CSS variables on unmount", () => {
    act(() => {
      root?.render(<VibrantBackground />);
    });
    expect(document.body.dataset.cmmPagePalette).toBe("pilotage");

    act(() => {
      root?.unmount();
    });
    root = null;
    expect(document.body.dataset.cmmPagePalette).toBeUndefined();
    expect(document.body.style.getPropertyValue("--cmm-family-primary")).toBe("");
  });
});
