// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NavigationSpace } from "@/lib/navigation";
import { AppNavigationBlockDropdown } from "./app-navigation-block-dropdown";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const space: NavigationSpace = {
  id: "act",
  label: { fr: "Agir", en: "Act" },
  icon: "",
  color: "",
  items: [{
    id: "new",
    href: "/actions/new",
    label: { fr: "Créer une action", en: "Create an action" },
    description: { fr: "Déclarer une action.", en: "Declare an action." },
    routeId: "new",
  }],
};

type TrackNavigation = (href: string, label: string, spaceId: string | null) => void;

function NavigationHarness({
  activeSpaceId = null,
  locale = "fr",
  onTrackNavigation = vi.fn<TrackNavigation>(),
  value = space,
}: {
  activeSpaceId?: NavigationSpace["id"] | null;
  locale?: "fr" | "en";
  onTrackNavigation?: TrackNavigation;
  value?: NavigationSpace;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AppNavigationBlockDropdown
      activeSpaceId={activeSpaceId}
      locale={locale}
      onTrackNavigation={onTrackNavigation}
      onOpenChange={(_, nextOpen) => setOpen(nextOpen)}
      open={open}
      pathname="/"
      space={value}
    />
  );
}

describe("AppNavigationBlockDropdown keyboard behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("places keyboard focus on the first portaled navigation link and restores it on Escape", () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<NavigationHarness />);
    });

    const trigger = host.querySelector<HTMLButtonElement>("[data-navigation-block-trigger]");
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-label")).toBe("Agir");
    expect(trigger?.getAttribute("title")).toBeNull();
    expect(trigger?.querySelector(".cmm-navigation-block-label")).toBeNull();
    expect(trigger?.querySelector(".sr-only")?.textContent).toBe("Agir");
    trigger!.focus();
    act(() => {
      trigger!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });

    const firstLink = document.body.querySelector<HTMLAnchorElement>('nav[aria-label="Agir"] a[href="/actions/new"]');
    expect(firstLink).not.toBeNull();
    expect(document.activeElement).toBe(firstLink);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(trigger);
    expect(document.body.querySelector('nav[aria-label="Agir"]')).toBeNull();
  });

  it("renders the active English block, tracks a destination, and closes after navigation", () => {
    const onTrackNavigation = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(
        <NavigationHarness
          activeSpaceId="act"
          locale="en"
          onTrackNavigation={onTrackNavigation}
        />,
      );
    });

    const trigger = host.querySelector<HTMLButtonElement>("[data-navigation-block-trigger]")!;
    expect(trigger.getAttribute("aria-label")).toBe("Act");
    expect(trigger.getAttribute("data-navigation-block-active")).toBe("true");

    act(() => trigger.click());
    const link = document.body.querySelector<HTMLAnchorElement>('nav[aria-label="Act"] a[href="/actions/new"]')!;
    vi.useFakeTimers();
    act(() => {
      link.click();
      vi.runAllTimers();
    });

    expect(onTrackNavigation).toHaveBeenCalledWith("/actions/new", "Create an action", "act");
    expect(document.body.querySelector('nav[aria-label="Act"]')).toBeNull();
  });

  it("renders an empty English block without inaccessible pages and supports Escape", () => {
    const emptySpace: NavigationSpace = { ...space, label: { fr: "Agir", en: "Act" }, items: [] };
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<NavigationHarness locale="en" value={emptySpace} />);
    });

    const trigger = host.querySelector<HTMLButtonElement>("[data-navigation-block-trigger]")!;
    act(() => trigger.click());
    const panel = document.body.querySelector<HTMLElement>('[aria-label="Act - pages"]')!;
    expect(panel.textContent).toContain("No accessible pages for this block.");
    expect(panel.querySelectorAll("a")).toHaveLength(0);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(document.body.querySelector('[aria-label="Act - pages"]')).toBeNull();
  });

  it("renders the French empty-state fallback and the visualisation icon width", () => {
    const emptySpace: NavigationSpace = { ...space, items: [] };
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<NavigationHarness value={emptySpace} />);
    });

    act(() => host.querySelector<HTMLButtonElement>("[data-navigation-block-trigger]")!.click());
    expect(document.body.querySelector('[aria-label="Agir - rubriques"]')?.textContent).toContain(
      "Aucune rubrique accessible pour ce bloc.",
    );

    act(() => {
      root!.unmount();
      root = createRoot(host!);
      root.render(
        <NavigationHarness
          activeSpaceId="visualize"
          value={{ ...space, id: "visualize", label: { fr: "Cartographie", en: "Mapping" } }}
        />,
      );
    });
    act(() => host!.querySelector<HTMLButtonElement>("[data-navigation-block-trigger]")!.click());
    expect(document.body.querySelector('nav[aria-label="Cartographie"] a[href="/actions/new"]')).not.toBeNull();
  });
});
