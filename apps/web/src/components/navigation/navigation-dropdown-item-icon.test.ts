import { describe, expect, it } from "vitest";
import { getNavigationSpacesForProfile } from "../../lib/navigation";
import { PROFILE_ORDER } from "../../lib/profiles";
import { DISPLAY_MODES } from "../../lib/ui/preferences";
import { getNavigationDropdownItemAccent } from "./navigation-dropdown-accent-theme";
import { getNavigationDropdownItemIcon } from "./navigation-dropdown-item-icon";

describe("navigation dropdown item icons", () => {
  it("covers every routeId produced by the navigation registry", () => {
    const routeIds = new Set<string>();

    for (const profile of PROFILE_ORDER) {
      for (const displayMode of DISPLAY_MODES) {
        for (const space of getNavigationSpacesForProfile(profile, displayMode, "fr")) {
          for (const item of space.items) {
            routeIds.add(item.routeId);
          }
        }
      }
    }

    expect(routeIds.size).toBeGreaterThan(0);
    for (const routeId of routeIds) {
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
