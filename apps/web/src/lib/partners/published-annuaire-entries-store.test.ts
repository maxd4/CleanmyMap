import { describe, expect, it } from "vitest";
import { buildPublishedPartnerAnnuaireEntry } from "./published-annuaire-entries-store";
import { isPlaceholderUrl } from "./onboarding-types";

describe("buildPublishedPartnerAnnuaireEntry", () => {
  it("promotes an onboarding request into a published annuaire entry", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-123",
      request: {
        organizationName: "Bas Belleville Atelier",
        organizationType: "commerce",
        legalIdentity: "Bas Belleville Atelier SAS",
        coverage: {
          arrondissements: [10, 11, 18],
          quartiers: ["Bas Belleville"],
        },
        contributionTypes: ["accueil", "communication"],
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
      publicationStatus: "pending_admin_review",
      name: "Bas Belleville Atelier",
      legalIdentity: "Bas Belleville Atelier SAS",
      kind: "commerce",
      verificationStatus: "en_cours",
      qualificationStatus: "contact_non_qualifie",
      coveredArrondissements: [10, 11, 18],
      availability: "Mardi 10:00-18:00 · Sur rendez-vous",
      primaryChannel: {
        platform: "site web",
        label: "Email",
        url: "mailto:contact@basbelleville.fr",
      },
    });
    expect(entry.id).toMatch(/^onboarded-/);
    expect(entry.lat).toBeGreaterThan(48.8);
    expect(entry.lng).toBeGreaterThan(2.3);
  });

  it("drops placeholder public channels", () => {
    const entry = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-456",
      request: {
        organizationName: "Partner Test",
        organizationType: "commerce",
        legalIdentity: "Partner Test SAS",
        coverage: {
          arrondissements: [11],
          quartiers: [],
        },
        contributionTypes: ["accueil"],
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
});
