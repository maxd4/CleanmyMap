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
      legalIdentity: "Klin d'oeil SAS",
      coverage: {
        arrondissements: [11, 19, 20],
        quartiers: ["Bas Belleville"],
      },
      contributionTypes: ["accueil", "communication"],
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

    const published = buildPublishedPartnerAnnuaireEntry({
      requestId: normalized?.id ?? "req-legacy",
      request: normalized as NonNullable<typeof normalized>,
    });

    expect(published.source).toBe("partner_onboarding");
    expect(published.publicationStatus).toBe("pending_admin_review");
    expect(published.coveredArrondissements).toEqual([11, 19, 20]);
    expect(published.primaryChannel).toBeDefined();
  });
});
