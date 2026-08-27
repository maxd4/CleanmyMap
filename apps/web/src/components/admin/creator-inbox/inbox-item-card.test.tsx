import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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
};

describe("InboxItemCard state actions", () => {
  it("renders a bounded reason field and disables state actions for a short reason", () => {
    const markup = renderToStaticMarkup(
      <InboxItemCard
        item={feedbackItem}
        locale="fr"
        copy={getCreatorInboxCopy("fr")}
        copiedKey={null}
        promotionReason=""
        onPromotionReasonChange={vi.fn()}
        partnerReason=""
        onPartnerReasonChange={vi.fn()}
        actionReason="non"
        onActionReasonChange={vi.fn()}
        actionBusy={() => false}
        onCopySummary={vi.fn()}
        onAcceptPromotion={vi.fn()}
        onRejectPromotion={vi.fn()}
        onAcceptPartner={vi.fn()}
        onRejectPartner={vi.fn()}
        onApplyInboxAction={vi.fn()}
      />,
    );

    expect(markup).toContain("Motif de traitement");
    expect(markup).toContain('minLength="5"');
    expect(markup).toContain('maxLength="500"');
    expect((markup.match(/disabled=""/g) ?? []).length).toBe(4);
  });

  it("keeps generic inbox mutations out of legal content notifications", () => {
    const markup = renderToStaticMarkup(
      <InboxItemCard
        item={{
          ...feedbackItem,
          id: "legal-report-1",
          source: "legal_content_report",
          sourceLabel: "Notification de contenu illicite",
          title: "Notification de contenu potentiellement illicite",
          context: "Motif circonstancié",
          canDelete: false,
        }}
        locale="fr"
        copy={getCreatorInboxCopy("fr")}
        copiedKey={null}
        promotionReason=""
        onPromotionReasonChange={vi.fn()}
        partnerReason=""
        onPartnerReasonChange={vi.fn()}
        actionReason=""
        onActionReasonChange={vi.fn()}
        actionBusy={() => false}
        onCopySummary={vi.fn()}
        onAcceptPromotion={vi.fn()}
        onRejectPromotion={vi.fn()}
        onAcceptPartner={vi.fn()}
        onRejectPartner={vi.fn()}
        onApplyInboxAction={vi.fn()}
      />,
    );

    expect(markup).not.toContain("Motif de traitement");
    expect(markup).not.toContain("Marquer traité");
  });

  it("renders the traceable legal decision controls in the shared inbox", () => {
    const markup = renderToStaticMarkup(
      <InboxItemCard
        item={{
          ...feedbackItem,
          id: "legal-report-2",
          source: "legal_content_report",
          sourceLabel: "Notification de contenu illicite",
          title: "Notification de contenu potentiellement illicite",
          context: "Motif circonstancié",
          canDelete: false,
          canReview: true,
        }}
        locale="fr"
        copy={getCreatorInboxCopy("fr")}
        copiedKey={null}
        promotionReason=""
        onPromotionReasonChange={vi.fn()}
        partnerReason=""
        onPartnerReasonChange={vi.fn()}
        actionReason=""
        onActionReasonChange={vi.fn()}
        actionBusy={() => false}
        onCopySummary={vi.fn()}
        onAcceptPromotion={vi.fn()}
        onRejectPromotion={vi.fn()}
        onAcceptPartner={vi.fn()}
        onRejectPartner={vi.fn()}
        onApplyInboxAction={vi.fn()}
        onLegalDecision={vi.fn()}
      />,
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
});
