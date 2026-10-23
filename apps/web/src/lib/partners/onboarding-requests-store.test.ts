import { describe, expect, it } from "vitest";
import { normalizeStoredPartnerOnboardingRequest } from "./onboarding-requests-store";
import { buildPublishedPartnerAnnuaireEntry } from "./published-annuaire-entries-store";

describe("partner onboarding request store", () => {
  it("re-reads legacy requests and keeps the publication path available", () => {
    const normalized = normalizeStoredPartnerOnboardingRequest({
      id: "req-legacy",
      createdAt: "2026-04-23T09:00:00.000Z",
      submittedByUserId: "user_123",
      status: "pending_admin_review",
      organizationName: "Klin d'oeil",
      organizationType: "commerce",
      partnerScope: "local",
      legalIdentity: "Klin d'oeil SAS",
      coverage: {
        arrondissements: [11, 19, 20],
        quartiers: ["Bas Belleville"],
      },
      contributionTypes: ["accueil", "communication"],
      relayActions: "Diffusion quartier et relais Instagram.",
      availability: {
        slots: [
          {
            day: "sat",
            start: "10:00",
            end: "18:00",
          },
        ],
      },
      contactName: "Contact",
      contactChannel: "Site web",
      contactDetails: "https://klindoeil.com",
      motivation: "Ancrage local et mise en réseau du quartier.",
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.coverage.arrondissements).toEqual([11, 19, 20]);
    expect(normalized?.availability.slots).toHaveLength(1);
    expect(normalized?.creatorState).toBe("new");

    const published = buildPublishedPartnerAnnuaireEntry({
      requestId: normalized?.id ?? "req-legacy",
      request: normalized as NonNullable<typeof normalized>,
    });

    expect(published.source).toBe("partner_onboarding");
    expect(published.publicationStatus).toBe("pending_admin_review");
    expect(published.coveredArrondissements).toEqual([11, 19, 20]);
    expect(published.primaryChannel).toBeUndefined();
  });

  it("publishes only an explicitly authorized public website", () => {
    const published = buildPublishedPartnerAnnuaireEntry({
      requestId: "req-public-site",
      request: {
        organizationName: "Structure test",
        organizationType: "association",
        partnerScope: "national",
        legalIdentity: "Structure Test Association",
        coverage: { arrondissements: [], quartiers: [] },
        contributionTypes: ["communication"],
        relayActions: "Relais locaux.",
        availability: { slots: [] },
        contactName: "Contact privé",
        contactChannel: "Email privé",
        contactDetails: "private@example.org",
        motivation: "Une motivation suffisamment longue pour le test.",
        publicWebsiteUrl: "https://structure.example.test/",
        publicWebsiteConsent: true,
      },
    });

    expect(published.websiteUrl).toBe("https://structure.example.test/");
    expect(published.primaryChannel).toEqual({
      platform: "site web",
      label: "Site web public",
      url: "https://structure.example.test/",
    });
    expect(published.associationProfile?.usefulResources).toContainEqual({
      label: "Site officiel",
      description: "Agenda public et informations utiles.",
      url: "https://structure.example.test/",
    });
    expect(published.primaryChannel?.url).not.toContain("private@example.org");
  });
});
