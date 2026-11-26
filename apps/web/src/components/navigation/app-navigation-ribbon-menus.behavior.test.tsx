// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RibbonNavigationTracker } from "./app-navigation-ribbon-account";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean; onClick?: React.MouseEventHandler<HTMLAnchorElement> }) => {
    const anchorProps = { ...props };
    delete anchorProps.prefetch;
    return (
      <a href={href} {...anchorProps} onClick={(event) => { event.preventDefault(); onClick?.(event); }}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/components/ui/site-preferences-controls", () => ({
  SitePreferencesControls: ({ variant }: { variant: string }) => (
    <button type="button" data-testid="site-preferences-controls">
      {variant}
    </button>
  ),
}));

vi.mock("./feedback-discovery-callout", () => ({
  FeedbackDiscoveryCallout: ({
    isAuthenticated,
    isMenuOpen,
    isPreferencesOpen,
    pathname,
  }: {
    isAuthenticated: boolean;
    isMenuOpen: boolean;
    isPreferencesOpen: boolean;
    pathname: string;
  }) => (
    <div
      data-testid="feedback-discovery-callout"
      data-authenticated={String(isAuthenticated)}
      data-menu-open={String(isMenuOpen)}
      data-preferences-open={String(isPreferencesOpen)}
      data-pathname={pathname}
    />
  ),
}));

import {
  RibbonFeedbackMenu,
  RibbonPreferencesMenu,
} from "./app-navigation-ribbon-menus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ribbonChrome = {
  backgroundColor: "rgb(15 23 42)",
  backgroundImage: "none",
  borderColor: "rgba(255,255,255,.2)",
  boxShadow: "none",
} satisfies RibbonChrome;

type OpenMenu = "feedback" | "preferences" | null;

function MenuHarness({
  locale = "fr",
  onTrackNavigation,
}: {
  locale?: "fr" | "en";
  onTrackNavigation: ReturnType<typeof vi.fn>;
}) {
  const [openMenu, setOpenMenu] = React.useState<OpenMenu>(null);

  return (
    <div>
      <RibbonPreferencesMenu
        locale={locale}
        ribbonChrome={ribbonChrome}
        onTrackNavigation={onTrackNavigation as RibbonNavigationTracker}
        open={openMenu === "preferences"}
        onOpenChange={(open) => setOpenMenu(open ? "preferences" : null)}
      />
      <RibbonFeedbackMenu
        locale={locale}
        pathname="/actions/history"
        ribbonChrome={ribbonChrome}
        onTrackNavigation={onTrackNavigation as RibbonNavigationTracker}
        isAuthenticated
        isPreferencesOpen={openMenu === "preferences"}
        open={openMenu === "feedback"}
        onOpenChange={(open) => setOpenMenu(open ? "feedback" : null)}
      />
    </div>
  );
}

describe("ribbon utility menus behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function renderHarness(locale: "fr" | "en" = "fr") {
    const onTrackNavigation = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<MenuHarness locale={locale} onTrackNavigation={onTrackNavigation} />);
    });
    return onTrackNavigation;
  }

  it("opens Preferences by keyboard, focuses its first control, and closes on Escape", () => {
    renderHarness();
    const trigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Menu des préférences d\'affichage et langue"]',
    );

    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    trigger!.focus();
    act(() => {
      trigger!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });

    const panel = document.body.querySelector<HTMLElement>("#preferences-menu-panel");
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("aria-label")).toBe("Préférences d'affichage et langue");
    expect(document.activeElement).toBe(panel?.querySelector("button"));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });

    expect(document.body.querySelector("#preferences-menu-panel")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps Feedback and Preferences mutually exclusive", () => {
    renderHarness();
    const preferencesTrigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Menu des préférences d\'affichage et langue"]',
    )!;
    const feedbackTrigger = host.querySelector<HTMLButtonElement>('[aria-label="Menu Feedback"]')!;

    act(() => {
      preferencesTrigger.click();
    });
    expect(document.body.querySelector("#preferences-menu-panel")).not.toBeNull();
    expect(document.body.querySelector("#feedback-menu-panel")).toBeNull();
    expect(host.querySelector('[data-preferences-open="true"]')).not.toBeNull();

    act(() => {
      feedbackTrigger.click();
    });
    expect(document.body.querySelector("#preferences-menu-panel")).toBeNull();
    expect(document.body.querySelector("#feedback-menu-panel")).not.toBeNull();
    expect(host.querySelector('[data-preferences-open="false"]')).not.toBeNull();
  });

  it("keeps the four Feedback destinations, tracks clicks, and closes before navigation", () => {
    const onTrackNavigation = renderHarness();
    const feedbackTrigger = host.querySelector<HTMLButtonElement>('[aria-label="Menu Feedback"]')!;

    act(() => {
      feedbackTrigger.click();
    });

    const panel = document.body.querySelector<HTMLElement>("#feedback-menu-panel")!;
    const links = [...panel.querySelectorAll<HTMLAnchorElement>("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/sections/feedback#bug",
      "/sections/feedback#improvement",
      "/sections/feedback#collaboration",
      "/sections/funding",
    ]);
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      "Signaler un problème technique",
      "Proposer une idée ou suggestion",
      "Nous contacter",
      "Soutenir CleanMyMap",
    ]);
    expect(links.every((link) => link.className.includes("min-h-10"))).toBe(true);

    act(() => {
      links[1].click();
    });

    expect(document.body.querySelector("#feedback-menu-panel")).toBeNull();
    expect(onTrackNavigation).toHaveBeenCalledWith(
      "/sections/feedback#improvement",
      "Proposer une idée ou suggestion",
      null,
    );
  });

  it("preserves English trigger labels and account-preference navigation", () => {
    const onTrackNavigation = renderHarness("en");
    const preferencesTrigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Display and language preferences"]',
    )!;
    const feedbackTrigger = host.querySelector<HTMLButtonElement>('[aria-label="Feedback menu"]')!;

    expect(preferencesTrigger).not.toBeNull();
    expect(feedbackTrigger).not.toBeNull();
    act(() => {
      preferencesTrigger.click();
    });

    const accountLink = document.body.querySelector<HTMLAnchorElement>(
      '#preferences-menu-panel a[href="/onboarding/localisation?next=%2Fprofil"]',
    );
    expect(accountLink).not.toBeNull();

    act(() => {
      accountLink!.click();
    });
    expect(onTrackNavigation).toHaveBeenCalledWith(
      "/onboarding/localisation?next=%2Fprofil",
      "Account preferences",
      null,
    );
  });

  it("tracks the French account-preference destination", () => {
    const onTrackNavigation = renderHarness();
    const preferencesTrigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Menu des préférences d\'affichage et langue"]',
    )!;

    act(() => {
      preferencesTrigger.click();
    });

    const accountLink = document.body.querySelector<HTMLAnchorElement>(
      '#preferences-menu-panel a[href="/onboarding/localisation?next=%2Fprofil"]',
    )!;
    expect(accountLink.textContent).toContain("Préférences de compte");
    act(() => accountLink.click());
    expect(onTrackNavigation).toHaveBeenCalledWith(
      "/onboarding/localisation?next=%2Fprofil",
      "Préférences de compte",
      null,
    );
  });
});
