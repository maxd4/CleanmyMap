import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildPromotionReviewPayload,
  PromotionRequestsPanel,
} from "./promotion-requests-panel";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

const pendingRequest = {
  id: "promotion-1",
  createdAt: "2026-08-26T10:00:00.000Z",
  submittedByUserId: "target-user-1",
  submittedByDisplayName: "Demandeur",
  submittedByEmail: null,
  submittedByRole: "benevole" as const,
  requestedRole: "admin" as const,
  motivation: "Motivation de la demande",
  status: "pending_owner_review" as const,
  reviewedAt: null,
  reviewedByUserId: null,
  reviewedByRole: null,
  creatorState: "pending" as const,
};

describe("PromotionRequestsPanel", () => {
  it("renders a required reason field and disables both decisions initially", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PromotionRequestsPanel, { initialItems: [pendingRequest] }),
    );

    expect(markup).toContain("Motif de décision");
    expect(markup).toContain('minLength="5"');
    expect(markup).toContain('maxLength="500"');
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
  });

  it("builds the API payload with a trimmed reason", () => {
    expect(
      buildPromotionReviewPayload({
        requestId: "promotion-1",
        action: "accept",
        reason: "  Motif validé  ",
      }),
    ).toEqual({
      requestId: "promotion-1",
      action: "accept",
      reason: "Motif validé",
    });
  });
});
