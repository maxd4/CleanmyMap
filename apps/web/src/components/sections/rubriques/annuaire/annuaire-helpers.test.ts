import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import {
  formatAssociationImpactDate,
  formatAnnuaireCoverage,
  getAssociationImpactSummary,
  getAnnuaireDistanceKm,
  getAnnuairePublicDestination,
  getAssociationProfile,
  getAssociationStructureBadge,
  hasPreciseAnnuaireCoordinates,
  isNationalAnnuaireEntry,
  mergeAnnuaireEntries,
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

describe("public directory destinations", () => {
  it("prefers the declared public channel and falls back to the public website", () => {
    expect(
      getAnnuairePublicDestination({
        primaryChannel: {
          platform: "site web",
          label: "Canal public",
          url: "https://contact.cleanmymap.fr/partner",
        },
        websiteUrl: "https://cleanmymap.fr/partner",
      }),
    ).toEqual({
      label: "Canal public",
      url: "https://contact.cleanmymap.fr/partner",
    });

    expect(
      getAnnuairePublicDestination({
        primaryChannel: undefined,
        websiteUrl: "https://cleanmymap.fr/partner",
      }),
    ).toEqual({
      label: "Consulter le site",
      url: "https://cleanmymap.fr/partner",
    });
  });

  it("rejects absent and unsafe destinations without exposing private contacts", () => {
    expect(
      getAnnuairePublicDestination({
        primaryChannel: {
          platform: "site web",
          label: "Contact interne",
          url: "javascript:alert(1)",
        },
        websiteUrl: "#",
        instagramUrl: undefined,
        facebookUrl: undefined,
      }),
    ).toBeNull();

    expect(
      getAnnuairePublicDestination({
        primaryChannel: {
          platform: "site web",
          label: "Contact administratif",
          url: "mailto:administratif",
        },
        websiteUrl: "https://cleanmymap.fr/partner",
      }),
    ).toEqual({
      label: "Consulter le site",
      url: "https://cleanmymap.fr/partner",
    });

    expect(
      getAnnuairePublicDestination({
        primaryChannel: {
          platform: "site web",
          label: "Téléphone administratif",
          url: "tel:+33102030405",
        },
        websiteUrl: undefined,
        instagramUrl: undefined,
        facebookUrl: undefined,
      }),
    ).toBeNull();
  });
});

describe("annuaire provenance, identity and geography", () => {
  it("lets a published entry replace only the exact stable id", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!seed) throw new Error("Expected the editorial seed fixture to exist");

    const published = {
      ...seed,
      id: "published-shakirail",
      provenance: "published_partner" as const,
      verificationStatus: "verifie" as const,
      qualificationStatus: "partenaire_actif" as const,
      availability: "Sur rendez-vous",
      lastUpdatedAt: "2026-10-22T00:00:00.000Z",
      recentActivityAt: "2026-10-22T00:00:00.000Z",
    };
    const sameIdPublished = { ...published, id: seed.id };

    expect(mergeAnnuaireEntries([seed], [published])).toEqual([seed, published]);
    expect(mergeAnnuaireEntries([seed], [sameIdPublished])).toEqual([sameIdPublished]);
  });

  it("does not treat similar names or legal identities as a merge key", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!seed) throw new Error("Expected the editorial seed fixture to exist");

    const published = {
      ...seed,
      id: "onboarded-similar-name",
      name: seed.name,
      legalIdentity: seed.legalIdentity,
      provenance: "published_partner" as const,
      verificationStatus: "verifie" as const,
      qualificationStatus: "partenaire_actif" as const,
      availability: "Sur rendez-vous",
      lastUpdatedAt: "2026-10-22T00:00:00.000Z",
      recentActivityAt: "2026-10-22T00:00:00.000Z",
    };

    expect(mergeAnnuaireEntries([seed], [published]).map((entry) => entry.id)).toEqual([
      seed.id,
      published.id,
    ]);
  });

  it("keeps national scope in lists without inventing a marker or distance", () => {
    const national = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-megots-alcome");
    const franceCentre = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-gestes-propres");
    if (!national || !franceCentre) throw new Error("Expected national seed fixtures to exist");

    expect(isNationalAnnuaireEntry(national)).toBe(true);
    expect(hasPreciseAnnuaireCoordinates(national)).toBe(false);
    expect(getAnnuaireDistanceKm(national, 11)).toBeNull();
    expect(formatAnnuaireCoverage(national)).toContain("Portée nationale");
    expect(hasPreciseAnnuaireCoordinates(franceCentre)).toBe(false);
  });

  it("does not use missing or derived coordinates for distance", () => {
    const local = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!local) throw new Error("Expected a local seed fixture to exist");

    expect(hasPreciseAnnuaireCoordinates({ ...local, lat: null, lng: null })).toBe(false);
    expect(getAnnuaireDistanceKm({ ...local, lat: null, lng: null }, 11)).toBeNull();
    expect(
      hasPreciseAnnuaireCoordinates({
        ...local,
        coordinatesSource: "derived_coverage",
      }),
    ).toBe(false);
  });
});
