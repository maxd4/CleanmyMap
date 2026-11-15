// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { RibbonTutorial } from "./app-navigation-ribbon-tour";

const source = readFileSync(resolve(process.cwd(), "src/components/navigation/app-navigation-ribbon-tour.tsx"), "utf8");
const layoutCss = readFileSync(resolve(process.cwd(), "src/styles/layout.css"), "utf8");

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Rect = { top: number; left: number; width: number; height: number };

function setRect(element: HTMLElement, rect: Rect) {
  element.getBoundingClientRect = () => ({
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => rect,
  }) as DOMRect;
}

async function flushPositioning() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  });
}

function buttonWithText(root: ParentNode, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.replace(/\s+/gu, " ").trim().includes(text));
  expect(button, `button ${text} should be rendered`).toBeDefined();
  return button!;
}

function mountTutorial({
  locale = "fr" as const,
  entryPoint = "homepage" as const,
  omitTargets = [] as string[],
}: {
  locale?: "fr" | "en";
  entryPoint?: "homepage" | "onboarding";
  omitTargets?: string[];
} = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const sticky = document.createElement("div");
  sticky.dataset.cmmCaptureSticky = "true";
  setRect(sticky, { top: 0, left: 0, width: 1440, height: 72 });
  document.body.appendChild(sticky);

  const targetNames = ["home", "search", "primary", "preferences", "product", "feedback", "account"];
  targetNames.forEach((name, index) => {
    if (omitTargets.includes(name)) return;
    const target = document.createElement(name === "home" ? "a" : "button");
    target.dataset.navigationTutorialTarget = name;
    target.textContent = name;
    if (name === "home") target.setAttribute("href", "/");
    setRect(target, { top: 10, left: 20 + index * 80, width: 64, height: 44 });
    document.body.appendChild(target);
  });

  let root!: Root;
  act(() => {
    root = createRoot(host);
    root.render(React.createElement(RibbonTutorial, { locale, entryPoint }));
  });

  return {
    host,
    trigger: () => host.querySelector<HTMLButtonElement>("[data-navigation-tutorial-trigger]")!,
    panel: () => document.querySelector<HTMLElement>("[data-navigation-ribbon-tour-panel]"),
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
      sticky.remove();
      document.querySelectorAll("[data-navigation-tutorial-target]").forEach((element) => element.remove());
      document.querySelector("[data-navigation-ribbon-tour-panel]")?.remove();
      document.querySelector("[data-navigation-ribbon-tour-spotlight-layer]")?.remove();
    },
  };
}

