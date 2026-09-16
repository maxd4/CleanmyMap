import { describe, expect, it } from "vitest";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";
import {
  getNavigationSpacesForProfile,
  type NavigationSpace,
} from "@/lib/navigation";

const PROFILES = ["benevole", "coordinateur", "scientifique", "entreprise", "elu", "admin", "max"] as const;
const MODES = ["exhaustif", "sobre", "minimaliste"] as const;

function collectRouteIds(spaces: NavigationSpace[]): string[] {
  return spaces.flatMap((space) => space.items.map((item) => item.routeId));
}

describe("navigation registry consistency", () => {
  it("keeps the Agir registry contract aligned with its visible entries", () => {
    const byRoute = new Map<string, (typeof RUBRIQUE_REGISTRY)[number]>(
      RUBRIQUE_REGISTRY.map((rubrique) => [rubrique.route, rubrique]),
    );

    expect(
      [
        "/sections/rejoindre-une-action",
        "/actions/new",
        "/signalement",
      ].map((route) => byRoute.get(route)?.id),
    ).toEqual(["rejoindre-une-action", "new", "signalement"]);
    expect(byRoute.get("/actions/new")?.label.fr).toBe("Créer une action");
    expect(byRoute.get("/actions/new")?.description.fr).toBe(
      "Préparer une action et renseigner ses résultats.",
    );
    expect(byRoute.get("/sections/trash-spotter")?.label.fr).toBe(
      "Suivi Trash Spotter",
    );
    expect(byRoute.get("/sections/trash-spotter")?.description.fr).toContain(
      "signalements",
    );
  });

  it("keeps French navigation descriptions user-oriented", () => {
    const internalTerms = /cockpit|architecture|back-office|surface|workflow|pilotage technique/i;

    for (const rubrique of RUBRIQUE_REGISTRY) {
      expect(rubrique.description.fr).not.toMatch(internalTerms);
      expect(rubrique.description.fr.trim().length).toBeGreaterThan(0);
    }

    expect(
      RUBRIQUE_REGISTRY.find((rubrique) => rubrique.id === "dashboard")?.description.fr,
    ).toBe("Votre profil, vos actions et votre impact");
    expect(
      RUBRIQUE_REGISTRY.find((rubrique) => rubrique.id === "map")?.description.fr,
    ).toBe("Explorer les actions et signalements sur la carte");
    expect(
      RUBRIQUE_REGISTRY.find((rubrique) => rubrique.id === "admin")?.description.fr,
    ).toBe("Modérer et superviser la plateforme");
  });

  it("keeps non-visible search terms available through the navigation projection", () => {
    const dashboard = getNavigationSpacesForProfile("benevole", "exhaustif")
      .flatMap((space) => space.items)
      .find((item) => item.routeId === "dashboard");
    const admin = getNavigationSpacesForProfile("admin", "exhaustif")
      .flatMap((space) => space.items)
      .find((item) => item.routeId === "admin");

    expect(dashboard?.searchKeywords?.fr).toContain("pilotage");
    expect(admin?.searchKeywords?.fr).toContain("back-office");
  });

  it("maps only existing rubriques with matching hrefs", () => {
    const byId = new Map<string, (typeof RUBRIQUE_REGISTRY)[number]>(
      RUBRIQUE_REGISTRY.map((rubrique) => [rubrique.id, rubrique]),
    );

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
