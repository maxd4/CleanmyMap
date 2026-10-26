import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { House } from "lucide-react";
import type { NavigationItem, NavigationSpace } from "@/lib/navigation";
import { NAVIGATION_DROPDOWN_CARD_GEOMETRY } from "./navigation-dropdown-card-theme";
import { getNavigationDropdownCardBorderTokens } from "./navigation-dropdown-border-theme";
import { NavigationDropdownItemCard } from "./navigation-dropdown-item-card";
import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("a", props, children),
}));
vi.mock("@/components/ui/cmm-dropdown", () => ({
  CmmDropdown: ({ children, open, renderTrigger }: {
    children: React.ReactNode;
    open: boolean;
    renderTrigger: (props: Record<string, unknown>) => React.ReactNode;
  }) => React.createElement(
    "div",
    { "data-dropdown-open": String(open) },
    renderTrigger({}),
    children,
  ),
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement("div", props, children),
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type AnchorProps = { onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

const item: NavigationItem = {
  id: "funding",
  href: "/sections/funding",
  label: { fr: "Soutenir CleanMyMap", en: "Support CleanMyMap" },
  description: { fr: "Soutenir le projet", en: "Support the project" },
  routeId: "funding",
};

const space: NavigationSpace = {
  id: "network",
  label: { fr: "Réseau & Discussions", en: "Network & Discussions" },
  icon: "🤝",
  color: "text-indigo-600",
  items: [item],
};

type ClickOverrides = Partial<Pick<
  React.MouseEvent<HTMLAnchorElement>,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented" | "detail"
>>;
type TrackNavigation = (href: string, label: string, spaceId: string | null) => void;

function clickEvent(overrides: ClickOverrides = {}) {
  const preventDefault = vi.fn();
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    detail: 1,
    preventDefault,
    ...overrides,
  } as unknown as React.MouseEvent<HTMLAnchorElement> & { preventDefault: ReturnType<typeof vi.fn> };
}

function anchor(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "a")[0]!;
}

function renderDesktopCard(onTrackNavigation: TrackNavigation) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <NavigationDropdownItemCard
        item={item}
        locale="fr"
        pathname="/"
        spaceId="network"
        onTrackNavigation={onTrackNavigation}
        Icon={House}
        iconClassName="text-indigo-600"
        cardGeometry={NAVIGATION_DROPDOWN_CARD_GEOMETRY}
        cardBorderTokens={getNavigationDropdownCardBorderTokens("network", "funding")}
      />,
    );
  });
  return renderer;
}

function renderMobileTree(onTrackNavigation: TrackNavigation) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <AppNavigationTreeMenu
        activeSpaceId="network"
        idBase="mobile-navigation-tree"
        locale="fr"
        onTrackNavigation={onTrackNavigation}
        pathname="/"
        spaces={[space]}
      />,
    );
  });
  return renderer;
}

describe("navigation link activation", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    vi.stubGlobal("window", {
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      },
    });
  });

  for (const [name, modifier] of [
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }],
    ["Shift", { shiftKey: true }],
    ["Alt", { altKey: true }],
  ] as const) {
    it(`preserves native ${name} + click behavior in the desktop card`, () => {
      const track = vi.fn<TrackNavigation>();
      const renderer = renderDesktopCard(track);
      const event = clickEvent(modifier);

      propsOf<AnchorProps>(anchor(renderer)).onClick(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mocks.router.push).not.toHaveBeenCalled();
      expect(track).not.toHaveBeenCalled();
      renderer.unmount();
    });

    it(`preserves native ${name} + click behavior in the mobile tree`, () => {
      const track = vi.fn<TrackNavigation>();
      const renderer = renderMobileTree(track);
      const event = clickEvent(modifier);

      propsOf<AnchorProps>(anchor(renderer)).onClick(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mocks.router.push).not.toHaveBeenCalled();
      expect(track).not.toHaveBeenCalled();
      renderer.unmount();
    });
  }

  it("uses one explicit navigation and closes the mobile menu for a primary click", () => {
    const track = vi.fn<TrackNavigation>();
    const renderer = renderMobileTree(track);
    const event = clickEvent();

    act(() => { propsOf<AnchorProps>(anchor(renderer)).onClick(event); });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mocks.router.push).toHaveBeenCalledTimes(1);
    expect(mocks.router.push).toHaveBeenCalledWith("/sections/funding");
    expect(track).toHaveBeenCalledWith("/sections/funding", "Soutenir CleanMyMap", "network");
    expect(renderer.root.findByProps({ "data-dropdown-open": "false" })).toBeTruthy();
    renderer.unmount();
  });

  it("keeps keyboard Enter activation on the explicit primary path", () => {
    const track = vi.fn<TrackNavigation>();
    const renderer = renderDesktopCard(track);
    const event = clickEvent({ detail: 0 });

    propsOf<AnchorProps>(anchor(renderer)).onClick(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mocks.router.push).toHaveBeenCalledWith("/sections/funding");
    expect(track).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("does not override an already prevented or non-primary activation", () => {
    const track = vi.fn<TrackNavigation>();
    const renderer = renderDesktopCard(track);

    for (const overrides of [{ defaultPrevented: true }, { button: 1 }]) {
      const event = clickEvent(overrides);
      propsOf<AnchorProps>(anchor(renderer)).onClick(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }

    expect(mocks.router.push).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    renderer.unmount();
  });
});
