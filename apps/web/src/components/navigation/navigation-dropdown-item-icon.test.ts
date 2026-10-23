import { describe, expect, it } from "vitest";
import { getNavigationSpacesForProfile } from "../../lib/navigation";
import { PROFILE_ORDER } from "../../lib/profiles";
import { DISPLAY_MODES } from "../../lib/ui/preferences";
import { getNavigationDropdownItemAccent } from "./navigation-dropdown-accent-theme";
import { getNavigationDropdownItemIcon } from "./navigation-dropdown-item-icon";

const NAVIGATION_ROUTE_IDS = new Set(
  PROFILE_ORDER.flatMap((profile) =>
    DISPLAY_MODES.flatMap((displayMode) =>
      getNavigationSpacesForProfile(profile, displayMode, "fr").flatMap((space) =>
        space.items.map((item) => item.routeId),
      ),
    ),
  ),
);

describe("navigation dropdown item icons", () => {
  it("covers every routeId produced by the navigation registry", () => {
    expect(NAVIGATION_ROUTE_IDS.size).toBeGreaterThan(0);
    for (const routeId of NAVIGATION_ROUTE_IDS) {
      expect(getNavigationDropdownItemIcon(routeId)).toBe(
        getNavigationDropdownItemIcon(routeId),
      );
    }
  });

  it("uses dedicated icons for form joining and funding", () => {
    expect(getNavigationDropdownItemIcon("rejoindre-une-action")).not.toBe(
      getNavigationDropdownItemIcon("new"),
    );
    expect(getNavigationDropdownItemIcon("funding")).not.toBe(
      getNavigationDropdownItemIcon("sponsor"),
    );
    expect(() => getNavigationDropdownItemIcon("unknown-route")).toThrow(
      "Missing navigation dropdown item icon",
    );
  });

  it("provides a directory icon for the public annuaire route", () => {
    expect(getNavigationDropdownItemIcon("annuaire")).toBeDefined();
  });

  it("preserves the canonical item accent contracts", () => {
    expect(getNavigationDropdownItemAccent("home", "dashboard")).toBe("amber");
    expect(getNavigationDropdownItemAccent("act", "new")).toBe("emerald");
    expect(getNavigationDropdownItemAccent("visualize", "map")).toBe("sky");
    expect(getNavigationDropdownItemAccent("visualize", "reports")).toBe("red");
    expect(getNavigationDropdownItemAccent("network", "open-data")).toBe("indigo");
    expect(getNavigationDropdownItemAccent("network", "community")).toBe("pink");
    expect(getNavigationDropdownItemAccent("learn", "learn-comprendre")).toBe("yellow");
  });
});
