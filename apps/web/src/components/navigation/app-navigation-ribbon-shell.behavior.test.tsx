// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "fr" as "fr" | "en",
  displayMode: "exhaustif" as "exhaustif" | "minimaliste" | "sobre",
  user: null as { id: string } | null,
  isLoaded: true,
  hydratedIdentity: null as Record<string, unknown> | null,
  trackNavigationClick: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: mocks.isLoaded, user: mocks.user }),
}));

vi.mock("swr", () => ({
  default: () => ({ data: mocks.hydratedIdentity }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    prefetch?: boolean;
  }) => {
    void _prefetch;
    return (
      <a
        href={href}
        {...props}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
        }}
      >
        {children}
      </a>
    );
  },
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: mocks.locale,
    displayMode: mocks.displayMode,
  }),
}));

vi.mock("@/lib/account/current-account-identity", () => ({
  fetchCurrentAccountIdentity: vi.fn(),
}));

vi.mock("@/lib/navigation", () => ({
  getActiveSpaceForPath: () => "act",
  getNavigationSpacesForProfile: () => [
    {
      id: "act",
      label: { fr: "Agir", en: "Act" },
      icon: "",
      color: "",
      items: [],
    },
    {
      id: "learn",
      label: { fr: "Comprendre", en: "Learn" },
      icon: "",
      color: "",
      items: [],
    },
  ],
}));

vi.mock("@/lib/profiles", () => ({
  getProfileLabel: (profile: string, locale: "fr" | "en") =>
    locale === "fr" ? `Profil ${profile}` : `Profile ${profile}`,
}));

vi.mock("@/lib/analytics/navigation-client", () => ({
  trackNavigationClick: mocks.trackNavigationClick,
}));

vi.mock("./app-navigation-ribbon-theme", () => ({
  useAdaptiveRibbonChrome: () => ({
    backgroundColor: "rgb(15 23 42)",
    backgroundImage: "none",
    borderColor: "rgba(255,255,255,.2)",
    boxShadow: "none",
  }),
}));

vi.mock("@/components/brand/brand-logo", () => ({
  BrandLogo: ({ alt }: { alt: string }) => <span data-testid="brand-logo">{alt}</span>,
}));

vi.mock("./global-search", () => ({
  GlobalSearch: ({ currentProfile }: { currentProfile: string }) => (
    <button type="button" data-navigation-tutorial-target="search">
      Search {currentProfile}
    </button>
  ),
}));

vi.mock("./app-navigation-block-dropdown", () => ({
  AppNavigationBlockDropdown: ({
    space,
    activeSpaceId,
    open,
    locale,
    onOpenChange,
    onTrackNavigation,
  }: {
    space: { id: string; label: { fr: string; en: string } };
    activeSpaceId: string | null;
    open: boolean;
    locale: "fr" | "en";
    onOpenChange: (spaceId: string, open: boolean) => void;
    onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  }) => (
    <button
      type="button"
      data-navigation-block-trigger
      data-navigation-block-active={String(activeSpaceId === space.id)}
      data-space={space.id}
      aria-expanded={open}
      aria-label={space.label[locale]}
      onClick={() => {
        onTrackNavigation(`/space/${space.id}`, space.label[locale], space.id);
        onOpenChange(space.id, !open);
      }}
    >
      {space.label[locale]}
    </button>
  ),
}));

vi.mock("./app-navigation-tree-menu", () => ({
  AppNavigationTreeMenu: ({ locale }: { locale: "fr" | "en" }) => (
    <button type="button" data-testid="mobile-summary">
      {locale === "fr" ? "Sommaire" : "Contents"}
    </button>
  ),
}));

vi.mock("./app-navigation-ribbon-account", () => ({
  RibbonAccountActions: ({
    isAuthenticated,
    effectiveIdentity,
    user,
  }: {
    isAuthenticated: boolean;
    effectiveIdentity: unknown;
    user: unknown;
  }) => (
    <div
      data-testid="account-actions"
      data-authenticated={String(isAuthenticated)}
      data-has-identity={String(Boolean(effectiveIdentity))}
      data-has-user={String(Boolean(user))}
    />
  ),
  RibbonAccountActionsFallback: ({ isAuthenticated }: { isAuthenticated: boolean }) => (
    <div data-testid="account-actions-fallback" data-authenticated={String(isAuthenticated)} />
  ),
}));

vi.mock("./app-navigation-ribbon-activity", () => ({
  useRibbonActivityStatus: () => ({
    activityStatus: "active",
    isUpdatingActivityStatus: false,
    activityStatusError: null,
    handleActivityStatusToggle: vi.fn(),
  }),
}));

