import { describe, expect, it } from "vitest";
import type { BlockAccent } from "@/lib/ui/block-accents";
import {
  buildNavigationBlockTriggerStyle,
  buildNavigationDropdownCardStyle,
  buildNavigationDropdownGradientStyle,
  buildNavigationDropdownShellStyle,
  getNavigationDropdownItemAccent,
  getNavigationDropdownItemIconClassName,
  getNavigationDropdownSpaceAccents,
} from "./navigation-dropdown-accent-theme";

const emptyAccentPair = [] as unknown as [BlockAccent, BlockAccent?];

describe("navigation dropdown accent theme", () => {
  it("keeps the canonical accent pair for every supported block and falls back safely", () => {
    expect(getNavigationDropdownSpaceAccents(null)).toEqual(["amber"]);
    expect(getNavigationDropdownSpaceAccents("home")).toEqual(["amber"]);
    expect(getNavigationDropdownSpaceAccents("act")).toEqual(["emerald"]);
    expect(getNavigationDropdownSpaceAccents("visualize")).toEqual(["sky", "red"]);
    expect(getNavigationDropdownSpaceAccents("impact")).toEqual(["red"]);
    expect(getNavigationDropdownSpaceAccents("network")).toEqual(["indigo", "pink"]);
    expect(getNavigationDropdownSpaceAccents("connect")).toEqual(["pink"]);
    expect(getNavigationDropdownSpaceAccents("learn")).toEqual(["yellow"]);
    expect(getNavigationDropdownSpaceAccents("unknown" as never)).toEqual(["amber"]);
  });

  it("resolves route-specific accents and supported fallbacks", () => {
    expect(getNavigationDropdownItemAccent("visualize", "methodologie")).toBe("red");
    expect(getNavigationDropdownItemAccent("visualize", "map")).toBe("sky");
    expect(getNavigationDropdownItemAccent("network", "feedback")).toBe("pink");
    expect(getNavigationDropdownItemAccent("network", "open-data")).toBe("indigo");
    expect(getNavigationDropdownItemAccent("act")).toBe("emerald");
    expect(getNavigationDropdownItemAccent(null)).toBe("amber");
    expect(getNavigationDropdownItemAccent("unknown" as never, "unknown-route")).toBe("amber");
  });

  it("emits observable icon, trigger, gradient, shell and card tokens", () => {
    const iconClasses = [
      getNavigationDropdownItemIconClassName("home"),
      getNavigationDropdownItemIconClassName("act"),
      getNavigationDropdownItemIconClassName("visualize", "map"),
      getNavigationDropdownItemIconClassName("visualize", "reports"),
      getNavigationDropdownItemIconClassName("network", "open-data"),
      getNavigationDropdownItemIconClassName("network", "feedback"),
      getNavigationDropdownItemIconClassName("learn"),
    ];
    expect(iconClasses.every((value) => value.includes("bg-gradient-to-br"))).toBe(true);
    expect(new Set(iconClasses).size).toBe(7);

    expect(buildNavigationBlockTriggerStyle("visualize")["--navigation-block-accent"]).toBeTruthy();
    expect(buildNavigationDropdownGradientStyle(["sky", "red"]).backgroundImage).toContain("linear-gradient");
    expect(buildNavigationDropdownGradientStyle(["emerald"]).backgroundImage).toContain("linear-gradient");
    expect(buildNavigationDropdownGradientStyle(emptyAccentPair).backgroundImage).toContain("linear-gradient");

    const singleShell = buildNavigationDropdownShellStyle(["amber"]);
    const pairedShell = buildNavigationDropdownShellStyle(["indigo", "pink"]);
    expect(singleShell.backgroundColor).toBeTruthy();
    expect(singleShell.backgroundImage).toContain("50%");
    expect(pairedShell.backgroundImage).toContain("46%");
    expect(pairedShell.borderColor).toContain("rgba");
    expect(pairedShell.color).toBe("#000000");

    const activeCard = buildNavigationDropdownCardStyle("pink", true);
    const inactiveCard = buildNavigationDropdownCardStyle("pink", false);
    expect(activeCard["--nav-body-bg"]).not.toBe(inactiveCard["--nav-body-bg"]);
    expect(activeCard["--nav-chevron-color"]).not.toBe(inactiveCard["--nav-chevron-color"]);
    expect(activeCard["--nav-focus-ring"]).toContain("rgba");
  });
});
