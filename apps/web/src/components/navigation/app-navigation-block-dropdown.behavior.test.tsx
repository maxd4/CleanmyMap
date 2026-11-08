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

function NavigationHarness() {
  const [open, setOpen] = useState(false);
  return (
    <AppNavigationBlockDropdown
      activeSpaceId={null}
      locale="fr"
      onTrackNavigation={vi.fn()}
      onOpenChange={(_, nextOpen) => setOpen(nextOpen)}
      open={open}
      pathname="/"
      space={space}
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
});