vi.mock("./app-navigation-ribbon-menus", () => ({
  RibbonFeedbackMenu: ({
    locale,
    open,
    onOpenChange,
    isAuthenticated,
  }: {
    locale: "fr" | "en";
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isAuthenticated: boolean;
  }) => (
    <button
      type="button"
      data-navigation-utility-menu="feedback"
      data-authenticated={String(isAuthenticated)}
      aria-label={locale === "fr" ? "Menu Feedback" : "Feedback menu"}
      aria-expanded={open}
      onClick={() => onOpenChange(!open)}
    >
      Feedback
    </button>
  ),
  RibbonPreferencesMenu: ({
    locale,
    open,
    onOpenChange,
  }: {
    locale: "fr" | "en";
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <button
      type="button"
      data-navigation-utility-menu="preferences"
      aria-label={locale === "fr" ? "Préférences" : "Preferences"}
      aria-expanded={open}
      onClick={() => onOpenChange(!open)}
    >
      Preferences
    </button>
  ),
}));

vi.mock("./navigation-block-trigger-state", () => ({
  resolveOpenNavigationSpaceId: (
    currentSpaceId: string | null,
    nextSpaceId: string,
    open: boolean,
  ) => (open ? nextSpaceId : currentSpaceId === nextSpaceId ? null : currentSpaceId),
  resolveOpenRibbonUtilityMenuId: (
    currentMenuId: "feedback" | "preferences" | null,
    nextMenuId: "feedback" | "preferences",
    open: boolean,
  ) => (open ? nextMenuId : currentMenuId === nextMenuId ? null : currentMenuId),
}));

import { AppNavigationRibbonShell } from "./app-navigation-ribbon-shell";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const identity = {
  userId: "user-1",
  displayName: "Alex User",
  handle: "alex",
  firstName: "Alex",
  username: "alex",
  email: "alex@example.com",
  currentLevel: 4,
  actorNameOptions: ["Alex", "alex"],
  role: "benevole",
  activeRole: "benevole",
  activeProfile: "benevole",
  badges: [],
} as never;

describe("AppNavigationRibbonShell behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.locale = "fr";
    mocks.displayMode = "exhaustif";
    mocks.user = null;
    mocks.isLoaded = true;
    mocks.hydratedIdentity = null;
    mocks.trackNavigationClick.mockReset();
    vi.restoreAllMocks();
  });

  function renderShell(props: { identity?: unknown; currentProfile?: string; profileLabel?: string } = {}) {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(
        <AppNavigationRibbonShell
          pathname="/methodologie"
          currentProfile={props.currentProfile as never}
          profileLabel={props.profileLabel}
          identity={props.identity as never}
        />,
      );
    });
  }

  it("composes the visitor responsive surface and tracks primary navigation", () => {
    renderShell({ currentProfile: "benevole" });

    expect(host.querySelector('nav[aria-label="Barre de navigation principale"]')).not.toBeNull();
    expect(host.querySelector('[data-navigation-group="primary"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="brand-logo"]')).not.toBeNull();
    expect(host.querySelector('[data-navigation-tutorial-target="search"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="mobile-summary"]')?.textContent).toBe("Sommaire");
    expect(host.querySelector('[data-testid="account-actions"]')?.getAttribute("data-authenticated")).toBe("false");
    expect(host.querySelector('[data-navigation-utility-menu="feedback"]')?.getAttribute("data-authenticated")).toBe("false");

    act(() => {
      host.querySelector<HTMLAnchorElement>('a[aria-label="Accueil"]')?.click();
    });
    expect(mocks.trackNavigationClick).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/", label: "Accueil", profile: "benevole" }),
    );
  });

  it("coordinates desktop blocks and utility menus exclusively", () => {
    renderShell({ currentProfile: "benevole" });

    const firstBlock = host.querySelector<HTMLButtonElement>('[data-space="act"]')!;
    const secondBlock = host.querySelector<HTMLButtonElement>('[data-space="learn"]')!;
    const preferences = host.querySelector<HTMLButtonElement>('[data-navigation-utility-menu="preferences"]')!;
    const feedback = host.querySelector<HTMLButtonElement>('[data-navigation-utility-menu="feedback"]')!;

    act(() => firstBlock.click());
    expect(firstBlock.getAttribute("aria-expanded")).toBe("true");
    act(() => secondBlock.click());
    expect(firstBlock.getAttribute("aria-expanded")).toBe("false");
    expect(secondBlock.getAttribute("aria-expanded")).toBe("true");

    act(() => preferences.click());
    expect(preferences.getAttribute("aria-expanded")).toBe("true");
    act(() => feedback.click());
    expect(preferences.getAttribute("aria-expanded")).toBe("false");
    expect(feedback.getAttribute("aria-expanded")).toBe("true");
    expect(mocks.trackNavigationClick).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/space/act", spaceId: "act" }),
    );

    act(() => feedback.click());
    expect(feedback.getAttribute("aria-expanded")).toBe("false");
  });

  it("mounts authenticated account composition and responds to scroll state", () => {
    mocks.locale = "en";
    mocks.displayMode = "minimaliste";
    mocks.user = { id: "user-1" };
    renderShell({ identity, currentProfile: "benevole" });

    expect(host.querySelector('nav[aria-label="Main navigation bar"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="account-actions"]')?.getAttribute("data-authenticated")).toBe("true");
    expect(host.querySelector('[data-testid="account-actions"]')?.getAttribute("data-has-user")).toBe("true");
    expect(host.querySelector('[data-testid="mobile-summary"]')?.textContent).toBe("Contents");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 12 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(host.querySelector("nav")?.className).toContain("shadow-[0_14px_40px");
  });

  it("uses a hydrated identity when the Clerk user is absent", () => {
    mocks.hydratedIdentity = identity;
    renderShell({ currentProfile: "benevole" });

    expect(host.querySelector('[data-testid="account-actions"]')?.getAttribute("data-authenticated")).toBe("true");
    expect(host.querySelector('[data-testid="account-actions"]')?.getAttribute("data-has-identity")).toBe("true");
    expect(host.querySelector('[data-testid="account-actions"]')?.getAttribute("data-has-user")).toBe("false");
  });

  it("falls back to the default volunteer profile when no profile context is supplied", () => {
    renderShell();

    expect(host.querySelector(".sr-only")?.textContent).toContain("Profil benevole");
  });
});
