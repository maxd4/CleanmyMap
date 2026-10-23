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
  hasTraceableImpactHistory,
  hasTraceablePastActions,
  hasPreciseAnnuaireCoordinates,
  isNationalAnnuaireEntry,
  matchesAnnuaireSearch,
  mergeAnnuaireEntries,
  tokenizeAnnuaireSearchQuery,
} from "./annuaire-helpers";

function createSearchEntry() {
  return {
    id: "published-search-fixture",
    name: "Énergie Solidaire",
    legalIdentity: "Association Énergie Solidaire",
    kind: "association" as const,
    types: ["environnemental" as const],
    description: "Accompagnement d'une mairie pour l'économie circulaire.",
    location: "Île-de-France",
    lat: null,
    lng: null,
    coveredArrondissements: [],
    contributionTypes: ["communication" as const],
    tags: ["Économie circulaire"],
    provenance: "published_partner" as const,
    verificationStatus: "verifie" as const,
    qualificationStatus: "partenaire_actif" as const,
    availability: "Sur rendez-vous",
    lastUpdatedAt: "2026-10-01T00:00:00.000Z",
    associationProfile: {
      mission: "Accompagner les collectivités",
      recurringNeeds: ["Bénévoles"],
      pastActions: ["Ateliers de quartier"],
      usefulResources: [
        {
          label: "Guide énergie et tri",
          description: "Ressource publique pour les équipes locales.",
          url: "https://example.com/guide",
        },
      ],
      publicCalls: [],
    },
  };
}

describe("annuaire public text search", () => {
  it("normalizes accents and case, matches terms across fields in any order, and keeps substrings", () => {
    const entry = createSearchEntry();

    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("energie"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("ÉNERGIE"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("energie mairie"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("mairie energie"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("soli"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("energie ocean"))).toBe(false);
  });

  it("treats repeated spaces, punctuation and hyphens as separators", () => {
    const entry = createSearchEntry();

    expect(
      matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("  eco-circulaire,   mairie  ")),
    ).toBe(true);
    expect(tokenizeAnnuaireSearchQuery("   ,---  ")).toEqual([]);
  });

  it("searches public resources and public location, but not administrative fields", () => {
    const entry = {
      ...createSearchEntry(),
      internalAdminContact: {
        referentName: "Contact secret",
        email: "clerk-secret@example.com",
        phone: "+33102030405",
      },
      organizerDirectoryId: "clerk-internal-id",
    };

    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("guide tri"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("ile france"))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("clerk secret"))).toBe(false);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery(""))).toBe(true);
    expect(matchesAnnuaireSearch(entry, tokenizeAnnuaireSearchQuery("   "))).toBe(true);
  });
});

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
    expect(getAssociationImpactSummary(entry!)).toBe("Impact mesuré non renseigné");
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
          provenance: { source: "Rapport d'activité vérifié" },
        },
        pastActionsProvenance: { source: "Rapport d'activité vérifié" },
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
    expect(getAssociationImpactSummary(published)).toContain("12 actions mesurées");
    expect(hasTraceableImpactHistory(published)).toBe(true);
    expect(hasTraceablePastActions(published)).toBe(false);
    expect(formatAssociationImpactDate(profile?.impactHistory?.lastActionAt)).toContain(
      "Il y a",
    );
  });

  it("does not infer actions, recurrence or active status from description and updates", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!seed) throw new Error("Expected the editorial seed fixture to exist");

    const published = {
      ...seed,
      provenance: "published_partner" as const,
      verificationStatus: "en_cours" as const,
      qualificationStatus: "contact_non_qualifie" as const,
      availability: "Chaque semaine",
      lastUpdatedAt: new Date().toISOString(),
      description: "Une structure qui mentionne une collecte dans sa présentation.",
      associationProfile: undefined,
    };
    const profile = getAssociationProfile(published);

    expect(profile?.pastActions).toEqual([]);
    expect(profile?.impactHistory).toBeUndefined();
    expect(profile?.structureStatus).toBe("pending");
    expect(getAssociationImpactSummary(published)).toBe("Impact mesuré non renseigné");
    expect(hasTraceableImpactHistory(published)).toBe(false);
  });

  it("keeps explicitly sourced historical activity available", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!seed) throw new Error("Expected the editorial seed fixture to exist");
    const published = {
      ...seed,
      provenance: "published_partner" as const,
      verificationStatus: "verifie" as const,
      qualificationStatus: "partenaire_actif" as const,
      availability: "Chaque semaine",
      lastUpdatedAt: "2026-08-26T10:00:00.000Z",
      associationProfile: {
        ...seed.associationProfile!,
        pastActions: ["Collecte attestée"],
        pastActionsProvenance: { source: "Journal d'action 2026-08" },
        impactHistory: {
          actionCount: 0,
          recurrence: "Aucune récurrence mesurée",
          provenance: { source: "Mesure de référence" },
        },
      },
    };

    expect(getAssociationProfile(published)?.pastActions).toEqual(["Collecte attestée"]);
    expect(hasTraceablePastActions(published)).toBe(true);
    expect(getAssociationImpactSummary(published)).toContain("0 actions mesurées");
  });

  it("does not retain administrative channels in public resources", () => {
    const seed = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-shakirail");
    if (!seed) {
      throw new Error("Expected the editorial seed fixture to exist");
    }

    const published = {
      ...seed,
      provenance: "published_partner" as const,
      verificationStatus: "verifie" as const,
      qualificationStatus: "partenaire_actif" as const,
      availability: "Sur rendez-vous",
      lastUpdatedAt: "2026-08-26T10:00:00.000Z",
      recentActivityAt: "2026-08-26T10:00:00.000Z",
      primaryChannel: {
        platform: "site web" as const,
        label: "Contact administratif",
        url: "mailto:administratif",
      },
      associationProfile: {
        ...seed.associationProfile!,
        usefulResources: [
          {
            label: "Contact administratif",
            description: "Ne doit pas devenir une ressource publique.",
            url: "mailto:administratif",
          },
          {
            label: "Site officiel",
            url: "https://cleanmymap.fr/public",
          },
        ],
      },
    };

    expect(getAssociationProfile(published)?.usefulResources).toEqual([
      {
        label: "Site officiel",
        url: "https://cleanmymap.fr/public",
      },
    ]);
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
    const tchaoMegot = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === "asso-megots-tchaomegot");
    if (!national || !franceCentre || !tchaoMegot) throw new Error("Expected national seed fixtures to exist");

    expect(isNationalAnnuaireEntry(national)).toBe(true);
    expect(hasPreciseAnnuaireCoordinates(national)).toBe(false);
    expect(getAnnuaireDistanceKm(national, 11)).toBeNull();
    expect(formatAnnuaireCoverage(national)).toContain("Portée nationale");
    expect(hasPreciseAnnuaireCoordinates(franceCentre)).toBe(false);

    expect(INITIAL_ANNUAIRE_ENTRIES).toContain(tchaoMegot);
    expect(isNationalAnnuaireEntry(tchaoMegot)).toBe(true);
    expect(hasPreciseAnnuaireCoordinates(tchaoMegot)).toBe(false);
    expect(getAnnuaireDistanceKm(tchaoMegot, 11)).toBeNull();
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
