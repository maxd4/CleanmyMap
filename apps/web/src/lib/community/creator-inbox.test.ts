import { describe, expect, it } from "vitest";
import {
  buildPromotionInboxItem,
  formatCreatorInboxStatusLabel,
  summarizeCreatorInboxItem,
} from "./creator-inbox";

describe("creator inbox helpers", () => {
  it("maps creator state onto a promotion request item", () => {
    const item = buildPromotionInboxItem({
      id: "promo-1",
      createdAt: "2026-04-30T09:00:00.000Z",
      submittedByUserId: "user_1",
      submittedByDisplayName: "Alice",
      submittedByEmail: "alice@example.com",
      submittedByRole: "coordinateur",
      requestedRole: "elu",
      motivation: "Besoin d'accès au pilotage local.",
      status: "pending_owner_review",
      reviewedAt: null,
      reviewedByUserId: null,
      reviewedByRole: null,
      creatorState: "responded",
    });

    expect(item.status).toBe("responded");
    expect(formatCreatorInboxStatusLabel(item.status, "fr")).toBe("Répondu");
    expect(summarizeCreatorInboxItem(item, "fr")).toContain("Alice");
  });
});
