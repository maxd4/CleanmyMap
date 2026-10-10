import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { InboxItemCard } from "./inbox-item-card";
import { getCreatorInboxCopy } from "./creator-inbox-copy";

const feedbackItem = {
  id: "feedback-feedback-1",
  source: "feedback" as const,
  sourceLabel: "Feedback",
  sourceRecordId: "feedback-1",
  title: "Message title",
  subtitle: "Bug",
  authorName: "Display name",
  authorEmail: null,
  authorRole: "benevole",
  createdAt: "2026-08-27T10:00:00.000Z",
  pagePath: "/feedback",
  status: "new" as const,
  sourceStatus: "open",
  priority: "high" as const,
  context: "Message content",
  details: [{ label: "Source", value: "Feedback" }],
  canDelete: true,
  canReview: false,
  hasReplyTarget: false,
  privateReplyTargetUserId: "user-1",
};

const promotionItem = {
  ...feedbackItem,
  id: "promotion-promotion-1",
  source: "promotion" as const,
  sourceRecordId: "promotion-1",
  title: "Alice · coordinateur",
  subtitle: "benevole",
  authorEmail: "alice@example.com",
  sourceStatus: "pending_owner_review",
  privateReplyTargetUserId: null,
};

const partnerItem = {
  ...feedbackItem,
  id: "partner-partner-1",
  source: "partner" as const,
  sourceRecordId: "partner-1",
  title: "Association locale",
  subtitle: "Association",
  authorEmail: "contact@example.com",
  sourceStatus: "pending_admin_review",
  privateReplyTargetUserId: null,
};

const eventItem = {
  ...feedbackItem,
  id: "event-event-1",
  source: "event" as const,
  sourceRecordId: "event-1",
  title: "Événement local",
  subtitle: "Paris",
  authorEmail: null,
  sourceStatus: "created",
  canDelete: false,
  hasReplyTarget: false,
  privateReplyTargetUserId: null,
};

type InboxCardProps = ComponentProps<typeof InboxItemCard>;

const renderCard = (
  item: InboxCardProps["item"],
  overrides: Partial<InboxCardProps> = {},
) =>
  renderToStaticMarkup(
    <InboxItemCard
      item={item}
      locale="fr"
      copy={getCreatorInboxCopy("fr")}
      copiedKey={null}
      promotionReason=""
      onPromotionReasonChange={vi.fn()}
      partnerReason=""
      onPartnerReasonChange={vi.fn()}
      actionReason="motif valide"
      onActionReasonChange={vi.fn()}
      actionBusy={() => false}
      onCopySummary={vi.fn()}
      onAcceptPromotion={vi.fn()}
      onRejectPromotion={vi.fn()}
      onAcceptPartner={vi.fn()}
      onRejectPartner={vi.fn()}
      onApplyInboxAction={vi.fn()}
      {...overrides}
    />,
  );

describe("InboxItemCard state actions", () => {
  it("offers a private DM link to the canonical feedback author", () => {
    const markup = renderCard(feedbackItem);

    expect(markup).toContain("Répondre en privé");
    expect(markup).toContain("recipientId=user-1");
    expect(markup).toContain("feedbackId=feedback-1");
    expect(markup).not.toContain("Marquer répondu");
  });

  it("disables private reply when the canonical author is unavailable", () => {
    const markup = renderCard({ ...feedbackItem, privateReplyTargetUserId: null });

    expect(markup).toContain("Répondre en privé");
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain("recipientId=");
  });

  it("renders a bounded reason field and disables state actions for a short reason", () => {
    const markup = renderCard(
      { ...feedbackItem, privateReplyTargetUserId: null },
      { actionReason: "non" },
    );

    expect(markup).toContain("Motif de traitement");
    expect(markup).toContain('minLength="5"');
    expect(markup).toContain('maxLength="500"');
    expect((markup.match(/disabled=""/g) ?? []).length).toBe(4);
  });

  it("keeps generic inbox mutations out of legal content notifications", () => {
    const markup = renderCard({
          ...feedbackItem,
          id: "legal-report-1",
          source: "legal_content_report",
          sourceLabel: "Notification de contenu illicite",
          title: "Notification de contenu potentiellement illicite",
          context: "Motif circonstancié",
          canDelete: false,
        },
      { actionReason: "" },
    );

    expect(markup).not.toContain("Motif de traitement");
    expect(markup).not.toContain("Marquer traité");
  });

  it("renders the traceable legal decision controls in the shared inbox", () => {
    const markup = renderCard({
          ...feedbackItem,
          id: "legal-report-2",
          source: "legal_content_report",
          sourceLabel: "Notification de contenu illicite",
          title: "Notification de contenu potentiellement illicite",
          context: "Motif circonstancié",
          canDelete: false,
          canReview: true,
        },
      { actionReason: "", onLegalDecision: vi.fn() },
    );

    expect(markup).toContain("Décision administrative tracée");
    expect(markup).toContain("value=\"reviewing\"");
    expect(markup).toContain("value=\"content_restricted\"");
    expect(markup).toContain("value=\"content_removed\"");
    expect(markup).toContain("Motif de la décision");
    expect(markup).toContain("Fondement légal");
    expect(markup).toContain("Fondement CGU");
    expect(markup).not.toContain("Marquer traité");
    expect(markup).not.toContain("Supprimer");
  });

  it("isolates promotion review actions without changing their availability", () => {
    const markup = renderCard(promotionItem, { promotionReason: "Motif valide" });

    expect(markup).toContain("Motif de décision");
    expect(markup).toContain("Accepter");
    expect(markup).toContain("Refuser");
    expect(markup).toContain("Marquer traité");
    expect(markup).toContain("Marquer répondu");
  });

  it("isolates partner review actions without changing their availability", () => {
    const markup = renderCard(partnerItem, { partnerReason: "Motif valide" });

    expect(markup).toContain("Motif de décision");
    expect(markup).toContain("Accepter");
    expect(markup).toContain("Refuser");
    expect(markup).toContain("Marquer traité");
    expect(markup).toContain("Marquer répondu");
  });

  it("keeps event items contextual-only and without processing actions", () => {
    const markup = renderCard(eventItem);

    expect(markup).toContain("Copier le résumé");
    expect(markup).not.toContain("Motif de traitement");
    expect(markup).not.toContain("Marquer traité");
    expect(markup).not.toContain("Marquer répondu");
  });
});
