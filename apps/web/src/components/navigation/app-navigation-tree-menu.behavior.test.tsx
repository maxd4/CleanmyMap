// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NavigationSpace } from "@/lib/navigation";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";
import { NavigationDropdownHelpText } from "./navigation-dropdown-help-text";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const spaces: NavigationSpace[] = [
  {
    id: "act",
    label: { fr: "Agir", en: "Act" },
    icon: "⚡",
    color: "text-emerald-600",
    items: [
      {
        id: "new",
        href: "/actions/new",
        label: { fr: "Créer une action", en: "Create an action" },
        description: { fr: "Déclarer une action", en: "Declare an action" },
        routeId: "new",
      },
      {
        id: "history",
        href: "/actions/history",
        label: { fr: "Historique", en: "History" },
        description: { fr: "Voir l'historique", en: "View history" },
        routeId: "reports",
      },
    ],
  },
  {
    id: "network",
    label: { fr: "Réseau", en: "Network" },
    icon: "🤝",
    color: "text-indigo-600",
    items: [],
  },
];

describe("AppNavigationTreeMenu behavior", () => {
  let host: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    document.body.innerHTML = "";
    mocks.router.push.mockReset();
    vi.useRealTimers();
  });

  function renderTree({
    locale = "fr",
    pathname = "/actions/new/details",
    value = spaces,
  }: {
    locale?: "fr" | "en";
    pathname?: string;
    value?: NavigationSpace[];
  } = {}) {
    const onTrackNavigation = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host!);
      root.render(
        <AppNavigationTreeMenu
          activeSpaceId={value.length > 0 ? value[0]!.id : null}
          idBase="mobile-navigation-tree"
          locale={locale}
          onTrackNavigation={onTrackNavigation}
          pathname={pathname}
          spaces={value}
        />,
      );
    });
    return { onTrackNavigation };
  }

  it("opens the French summary, switches sections, closes with the close control, and restores focus", () => {
    renderTree();
    const trigger = host!.querySelector<HTMLButtonElement>('button[aria-label="Sommaire"]')!;

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.focus();
    act(() => trigger.click());

    const panel = document.body.querySelector<HTMLElement>("#mobile-navigation-tree-panel")!;
    expect(panel.getAttribute("aria-label")).toBe("Sommaire des sections et rubriques");
    expect(panel.querySelector("#mobile-navigation-tree-act-panel")).not.toBeNull();
    expect(panel.querySelector("#mobile-navigation-tree-network-panel")).toBeNull();
    expect(panel.querySelector<HTMLAnchorElement>('a[href="/actions/new"]')?.getAttribute("aria-current")).toBe("page");

    const networkTrigger = panel.querySelector<HTMLButtonElement>("#mobile-navigation-tree-network-trigger")!;
    act(() => networkTrigger.click());
    expect(panel.querySelector("#mobile-navigation-tree-act-panel")).toBeNull();
    expect(panel.querySelector("#mobile-navigation-tree-network-panel")).not.toBeNull();

    act(() => networkTrigger.click());
    expect(panel.querySelector("#mobile-navigation-tree-network-panel")).toBeNull();

    const close = panel.querySelector<HTMLButtonElement>('button[aria-label="Fermer le menu de navigation"]')!;
    act(() => close.click());
    expect(document.body.querySelector("#mobile-navigation-tree-panel")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("tracks a primary item, pushes its route, and closes after navigation", () => {
    const { onTrackNavigation } = renderTree();
    const trigger = host!.querySelector<HTMLButtonElement>('button[aria-label="Sommaire"]')!;

    act(() => trigger.click());
    const link = document.body.querySelector<HTMLAnchorElement>('a[href="/actions/new"]')!;
    vi.useFakeTimers();
    act(() => {
      link.click();
      vi.runAllTimers();
    });

    expect(onTrackNavigation).toHaveBeenCalledWith("/actions/new", "Créer une action", "act");
    expect(mocks.router.push).toHaveBeenCalledWith("/actions/new");
    expect(document.body.querySelector("#mobile-navigation-tree-panel")).toBeNull();
  });

  it("renders the empty English summary and the accessible help-text variants", () => {
    renderTree({ locale: "en", value: [] });
    const trigger = host!.querySelector<HTMLButtonElement>('button[aria-label="Summary"]')!;

    act(() => trigger.click());
    const panel = document.body.querySelector<HTMLElement>("#mobile-navigation-tree-panel")!;
    expect(panel.querySelector("section")).toBeNull();
    expect(panel.querySelector('button[aria-label="Close navigation menu"]')).not.toBeNull();

    act(() => {
      root!.render(
        <NavigationDropdownHelpText id="help-id" text="English help" className="extra-help" />,
      );
    });
    expect(host!.querySelector(".extra-help")?.textContent).toBe("English help");
    expect(host!.querySelector("#help-id")?.textContent).toBe("English help");

    act(() => {
      root!.render(<NavigationDropdownHelpText text="Visible only" />);
    });
    expect(host!.querySelector("#help-id")).toBeNull();
    expect(host!.textContent).toContain("Visible only");
  });
});
