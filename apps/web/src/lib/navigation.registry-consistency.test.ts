import { describe, expect, it } from "vitest";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";
import {
  getNavigationSpacesForProfile,
  type NavigationSpace,
} from "@/lib/navigation";

const PROFILES = ["benevole", "coordinateur", "scientifique", "elu", "admin"] as const;
const MODES = ["exhaustif", "sobre", "simplifie"] as const;

function collectRouteIds(spaces: NavigationSpace[]): string[] {
  return spaces.flatMap((space) => space.items.map((item) => item.routeId));
}

describe("navigation registry consistency", () => {
  it("maps only existing rubriques with matching hrefs", () => {
    const byId = new Map(RUBRIQUE_REGISTRY.map((rubrique) => [rubrique.id, rubrique]));

    for (const profile of PROFILES) {
      const spaces = getNavigationSpacesForProfile(profile, "exhaustif");
      const routeIds = collectRouteIds(spaces);
      expect(new Set(routeIds).size).toBe(routeIds.length);

      for (const space of spaces) {
        for (const item of space.items) {
          const rubrique = byId.get(item.routeId);
          expect(rubrique).toBeDefined();
          expect(item.href).toBe(rubrique?.route);
        }
      }
    }
  });

  it("ensures reduced display modes stay subsets of exhaustive mode", () => {
    for (const profile of PROFILES) {
      const exhaustive = new Set(
        collectRouteIds(getNavigationSpacesForProfile(profile, "exhaustif")),
      );

      for (const mode of MODES) {
        if (mode === "exhaustif") {
          continue;
        }
        const reduced = collectRouteIds(getNavigationSpacesForProfile(profile, mode));
        for (const routeId of reduced) {
          expect(exhaustive.has(routeId)).toBe(true);
        }
      }
    }
  });
});
