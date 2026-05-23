import { describe, expect, it } from "vitest";
import { ASSOCIATIONS_ENTRIES } from "./annuaire/seed-associations";
import {
  formatAssociationImpactDate,
  getAssociationImpactSummary,
  getAssociationProfile,
  getAssociationStructureBadge,
} from "./annuaire-helpers";

describe("association valorization helpers", () => {
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
