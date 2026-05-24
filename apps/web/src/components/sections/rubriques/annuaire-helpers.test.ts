import { describe, expect, it } from "vitest";
import { ASSOCIATIONS_ENTRIES } from "./annuaire/seed-associations";
import {
  formatAssociationImpactDate,
  getAssociationImpactSummary,
  getAssociationProfile,
  getAssociationStructureBadge,
} from "./annuaire-helpers";

describe("association valorization helpers", () => {
  it("includes Shakirail in the partner directory seeds", () => {
    const entry = ASSOCIATIONS_ENTRIES.find((item) => item.id === "asso-shakirail");
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      name: "Le Shakirail",
      location: "Paris 18e",
      websiteUrl: "https://shakirail.curry-vavart.com/",
      qualificationStatus: "partenaire_actif",
    });

    const profile = getAssociationProfile(entry!);

    expect(profile).toMatchObject({
      structureStatus: "active_validated",
      impactHistory: {
        zonesCovered: 1,
      },
    });
    expect(profile?.usefulResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Site officiel",
          url: "https://shakirail.curry-vavart.com/",
        }),
      ]),
    );
    expect(getAssociationStructureBadge(entry!)).toMatchObject({
      label: "Structure active / validée",
      tone: "success",
    });
  });

  it("builds association insights from seed data", () => {
    const entry = ASSOCIATIONS_ENTRIES.find((item) => item.id === "asso-zerowaste-paris");
    expect(entry).toBeDefined();

    const profile = getAssociationProfile(entry!);

    expect(profile).toMatchObject({
      mission: expect.stringContaining("réduction des déchets à la source"),
      structureStatus: "active_validated",
      impactHistory: {
        actionCount: 52,
        zonesCovered: 20,
      },
    });

    expect(profile?.publicCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "materiel",
          label: "Appel à matériel",
        }),
      ]),
    );
    expect(getAssociationStructureBadge(entry!)).toMatchObject({
      label: "Structure active / validée",
      tone: "success",
    });
    expect(getAssociationImpactSummary(entry!)).toContain("52 actions référencées");
    expect(formatAssociationImpactDate(profile?.impactHistory?.lastActionAt)).toContain("Dernière action");
  });
});
