import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pathname = vi.hoisted(() => ({ value: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

vi.mock("./app-navigation-ribbon-shell", () => ({
  AppNavigationRibbonShell: (props: Record<string, unknown>) => (
    <output data-testid="ribbon-shell" data-pathname={props.pathname as string} data-prop-count={Object.keys(props).length} />
  ),
}));

import { AppNavigationRibbon } from "./app-navigation-ribbon";

describe("AppNavigationRibbon behavior", () => {
  beforeEach(() => {
    pathname.value = "/dashboard";
  });

  it("passes the current pathname to the canonical shell and updates it on navigation", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<AppNavigationRibbon currentProfile="benevole" />);
    });
    expect(renderer.root.findByProps({ "data-testid": "ribbon-shell" }).props["data-pathname"]).toBe("/dashboard");

    pathname.value = "/actions";
    act(() => {
      renderer.update(<AppNavigationRibbon currentProfile="benevole" />);
    });
    expect(renderer.root.findByProps({ "data-testid": "ribbon-shell" }).props["data-pathname"]).toBe("/actions");
    expect(renderer.root.findByProps({ "data-testid": "ribbon-shell" }).props["data-prop-count"]).toBe(2);
    renderer.unmount();
  });
});
