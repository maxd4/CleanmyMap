import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { MouseEvent } from "react";
import { describe, expect, it } from "vitest";

import { SpogomiOrientationTabs } from "./spogomi-orientation-tabs";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function findTabs(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "button" && node.props.role === "tab");
}

function links(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "a");
}

describe("SpogomiOrientationTabs", () => {
  it("renders all volunteer actions publicly and keeps the private catalog intent", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });

    expect(findTabs(renderer)).toHaveLength(3);
    expect(findTabs(renderer).map((tab) => tab.props.children)).toEqual([
      "Bénévoles",
      "Arbitres & modération",
      "Organisateurs",
    ]);
    expect(renderer.root.findAllByProps({ role: "tabpanel" })[0]?.findAllByType("article")).toHaveLength(10);
    expect(links(renderer).some((link) => link.props.href === "#spogomi-events")).toBe(true);
    for (const panel of renderer.root.findAllByProps({ role: "tabpanel" })) {
      expect(panel.props.id).toBeTruthy();
      expect(panel.props["aria-labelledby"]).toBeTruthy();
      expect(panel.findAllByProps({ role: "tab" })).toHaveLength(0);
    }
    for (const tab of findTabs(renderer)) {
      expect(renderer.root.findAllByProps({ id: tab.props["aria-controls"] })).toHaveLength(1);
    }
    expect(links(renderer).some((link) => link.props.href === "/spogomi#spogomi-registration")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/spogomi#spogomi-assistance")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dvolunteers")).toBe(true);
  });

  it("exposes referee actions before authentication without granting a global access", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });

    const tabs = findTabs(renderer);
    act(() => {
      tabs[1]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });

    expect(renderer.root.findAllByType("h3").map((node) => node.props.children)).toContain("Arbitres & modération");
    expect(renderer.root.findAllByType("p").some((node) => node.props.children === "Événements habilités")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dreferees%26section%3Darbitration")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/spogomi")).toBe(false);
  });

  it("keeps organizer actions discoverable anonymously and opens them directly when authenticated", () => {
    let anonymous!: ReactTestRenderer;
    act(() => {
      anonymous = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });
    const anonymousTabs = findTabs(anonymous);
    act(() => {
      anonymousTabs[2]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });
    expect(links(anonymous).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fnouveau")).toBe(true);
    expect(links(anonymous).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dorganizers%26section%3Dteams")).toBe(true);

    let authenticated!: ReactTestRenderer;
    act(() => {
      authenticated = create(<SpogomiOrientationTabs isAuthenticated />);
    });
    const authenticatedTabs = findTabs(authenticated);
    act(() => {
      authenticatedTabs[2]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });
    expect(links(authenticated).some((link) => link.props.href === "/spogomi/nouveau")).toBe(true);
    expect(links(authenticated).some((link) => link.props.href === "/spogomi/mes-evenements?parcours=organizers&section=teams")).toBe(true);
  });
});
