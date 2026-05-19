import { describe, expect, it } from "vitest";
import {
  getNavigationLabels,
  getNavigationProfileOverview,
  getNavigationSpacesForProfile,
  getPilotFallbackItems,
  getProfileNavigationEntries,
} from "./navigation";

function collectRouteIds(
  profile: "benevole" | "coordinateur" | "scientifique" | "elu" | "admin" | "max",
  mode: "exhaustif" | "sobre" | "minimaliste",
) {
  return getNavigationSpacesForProfile(profile, mode).flatMap((space) =>
    space.items.map((item) => item.routeId),
  );
}

describe("navigation display modes", () => {
  it("keeps exhaustive mode as the richest mode", () => {
    const exhaustive = collectRouteIds("benevole", "exhaustif");
    const minimaliste = collectRouteIds("benevole", "minimaliste");

    expect(exhaustive.length).toBeGreaterThan(minimaliste.length);
    expect(exhaustive).toContain("gamification");
    expect(minimaliste).not.toContain("gamification");
  });

  it("limits to essential sections in minimaliste mode", () => {
    const minimaliste = collectRouteIds("coordinateur", "minimaliste");

    expect(minimaliste).toContain("profile");
    expect(minimaliste).toContain("dashboard");
    expect(minimaliste).toContain("map");
    expect(minimaliste).toContain("community");
    expect(minimaliste).not.toContain("climate");
    expect(minimaliste).not.toContain("recycling");
  });

  it("removes secondary CTA in non-exhaustive modes", () => {
    const exhaustiveOverview = getNavigationProfileOverview(
      "coordinateur",
      "exhaustif",
    );
    const sobreOverview = getNavigationProfileOverview("coordinateur", "sobre");
    const minimalisteOverview = getNavigationProfileOverview(
      "coordinateur",
      "minimaliste",
    );

    expect(exhaustiveOverview.secondaryCTA).not.toBeNull();
    expect(sobreOverview.secondaryCTA).toBeNull();
    expect(minimalisteOverview.secondaryCTA).toBeNull();
  });

  it("mentions the active display mode in navigation labels", () => {
    const labels = getNavigationLabels("fr", "scientifique", {
      isAdmin: false,
      displayMode: "minimaliste",
    });
    expect(labels.summary).toContain("mode essentiel");
  });

  it("uses the visible section count in the navigation title", () => {
    const labels = getNavigationLabels("fr", "benevole", {
      isAdmin: false,
      displayMode: "exhaustif",
    });

    expect(labels.navTitle).toBe("Navigation en 5 sections");
  });

  it("keeps the product order", () => {
    const scientifiqueSpaceIds = getNavigationSpacesForProfile(
      "scientifique",
      "exhaustif",
    ).map((space) => space.id);
    const adminSpaceIds = getNavigationSpacesForProfile(
      "admin",
      "exhaustif",
    ).map((space) => space.id);

    expect(scientifiqueSpaceIds).toEqual([
      "home",
      "act",
      "visualize",
      "network",
      "learn",
    ]);
    expect(adminSpaceIds).toEqual([
      "home",
      "act",
      "visualize",
      "network",
      "learn",
    ]);
  });

  it("exposes the dedicated learn pages in the learn space", () => {
    const learnSpace = getNavigationSpacesForProfile("benevole", "exhaustif").find(
      (space) => space.id === "learn",
    );

    expect(learnSpace?.items.map((item) => item.routeId)).toEqual([
      "hub",
      "learn-comprendre",
      "learn-sentrainer",
      "learn-bonnes-pratiques",
      "learn-ressources",
    ]);
  });

  it("moves discussion channels into the network space", () => {
    const networkSpace = getNavigationSpacesForProfile(
      "coordinateur",
      "exhaustif",
    ).find((space) => space.id === "network");

    expect(networkSpace?.items.map((item) => item.routeId)).toEqual([
      "network",
      "community",
      "messagerie",
      "open-data",
    ]);
  });

  it("moves impact pages into the visualize space", () => {
    const visualizeSpace = getNavigationSpacesForProfile(
      "coordinateur",
      "exhaustif",
    ).find((space) => space.id === "visualize");

    expect(visualizeSpace?.items.map((item) => item.routeId)).toEqual([
      "map",
      "sandbox",
      "reports",
      "gamification",
    ]);
  });

  it("moves pilot pages into the home block", () => {
    const homeSpace = getNavigationSpacesForProfile(
      "max",
      "exhaustif",
    ).find((space) => space.id === "home");

    expect(homeSpace?.items.map((item) => item.routeId)).toEqual([
      "dashboard",
      "explorer",
      "profile",
      "pilotage",
      "admin",
      "sponsor",
      "elus",
      "godmode",
    ]);
  });

  it("hides the empty pilot space for benevole", () => {
    const benevoleSpaceIds = getNavigationSpacesForProfile(
      "benevole",
      "exhaustif",
    ).map((space) => space.id);

    expect(benevoleSpaceIds).toEqual([
      "home",
      "act",
      "visualize",
      "network",
      "learn",
    ]);
    expect(benevoleSpaceIds).not.toContain("pilot");
    expect(benevoleSpaceIds).not.toContain("connect");
    expect(benevoleSpaceIds).not.toContain("impact");
  });

  it("provides fallback pilot items for empty pilot blocks", () => {
    const fallback = getPilotFallbackItems("fr");

    expect(fallback.map((item) => item.routeId)).toEqual([
      "dashboard",
      "reports",
    ]);
    expect(fallback[0]?.label.fr).toBe("Tableau de bord");
    expect(fallback[1]?.label.fr).toBe("Rapports d'impact");
  });

  it("limits profile switch entries to active profile for non-admin users", () => {
    const nonAdminEntries = getProfileNavigationEntries({
      currentProfile: "coordinateur",
      isAdmin: false,
    });
    const adminEntries = getProfileNavigationEntries({
      currentProfile: "coordinateur",
      isAdmin: true,
    });
    const maxEntries = getProfileNavigationEntries({
      currentProfile: "max",
      isAdmin: true,
    });

    expect(nonAdminEntries).toHaveLength(1);
    expect(nonAdminEntries[0]?.id).toBe("coordinateur");
    expect(adminEntries.length).toBeGreaterThan(nonAdminEntries.length);
    expect(adminEntries.some((entry) => entry.id === "admin")).toBe(true);
    expect(maxEntries.some((entry) => entry.id === "max")).toBe(true);
  });
});
