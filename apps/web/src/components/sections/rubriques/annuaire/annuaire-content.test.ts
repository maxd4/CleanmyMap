import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import {
  compareAnnuaireEntries,
  getAssociationProfile,
  getAssociationStructureBadge,
  getEntryTrustState,
  hasRecentPartnerUpdate,
  isCompletePublicPartner,
  isPlaceholderPublicUrl,
} from "./annuaire-helpers";

describe("annuaire public data contract", () => {
  it("contains no placeholder public links", () => {
    for (const entry of INITIAL_ANNUAIRE_ENTRIES) {
      const urls = [
        entry.websiteUrl,
        entry.instagramUrl,
        entry.facebookUrl,
        entry.primaryChannel?.url,
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );

      for (const url of urls) {
        expect(isPlaceholderPublicUrl(url)).toBe(false);
        expect(url.toLowerCase()).not.toContain("example.com");
      }
    }
  });

  it("keeps editorial seeds neutral at the runtime boundary", () => {
    for (const entry of INITIAL_ANNUAIRE_ENTRIES) {
      expect(entry.provenance).toBe("editorial_seed");
      expect(entry.verificationStatus).toBe("en_cours");
      expect(entry.qualificationStatus).toBe("contact_non_qualifie");
      expect(entry.availability).toBeUndefined();
      expect(entry.lastUpdatedAt).toBeUndefined();
      expect(entry.recentActivityAt).toBeUndefined();
      expect(entry.associationProfile?.impactHistory).toBeUndefined();
      expect(entry.associationProfile?.structureStatus).toBeUndefined();
      expect(getEntryTrustState(entry)).toBe("editorial");
      expect(getAssociationProfile(entry)).toBeNull();
      expect(getAssociationStructureBadge(entry)).toBeNull();
      expect(hasRecentPartnerUpdate(entry)).toBe(false);
      expect(isCompletePublicPartner(entry)).toBe(false);
    }
  });

  it("does not let a seed outrank a trusted published entry through trust state", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES[0];
    expect(seed).toBeDefined();

    const published = {
      ...seed,
      id: "published-test-entry",
      provenance: "published_partner" as const,
      verificationStatus: "verifie" as const,
      qualificationStatus: "partenaire_actif" as const,
      recentActivityAt: "2026-08-26T10:00:00.000Z",
      availability: "Sur rendez-vous",
      lastUpdatedAt: "2026-08-26T10:00:00.000Z",
      isFeatured: false,
      coveredArrondissements: [1],
      primaryChannel: {
        platform: "site web" as const,
        label: "Site officiel",
        url: "https://published.example.test",
      },
    };

    expect(getEntryTrustState(published)).toBe("trusted");
    expect(getEntryTrustState(seed)).toBe("editorial");

    const sorted = [
      { ...seed, isFeatured: false, distanceKm: null },
      { ...published, distanceKm: null },
    ].sort(compareAnnuaireEntries);

    expect(sorted[0]?.provenance).toBe("published_partner");
  });

});
