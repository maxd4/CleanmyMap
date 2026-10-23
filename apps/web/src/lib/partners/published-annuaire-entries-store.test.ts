import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildPublishedPartnerAnnuaireEntry, normalizePublishedRecord } from "./published-annuaire-entries-store";
import { isPlaceholderUrl } from "./onboarding-types";

describe("buildPublishedPartnerAnnuaireEntry", () => {
  it("keeps EngagementType internal while retaining the public entry contract", () => {
    const source = readFileSync(new URL("./annuaire-types.ts", import.meta.url), "utf8");

    expect(source).toContain("types: EngagementType[]");
    expect(source).toContain("export type AnnuaireEntry");
    expect(source).not.toContain("export type EngagementType");
  });

  it("promotes an onboarding request into a published annuaire entry", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-123",
      request: {
        organizationName: "Bas Belleville Atelier",
        organizationType: "commerce",
        partnerScope: "local",
        legalIdentity: "Bas Belleville Atelier SAS",
        coverage: {
          arrondissements: [10, 11, 18],
          quartiers: ["Bas Belleville"],
        },
        contributionTypes: ["accueil", "communication"],
        relayActions: "Diffusion de quartier et relais commerçant.",
        availability: {
          slots: [
            {
              day: "tue",
              start: "10:00",
              end: "18:00",
            },
          ],
          note: "Sur rendez-vous",
        },
        contactName: "Marie Dupont",
        contactChannel: "Email",
        contactDetails: "contact@basbelleville.fr",
        motivation: "Valoriser le quartier avec une vitrine locale utile.",
      },
    });

    expect(entry).toMatchObject({
      sourceRequestId: "req-123",
      source: "partner_onboarding",
      provenance: "published_partner",
      publicationStatus: "pending_admin_review",
      name: "Bas Belleville Atelier",
      legalIdentity: "Bas Belleville Atelier SAS",
      kind: "commerce",
      verificationStatus: "en_cours",
      qualificationStatus: "contact_non_qualifie",
      coveredArrondissements: [10, 11, 18],
      availability: "Mardi 10:00-18:00 · Sur rendez-vous",
      primaryChannel: undefined,
      websiteUrl: undefined,
    });
    expect(entry.id).toMatch(/^onboarded-/);
    expect(entry.lat).toBeNull();
    expect(entry.lng).toBeNull();
    expect(entry.coordinatesSource).toBe("derived_coverage");
  });

  it("drops placeholder public channels", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-456",
      request: {
        organizationName: "Partner Test",
        organizationType: "commerce",
        partnerScope: "local",
        legalIdentity: "Partner Test SAS",
        coverage: {
          arrondissements: [11],
          quartiers: [],
        },
        contributionTypes: ["accueil"],
        relayActions: "",
        availability: {
          slots: [
            {
              day: "wed",
              start: "10:00",
              end: "12:00",
            },
          ],
        },
        contactName: "Test",
        contactChannel: "Site web",
        contactDetails: "https://example.com/partner-test",
        motivation: "Tester le flux.",
      },
    });

    expect(isPlaceholderUrl("https://example.com/partner-test")).toBe(true);
    expect(entry.primaryChannel).toBeUndefined();
    expect(entry.websiteUrl).toBeUndefined();
  });

  it("keeps national partners out of the Paris arrondissement logic", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-789",
      request: {
        organizationName: "Gestes Propres",
        organizationType: "association",
        partnerScope: "national",
        legalIdentity: "Gestes Propres",
        coverage: {
          arrondissements: [],
          quartiers: [],
        },
        contributionTypes: ["communication", "logistique"],
        relayActions: "Diffusion nationale et relais d'antennes locales.",
        availability: {
          slots: [
            {
              day: "mon",
              start: "09:00",
              end: "17:00",
            },
          ],
        },
        contactName: "Coordination nationale",
        contactChannel: "Site web",
        contactDetails: "https://gestespropres.org",
        motivation: "Association nationale de référence pour les relais terrain.",
      },
    });

    expect(entry.location).toBe("Association nationale");
    expect(entry.coveredArrondissements).toEqual([]);
    expect(entry.lat).toBeNull();
    expect(entry.lng).toBeNull();
  });

  it("adds an association profile for association requests", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-999",
      request: {
        organizationName: "Collectif Quartier Solidaire",
        organizationType: "association",
        partnerScope: "local",
        legalIdentity: "Collectif Quartier Solidaire",
        coverage: {
          arrondissements: [11, 12],
          quartiers: ["Nation"],
        },
        contributionTypes: ["materiel", "communication", "logistique"],
        relayActions: "Relais de communication et coordination locale.",
        availability: {
          slots: [
            {
              day: "thu",
              start: "09:00",
              end: "17:00",
            },
          ],
        },
        contactName: "Alex Martin",
        contactChannel: "Site web",
        contactDetails: "https://quartiersolidaire.fr",
        motivation: "Ancrer un point de coordination utile au quartier.",
      },
    });

    expect(entry.associationProfile).toMatchObject({
      structureStatus: "pending",
      recurringNeeds: [
        "Matériel",
        "Relais de communication",
        "Bénévoles logistiques",
      ],
    });
    expect(entry.associationProfile?.pastActions).toEqual([]);
    expect(entry.associationProfile?.impactHistory).toBeUndefined();
    expect(entry.recentActivityAt).toBeUndefined();
    expect(entry.associationProfile?.publicCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "materiel",
          label: "Appel à matériel",
        }),
        expect.objectContaining({
          type: "communication",
          label: "Relais de communication",
        }),
      ]),
    );
    expect(entry.associationProfile?.usefulResources).toEqual([]);
  });

  it("does not turn a new request into activity evidence", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-no-activity",
      request: {
        organizationName: "Collectif sans historique",
        organizationType: "association",
        partnerScope: "local",
        legalIdentity: "Collectif sans historique",
        coverage: { arrondissements: [11], quartiers: [] },
        contributionTypes: ["communication"],
        relayActions: "",
        availability: { slots: [{ day: "mon", start: "09:00", end: "12:00" }] },
        contactName: "Contact",
        contactChannel: "Email",
        contactDetails: "coordination-non-communique",
        motivation: "Une demande de référencement sans action attestée.",
      },
    });

    expect(entry.lastUpdatedAt).toBeDefined();
    expect(entry.recentActivityAt).toBeUndefined();
    expect(entry.associationProfile?.impactHistory).toBeUndefined();
  });

  it("removes only the legacy generated activity projection when its marker is explicit", () => {
    const normalized = normalizePublishedRecord({
      id: "legacy-entry",
      sourceRequestId: "req-legacy",
      source: "partner_onboarding",
      publishedAt: "2026-10-22T00:00:00.000Z",
      publicationStatus: "accepted",
      name: "Legacy association",
      legalIdentity: "Legacy association",
      kind: "association",
      types: ["social"],
      description: "Description",
      location: "Paris",
      lat: null,
      lng: null,
      coveredArrondissements: [],
      contributionTypes: ["communication"],
      availability: "Chaque semaine",
      verificationStatus: "verifie",
      qualificationStatus: "partenaire_actif",
      lastUpdatedAt: "2026-10-22T00:00:00.000Z",
      recentActivityAt: "2026-10-22T00:00:00.000Z",
      associationProfile: {
        mission: "Mission",
        recurringNeeds: [],
        pastActions: [],
        usefulResources: [],
        publicCalls: [],
        impactHistory: {
          zonesCovered: 0,
          recurrence: "Chaque semaine",
          lastActionAt: "2026-10-22T00:00:00.000Z",
          note: "Historique d'impact à compléter après validation.",
        },
      },
    });

    expect(normalized.recentActivityAt).toBeUndefined();
    expect(normalized.associationProfile?.impactHistory).toBeUndefined();
    expect(normalized.lastUpdatedAt).toBe("2026-10-22T00:00:00.000Z");
  });

  it("never projects an administrative phone number as a public channel or resource", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-private-phone",
      request: {
        organizationName: "Structure de test",
        organizationType: "association",
        partnerScope: "local",
        legalIdentity: "Structure de test",
        coverage: { arrondissements: [11], quartiers: [] },
        contributionTypes: ["accueil"],
        relayActions: "",
        availability: { slots: [{ day: "mon", start: "09:00", end: "12:00" }] },
        contactName: "Contact administratif",
        contactChannel: "Téléphone",
        contactDetails: "+33123456789",
        motivation: "Proposer un relais de proximité vérifiable.",
      },
    });

    expect(entry.primaryChannel).toBeUndefined();
    expect(entry.websiteUrl).toBeUndefined();
    expect(entry.associationProfile?.usefulResources).toEqual([]);
    expect(entry.internalAdminContact?.phone).toBe("+33123456789");
  });
});