describe("guided navigation ribbon tutorial contract", () => {
  it("keeps the tutorial short, manual and relaunchable", () => {
    expect(source).toContain('data-navigation-tutorial-trigger');
    expect(source).toContain('role="region"');
    expect(source).not.toContain("<CmmDialog");
    expect(source).not.toContain('aria-modal="true"');
    expect(source).not.toContain("setTimeout(openTutorial");
    expect(source).not.toContain("localStorage");
    expect(source.match(/target: "/g)).toHaveLength(12);
    expect(source).toContain('entryPoint: "homepage" | "onboarding"');
    expect(source).toContain('data-navigation-tutorial-entry="homepage"');
    expect(source).toContain('data-navigation-tutorial-entry="onboarding"');
    expect(source).not.toContain("stepLabel");
    expect(source).not.toContain("Étape ${");
  });

  it("keeps the six explanations in ribbon appearance order", () => {
    const expectedOrder = ["home", "search", "preferences", "product", "feedback", "account"];
    const actualOrder = [...source.matchAll(/target: "([^"]+)"/gu)].map((match) => match[1]);
    expect(actualOrder.slice(0, 6)).toEqual(expectedOrder);
    expect(actualOrder.slice(6)).toEqual(expectedOrder);
    for (const label of [
      "Accueil",
      "Rechercher",
      "Navigation produit",
      "Préférences",
      "Feedback",
      "Profil et espace personnel",
    ]) {
      expect(source).toContain(`title: "${label}"`);
    }
  });

  it("keeps quit on the left and adjacent previous/next actions on the right", () => {
    expect(source).toContain("copy.quit");
    expect(source).toContain("data-navigation-ribbon-tour-actions");
    expect(source).toContain("data-navigation-ribbon-tour-step-actions");
    expect(source).not.toContain("copy.skip");
    expect(source).toContain("copy.previous");
    expect(source).toContain("copy.next");
    expect(source).toContain("copy.finish");
  });

  it("keeps the target spotlight, blockers, panel placement and recalc hooks", () => {
    expect(source).toContain("data-navigation-ribbon-tour-spotlight");
    expect(source).toContain("data-navigation-ribbon-tour-blocker");
    expect(layoutCss).toContain("backdrop-filter: blur(12px)");
    expect(source).toContain('window.addEventListener("resize"');
    expect(source).toContain('window.addEventListener("scroll"');
    expect(source).toContain("Découvrez le ruban en 1 minute.");
    expect(source.match(/icon: (?:House|Search|LayoutGrid|Settings2|MessageSquare|UserRound)/g)).toHaveLength(12);
  });

  it("renders the French first step and the requested footer geometry", async () => {
    const mounted = mountTutorial();
    try {
      expect(mounted.trigger().getAttribute("type")).toBe("button");
      act(() => mounted.trigger().click());
      await flushPositioning();

      const panel = mounted.panel();
      expect(panel).not.toBeNull();
      expect(panel?.querySelector("h2")?.textContent).toBe("Accueil");
      expect(panel?.textContent).not.toContain("Étape");
      const actions = panel?.querySelector<HTMLElement>("[data-navigation-ribbon-tour-actions]");
      const stepActions = panel?.querySelector<HTMLElement>("[data-navigation-ribbon-tour-step-actions]");
      expect(actions?.firstElementChild?.textContent).toContain("Quitter");
      expect(stepActions?.textContent).toContain("Précédent");
      expect(stepActions?.textContent).toContain("Suivant");
      expect(stepActions?.children).toHaveLength(2);
      expect((stepActions?.children[0] as HTMLButtonElement).disabled).toBe(true);
      expect(panel?.getAttribute("role")).toBe("region");
      expect(document.querySelectorAll("[data-navigation-ribbon-tour-blocker]")).toHaveLength(4);
      expect(Number.parseFloat(panel?.style.top ?? "0")).toBeGreaterThanOrEqual(84);
    } finally {
      mounted.cleanup();
    }
  });

  it("walks all six steps, supports previous, and finishes on the last step", async () => {
    const mounted = mountTutorial();
    try {
      act(() => mounted.trigger().click());
      await flushPositioning();
      const expectedTitles = [
        "Accueil",
        "Rechercher",
        "Préférences",
        "Navigation produit",
        "Feedback",
        "Profil et espace personnel",
      ];

      for (const [index, title] of expectedTitles.entries()) {
        expect(mounted.panel()?.querySelector("h2")?.textContent).toBe(title);
        if (index < expectedTitles.length - 1) {
          act(() => buttonWithText(mounted.panel()!, "Suivant").click());
          await flushPositioning();
        }
      }

      expect(mounted.panel()).not.toBeNull();
      expect(mounted.panel()?.textContent).toContain("Terminer");
      act(() => buttonWithText(mounted.panel()!, "Terminer").click());
      expect(mounted.panel()).toBeNull();

      act(() => mounted.trigger().click());
      await flushPositioning();
      act(() => buttonWithText(mounted.panel()!, "Suivant").click());
      await flushPositioning();
      act(() => buttonWithText(mounted.panel()!, "Précédent").click());
      await flushPositioning();
      expect(mounted.panel()?.querySelector("h2")?.textContent).toBe("Accueil");
    } finally {
      mounted.cleanup();
    }
  });

  it("supports French and English entry presentations and clean close paths", async () => {
    const french = mountTutorial({ entryPoint: "onboarding" });
    try {
      expect(french.host.querySelector('[data-navigation-tutorial-entry="onboarding"]')).not.toBeNull();
      expect(french.host.querySelector('[data-navigation-tutorial-entry="homepage"]')).toBeNull();
      act(() => french.trigger().click());
      await flushPositioning();
      act(() => buttonWithText(french.panel()!, "Quitter").click());
      await flushPositioning();
      expect(french.panel()).toBeNull();
      expect(document.activeElement).toBe(french.trigger());
    } finally {
      french.cleanup();
    }

    const english = mountTutorial({ locale: "en" });
    try {
      expect(english.trigger().textContent).toContain("Ribbon tutorial");
      act(() => english.trigger().click());
      await flushPositioning();
      expect(english.panel()?.querySelector("h2")?.textContent).toBe("Home");
      expect(english.panel()?.textContent).toContain("Quit");
      act(() => english.panel()?.querySelector<HTMLButtonElement>("[aria-label^='Close']")?.click());
      await flushPositioning();
      expect(english.panel()).toBeNull();
    } finally {
      english.cleanup();
    }
  });

  it("closes on Escape and before real link navigation", async () => {
    const mounted = mountTutorial();
    const preventNavigation = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("click", preventNavigation);
    try {
      act(() => mounted.trigger().click());
      await flushPositioning();
      act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
      await flushPositioning();
      expect(mounted.panel()).toBeNull();

      act(() => mounted.trigger().click());
      await flushPositioning();
      const home = document.querySelector<HTMLAnchorElement>('[data-navigation-tutorial-target="home"]');
      expect(home).not.toBeNull();
      act(() => home!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
      await flushPositioning();
      expect(mounted.panel()).toBeNull();
    } finally {
      document.removeEventListener("click", preventNavigation);
      mounted.cleanup();
    }
  });

  it("uses the search fallback, handles missing targets, and follows viewport changes", async () => {
    const mounted = mountTutorial({ omitTargets: ["search"] });
    try {
      act(() => mounted.trigger().click());
      await flushPositioning();
      act(() => buttonWithText(mounted.panel()!, "Suivant").click());
      await flushPositioning();
      expect(mounted.panel()?.querySelector("h2")?.textContent).toBe("Rechercher");
      expect(document.querySelectorAll("[data-navigation-ribbon-tour-blocker]")).toHaveLength(4);

      const spotlight = document.querySelector<HTMLElement>("[data-navigation-ribbon-tour-spotlight]");
      const before = spotlight?.style.left;
      const primary = document.querySelector<HTMLElement>('[data-navigation-tutorial-target="primary"]');
      expect(primary).not.toBeNull();
      setRect(primary!, { top: 30, left: 400, width: 120, height: 48 });
      act(() => window.dispatchEvent(new Event("resize")));
      await flushPositioning();
      expect(spotlight?.style.left).not.toBe(before);

      act(() => buttonWithText(mounted.panel()!, "Suivant").click());
      await flushPositioning();
      const product = document.querySelector<HTMLElement>('[data-navigation-tutorial-target="product"]');
      product?.remove();
      act(() => buttonWithText(mounted.panel()!, "Suivant").click());
      await flushPositioning();
      expect(mounted.panel()?.querySelector("h2")?.textContent).toBe("Navigation produit");
      expect(document.querySelectorAll("[data-navigation-ribbon-tour-blocker]")).toHaveLength(1);
      expect(document.querySelector<HTMLElement>("[data-navigation-ribbon-tour-blocker]")?.style.inset).toBe("0");
    } finally {
      mounted.cleanup();
    }
  });
});
