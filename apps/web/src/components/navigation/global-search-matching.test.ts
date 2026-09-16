import { describe, expect, it } from "vitest";

import { getNavigationSpacesForProfile } from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";
import { filterGlobalSearchItems, type GlobalSearchItem } from "./global-search-matching";

function itemsFor(profile: AppProfile, displayMode: "exhaustif" | "sobre" | "minimaliste" = "exhaustif") {
  return getNavigationSpacesForProfile(profile, displayMode, "fr").flatMap((space) =>
    space.items.map((item) => ({
      ...item,
      spaceLabel: space.label.fr,
      spaceIcon: space.icon,
    })),
  );
}

function matchingLabels(profile: AppProfile, query: string, displayMode?: "exhaustif" | "sobre" | "minimaliste") {
  return filterGlobalSearchItems(itemsFor(profile, displayMode), query, "fr").map(
    (item) => item.label.fr,
  );
}

describe("global search matching", () => {
  it("matches non-visible site-map keywords in the accessible navigation index", () => {
    expect(matchingLabels("benevole", "plan du site")).toContain("Sommaire");
  });

  it("returns Mon espace or Pilotage according to accessible profile entries", () => {
    expect(matchingLabels("benevole", "pilotage")).toContain("Mon espace");
    expect(matchingLabels("benevole", "pilotage")).not.toContain("Pilotage");
    expect(matchingLabels("coordinateur", "pilotage")).toEqual(
      expect.arrayContaining(["Mon espace", "Pilotage"]),
    );
    expect(matchingLabels("coordinateur", "cockpit")).toContain("Pilotage");
  });

  it("keeps back-office restricted to profiles with the Administration destination", () => {
    expect(matchingLabels("admin", "back-office")).toContain("Administration");
    expect(matchingLabels("benevole", "back-office")).not.toContain("Administration");
  });

  it("normalizes case and whitespace while keeping keywords out of the result shape", () => {
    const results = filterGlobalSearchItems(
      itemsFor("benevole"),
      "  PlAn\t  DU   site  ",
      "fr",
    );

    expect(results.map((item) => item.label.fr)).toContain("Sommaire");
    expect(results[0]).not.toHaveProperty("keyword");
  });

  it("keeps the existing limit of eight results", () => {
    const firstItem = itemsFor("benevole")[0] as GlobalSearchItem;
    const matchingItems = Array.from({ length: 9 }, (_, index) => ({
      ...firstItem,
      id: `synthetic-${index}`,
      label: { fr: `Résultat ${index}`, en: `Result ${index}` },
      description: { fr: "Résultat de limite", en: "Limit result" },
      searchKeywords: { fr: ["limite"] },
    }));

    expect(filterGlobalSearchItems(matchingItems, "limite", "fr")).toHaveLength(8);
  });
});
