import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { MouseEvent } from "react";
import { describe, expect, it } from "vitest";

import { SpogomiOrientationTabs } from "./spogomi-orientation-tabs";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function findTabs(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "button" && node.props.role === "tab");
}

describe("SpogomiOrientationTabs", () => {
  it("renders the accessible volunteer journey by default", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs canAccessOrganizerDashboard={false} />);
    });
    const tabs = findTabs(renderer);

    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.props.children)).toEqual([
      "Bénévoles",
      "Arbitres & modération",
      "Organisateurs",
    ]);
    expect(tabs[0]?.props["aria-selected"]).toBe(true);
    expect(tabs[1]?.props["aria-selected"]).toBe(false);
    expect(renderer.root.findByProps({ role: "tabpanel" }).props.children).toBeTruthy();
    expect(renderer.root.findAll((node) => node.type === "a" && node.props.href === "/spogomi/mes-evenements")).toHaveLength(0);
  });

  it("changes the explanatory journey without granting referee access", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs canAccessOrganizerDashboard={true} />);
    });

    const tabs = findTabs(renderer);
    act(() => {
      tabs[1]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });

    expect(renderer.root.findAllByType("h3").map((node) => node.props.children)).toContain("Arbitres & modération");
    expect(renderer.root.findAll((node) => node.type === "a" && node.props.href === "/spogomi/mes-evenements")).toHaveLength(0);
    expect(renderer.root.findAll((node) => node.type === "a" && node.props.href === "/spogomi")).toHaveLength(0);
  });

  it("exposes the existing organizer dashboard only in the organizer journey", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs canAccessOrganizerDashboard={true} />);
    });

    const tabs = findTabs(renderer);
    act(() => {
      tabs[2]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });

    expect(renderer.root.findAll((node) => node.type === "a" && node.props.href === "/spogomi/mes-evenements")).toHaveLength(1);
  });
});
