import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import {
  formatAssociationImpactDate,
  getAssociationImpactSummary,
  getAssociationProfile,
  getAssociationStructureBadge,
} from "./annuaire-helpers";

describe("association profile provenance", () => {
  it("does not retain the unused recommendation pseudo-score", () => {
    const source = readFileSync(new URL("./annuaire-helpers.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/buildAutomaticRecommendations|profileBonus|locationBonus|recommendationReason/);
  });

  it("does not derive trust or measured impact from an editorial seed", () => {
    const entry = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-zerowaste-paris");

    expect(entry).toBeDefined();
    expect(getAssociationProfile(entry!)).toBeNull();
    expect(getAssociationStructureBadge(entry!)).toBeNull();
    expect(getAssociationImpactSummary(entry!)).toBe("Impact associatif non disponible");
  });

  it("preserves the existing profile behavior for a published partner entry", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!seed) {
      throw new Error("Expected the editorial seed fixture to exist");
    }

    const published = {
      ...seed,
      provenance: "published_partner" as const,
      verificationStatus: "verifie" as const,
      qualificationStatus: "partenaire_actif" as const,
      recentActivityAt: "2026-08-26T10:00:00.000Z",
      availability: "Sur rendez-vous",
      lastUpdatedAt: "2026-08-26T10:00:00.000Z",
      associationProfile: {
        ...seed.associationProfile!,
        structureStatus: "active_validated" as const,
        impactHistory: {
          actionCount: 12,
          zonesCovered: 1,
          recurrence: "Actions récurrentes",
          lastActionAt: "2026-08-26T10:00:00.000Z",
        },
      },
    };

    const profile = getAssociationProfile(published);

    expect(profile).toMatchObject({
      structureStatus: "active_validated",
      impactHistory: {
        actionCount: 12,
        zonesCovered: 1,
      },
    });
    expect(getAssociationStructureBadge(published)).toMatchObject({
      label: "Structure active / validée",
      tone: "success",
    });
    expect(getAssociationImpactSummary(published)).toContain("12 actions référencées");
    expect(formatAssociationImpactDate(profile?.impactHistory?.lastActionAt)).toContain(
      "Dernière action",
    );
  });
});
