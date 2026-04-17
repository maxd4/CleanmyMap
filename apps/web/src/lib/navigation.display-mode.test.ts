import { describe, expect, it } from "vitest";
import {
  getNavigationLabels,
  getNavigationProfileOverview,
  getNavigationSpacesForProfile,
  getProfileNavigationEntries,
} from "./navigation";

function collectRouteIds(
  profile: "benevole" | "coordinateur" | "scientifique" | "elu" | "admin",
  mode: "exhaustif" | "sobre" | "simplifie",
) {
  return getNavigationSpacesForProfile(profile, mode).flatMap((space) =>
    space.items.map((item) => item.routeId),
  );
}

describe("navigation display modes", () => {
  it("keeps exhaustive mode as the richest mode", () => {
    const exhaustive = collectRouteIds("benevole", "exhaustif");
    const simplifie = collectRouteIds("benevole", "simplifie");

    expect(exhaustive.length).toBeGreaterThan(simplifie.length);
    expect(exhaustive).toContain("gamification");
    expect(simplifie).not.toContain("gamification");
  });

  it("limits to essential sections in simplifie mode", () => {
    const simplifie = collectRouteIds("coordinateur", "simplifie");

    expect(simplifie).toContain("new");
    expect(simplifie).toContain("map");
    expect(simplifie).toContain("history");
    expect(simplifie).not.toContain("climate");
    expect(simplifie).not.toContain("recycling");
  });

  it("removes secondary CTA in non-exhaustive modes", () => {
    const exhaustiveOverview = getNavigationProfileOverview(
      "coordinateur",
      "exhaustif",
    );
    const sobreOverview = getNavigationProfileOverview("coordinateur", "sobre");
    const simplifieOverview = getNavigationProfileOverview(
      "coordinateur",
      "simplifie",
    );

    expect(exhaustiveOverview.secondaryCTA).not.toBeNull();
    expect(sobreOverview.secondaryCTA).toBeNull();
    expect(simplifieOverview.secondaryCTA).toBeNull();
  });

  it("mentions the active display mode in navigation labels", () => {
    const labels = getNavigationLabels("fr", "scientifique", {
      isAdmin: false,
      displayMode: "simplifie",
    });
    expect(labels.summary).toContain("mode simplifie");
  });

  it("orders spaces using role priority instead of fixed order", () => {
    const scientifiqueSpaceIds = getNavigationSpacesForProfile(
      "scientifique",
      "exhaustif",
    ).map((space) => space.id);
    const adminSpaceIds = getNavigationSpacesForProfile(
      "admin",
      "exhaustif",
    ).map((space) => space.id);

    expect(scientifiqueSpaceIds).toEqual([
      "decide",
      "supervise",
      "prepare",
      "execute",
    ]);
    expect(adminSpaceIds).toEqual([
      "supervise",
      "execute",
      "decide",
      "prepare",
    ]);
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

    expect(nonAdminEntries).toHaveLength(1);
    expect(nonAdminEntries[0]?.id).toBe("coordinateur");
    expect(adminEntries.length).toBeGreaterThan(nonAdminEntries.length);
    expect(adminEntries.some((entry) => entry.id === "admin")).toBe(true);
  });
});
