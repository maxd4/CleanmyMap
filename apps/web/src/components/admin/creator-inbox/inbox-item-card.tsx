"use client";

import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy, CreatorInboxLocale } from "./creator-inbox-copy";
import { InboxItemContextualActions } from "./inbox-item-contextual-actions";
import type { InboxActionParams, LegalDecisionParams } from "./inbox-item-card.types";
import { InboxItemLegalDecision } from "./inbox-item-legal-decision";
import { InboxItemProcessingActions } from "./inbox-item-processing-actions";
import { InboxItemProcessingReason } from "./inbox-item-processing-reason";
import { InboxItemRequestDetails } from "./inbox-item-request-details";
import { InboxItemReviewActions } from "./inbox-item-review-actions";

type InboxItemCardProps = {
  item: CreatorInboxItem;
  locale: CreatorInboxLocale;
  copy: CreatorInboxCopy;
  copiedKey: string | null;
  promotionReason: string;
  onPromotionReasonChange: (reason: string) => void;
  partnerReason: string;
  onPartnerReasonChange: (reason: string) => void;
  actionReason: string;
  onActionReasonChange: (reason: string) => void;
  actionBusy: (source: CreatorInboxSource, id: string, action: string) => boolean;
  onCopySummary: (item: CreatorInboxItem) => void;
  onAcceptPromotion: (item: CreatorInboxItem) => void;
  onRejectPromotion: (item: CreatorInboxItem) => void;
  onAcceptPartner: (item: CreatorInboxItem) => void;
  onRejectPartner: (item: CreatorInboxItem) => void;
  onApplyInboxAction: (params: InboxActionParams) => void;
  onLegalDecision?: (params: LegalDecisionParams) => void;
};

export function InboxItemCard({
  item,
  locale,
  copy,
  copiedKey,
  promotionReason,
  onPromotionReasonChange,
  partnerReason,
  onPartnerReasonChange,
  actionReason,
  onActionReasonChange,
  actionBusy,
  onCopySummary,
  onAcceptPromotion,
  onRejectPromotion,
  onAcceptPartner,
  onRejectPartner,
  onApplyInboxAction,
  onLegalDecision,
}: InboxItemCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <InboxItemRequestDetails item={item} locale={locale} copy={copy} />

      <div className="mt-4 flex flex-wrap gap-2">
        {item.source === "legal_content_report" && onLegalDecision ? (
          <InboxItemLegalDecision
            item={item}
            actionBusy={actionBusy}
            onLegalDecision={onLegalDecision}
          />
        ) : null}

        <InboxItemContextualActions
          item={item}
          copy={copy}
          copiedKey={copiedKey}
          onCopySummary={onCopySummary}
        />

        {item.source !== "event" && item.source !== "legal_content_report" ? (
          <InboxItemProcessingReason
            locale={locale}
            actionReason={actionReason}
            onActionReasonChange={onActionReasonChange}
          />
        ) : null}

        {item.source === "promotion" && item.sourceStatus === "pending_owner_review" ? (
          <InboxItemReviewActions
            item={item}
            locale={locale}
            copy={copy}
            reason={promotionReason}
            onReasonChange={onPromotionReasonChange}
            actionBusy={actionBusy}
            onAccept={onAcceptPromotion}
            onReject={onRejectPromotion}
          />
        ) : null}

        {item.source === "partner" && item.sourceStatus === "pending_admin_review" ? (
          <InboxItemReviewActions
            item={item}
            locale={locale}
            copy={copy}
            reason={partnerReason}
            onReasonChange={onPartnerReasonChange}
            actionBusy={actionBusy}
            onAccept={onAcceptPartner}
            onReject={onRejectPartner}
          />
        ) : null}

        {item.source !== "event" && item.source !== "legal_content_report" ? (
          <InboxItemProcessingActions
            item={item}
            copy={copy}
            actionReason={actionReason}
            actionBusy={actionBusy}
            onApplyInboxAction={onApplyInboxAction}
          />
        ) : null}
      </div>
    </article>
  );
}
