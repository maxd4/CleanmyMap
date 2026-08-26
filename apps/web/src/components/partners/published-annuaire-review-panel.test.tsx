import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildPublishedAnnuaireReviewPayload,
  PublishedAnnuaireReviewPanel,
} from "./published-annuaire-review-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

const pendingEntry = {
  id: "onboarded-1",
  sourceRequestId: "request-1",
  publishedAt: "2026-08-26T10:00:00.000Z",
  publicationStatus: "pending_admin_review" as const,
  source: "partner_onboarding" as const,
  name: "Partner record",
  legalIdentity: "Partner legal identity",
  kind: "association" as const,
  scope: "national" as const,
  types: ["social" as const],
  description: "Public description",
  location: "France",
  lat: 46.6,
  lng: 1.88,
  coveredArrondissements: [],
  contributionTypes: ["communication" as const],
  availability: "Ponctuelle",
  verificationStatus: "en_cours" as const,
  qualificationStatus: "contact_non_qualifie" as const,
  lastUpdatedAt: "2026-08-26T10:00:00.000Z",
  recentActivityAt: "2026-08-26T10:00:00.000Z",
};

describe("PublishedAnnuaireReviewPanel", () => {
  it("trims and transmits the decision reason in the review payload", () => {
    expect(
      buildPublishedAnnuaireReviewPayload({
        id: "onboarded-1",
        publicationStatus: "accepted",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "  Motif valide  ",
      }),
    ).toEqual({
      id: "onboarded-1",
      publicationStatus: "accepted",
      confirmPhrase: "CONFIRMER PARTENAIRE",
      reason: "Motif valide",
    });
  });

  it("renders a reason field and disabled decision buttons before both inputs are valid", () => {
    const markup = renderToStaticMarkup(
      <PublishedAnnuaireReviewPanel items={[pendingEntry]} />,
    );

    expect(markup).toContain("Motif de décision");
    expect(markup).toContain('minLength="5"');
    expect(markup).toContain('maxLength="500"');
    expect(markup).toContain('placeholder="CONFIRMER PARTENAIRE"');
    expect((markup.match(/disabled=""/g) ?? []).length).toBe(2);
  });
});
