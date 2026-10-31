"use client";

import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy, CreatorInboxLocale } from "./creator-inbox-copy";
import { InboxItemContextualActions } from "./inbox-item-contextual-actions";
import { FeedbackExportActions } from "./feedback-export-actions";
import type { InboxActionParams, LegalDecisionParams } from "./inbox-item-card.types";
import { InboxItemLegalDecision } from "./inbox-item-legal-decision";
import { InboxItemProcessingActions } from "./inbox-item-processing-actions";
import { InboxItemProcessingReason } from "./inbox-item-processing-reason";
import { InboxItemRequestDetails } from "./inbox-item-request-details";
import { InboxItemReviewActions } from "./inbox-item-review-actions";
import { FeedbackQualificationControls } from "./feedback-qualification-controls";
import { FeedbackTrackingControls } from "./feedback-tracking-controls";
import type { FeedbackTrackingStatus } from "@/lib/community/bug-reports-store";

type InboxItemCardProps = {
  item: CreatorInboxItem;
  locale: CreatorInboxLocale;
  copy: CreatorInboxCopy;
  copiedKey: string | null;
  promotionReason: string;
  onPromotionReasonChange: (reason: string) => void;
  partnerReason: string;
  onPartnerReasonChange: (reason: string) => void;
  associationActionReason?: string;
  onAssociationActionReasonChange?: (reason: string) => void;
  actionReason: string;
  onActionReasonChange: (reason: string) => void;
  actionBusy: (source: CreatorInboxSource, id: string, action: string) => boolean;
  onCopySummary: (item: CreatorInboxItem) => void;
  onAcceptPromotion: (item: CreatorInboxItem) => void;
  onRejectPromotion: (item: CreatorInboxItem) => void;
  onAcceptPartner: (item: CreatorInboxItem) => void;
  onRejectPartner: (item: CreatorInboxItem) => void;
  onAcceptAssociationAction?: (item: CreatorInboxItem) => void;
  onRejectAssociationAction?: (item: CreatorInboxItem) => void;
  onRetryAssociationActionAnnouncement?: (item: CreatorInboxItem) => void;
  onApplyInboxAction: (params: InboxActionParams) => void;
  onLegalDecision?: (params: LegalDecisionParams) => void;
  canQualify?: boolean;
  feedbackOptions?: CreatorInboxItem[];
  onQualifyFeedback?: (params: {
    decision: "pending" | "needs_info" | "accepted" | "duplicate" | "rejected";
    reason: string;
    duplicateFeedbackId: string | null;
  }) => void;
  onUpdateFeedbackTracking?: (params: {
    status: FeedbackTrackingStatus;
    publicSummary: string | null;
    reference: string | null;
    shippedOn: string | null;
  }) => void;
};

function InboxFeedbackControls({ item, locale, copy, qualificationEnabled, qualificationOptions, actionBusy, qualify, updateTracking }: { item: CreatorInboxItem; locale: CreatorInboxLocale; copy: CreatorInboxCopy; qualificationEnabled: boolean; qualificationOptions: CreatorInboxItem[]; actionBusy: InboxItemCardProps["actionBusy"]; qualify: NonNullable<InboxItemCardProps["onQualifyFeedback"]>; updateTracking: NonNullable<InboxItemCardProps["onUpdateFeedbackTracking"]> }) {
  if (item.source !== "feedback" || !qualificationEnabled) return null;
  return <>
    <FeedbackQualificationControls item={item} feedbackOptions={qualificationOptions} locale={locale} copy={copy} busy={actionBusy(item.source, item.sourceRecordId, "qualify")} onQualify={qualify} />
    <FeedbackTrackingControls key={`${item.id}:${item.tracking?.updatedAt ?? "initial"}`} item={item} locale={locale} busy={actionBusy(item.source, item.sourceRecordId, "update_tracking")} onUpdate={updateTracking} />
  </>;
}

export function InboxItemCard({
  item,
  locale,
  copy,
  copiedKey,
  promotionReason,
  onPromotionReasonChange,
  partnerReason,
  onPartnerReasonChange,
  associationActionReason = "",
  onAssociationActionReasonChange = () => undefined,
  actionReason,
  onActionReasonChange,
  actionBusy,
  onCopySummary,
  onAcceptPromotion,
  onRejectPromotion,
  onAcceptPartner,
  onRejectPartner,
  onAcceptAssociationAction = () => undefined,
  onRejectAssociationAction = () => undefined,
  onRetryAssociationActionAnnouncement = () => undefined,
  onApplyInboxAction,
  onLegalDecision,
  canQualify,
  feedbackOptions,
  onQualifyFeedback,
  onUpdateFeedbackTracking,
}: InboxItemCardProps) {
  const qualificationEnabled = canQualify ?? false;
  const qualificationOptions = feedbackOptions ?? [];
  const qualify = onQualifyFeedback ?? (() => undefined);
  const updateTracking = onUpdateFeedbackTracking ?? (() => undefined);
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <InboxItemRequestDetails item={item} locale={locale} copy={copy} />

      {item.source === "feedback" ? <FeedbackExportActions item={item} locale={locale} /> : null}
      <InboxFeedbackControls item={item} locale={locale} copy={copy} qualificationEnabled={qualificationEnabled} qualificationOptions={qualificationOptions} actionBusy={actionBusy} qualify={qualify} updateTracking={updateTracking} />

      <InboxItemCardActions
        item={item}
        locale={locale}
        copy={copy}
        copiedKey={copiedKey}
        promotionReason={promotionReason}
        onPromotionReasonChange={onPromotionReasonChange}
        partnerReason={partnerReason}
        onPartnerReasonChange={onPartnerReasonChange}
        associationActionReason={associationActionReason}
        onAssociationActionReasonChange={onAssociationActionReasonChange}
        actionReason={actionReason}
        onActionReasonChange={onActionReasonChange}
        actionBusy={actionBusy}
        onCopySummary={onCopySummary}
        onAcceptPromotion={onAcceptPromotion}
        onRejectPromotion={onRejectPromotion}
        onAcceptPartner={onAcceptPartner}
        onRejectPartner={onRejectPartner}
        onAcceptAssociationAction={onAcceptAssociationAction}
        onRejectAssociationAction={onRejectAssociationAction}
        onRetryAssociationActionAnnouncement={onRetryAssociationActionAnnouncement}
        onApplyInboxAction={onApplyInboxAction}
        onLegalDecision={onLegalDecision}
      />
    </article>
  );
}

type InboxItemCardActionsProps = Omit<InboxItemCardProps, "canQualify" | "feedbackOptions" | "onQualifyFeedback" | "onUpdateFeedbackTracking">;

function InboxItemWorkflowActions(props: InboxItemCardActionsProps) {
  const { item, locale, copy, actionReason, actionBusy, promotionReason, onPromotionReasonChange, partnerReason, onPartnerReasonChange, associationActionReason = "", onAssociationActionReasonChange = () => undefined, onAcceptPromotion, onRejectPromotion, onAcceptPartner, onRejectPartner, onAcceptAssociationAction = () => undefined, onRejectAssociationAction = () => undefined, onRetryAssociationActionAnnouncement = () => undefined, onApplyInboxAction } = props;
  return <>
    {item.source === "promotion" && item.sourceStatus === "pending_owner_review" ? <InboxItemReviewActions item={item} locale={locale} copy={copy} reason={promotionReason} onReasonChange={onPromotionReasonChange} actionBusy={actionBusy} onAccept={onAcceptPromotion} onReject={onRejectPromotion} /> : null}
    {item.source === "partner" && item.sourceStatus === "pending_admin_review" ? <InboxItemReviewActions item={item} locale={locale} copy={copy} reason={partnerReason} onReasonChange={onPartnerReasonChange} actionBusy={actionBusy} onAccept={onAcceptPartner} onReject={onRejectPartner} /> : null}
    {item.source === "association_action" && item.sourceStatus === "pending_review" ? <InboxItemReviewActions item={item} locale={locale} copy={copy} reason={associationActionReason} onReasonChange={onAssociationActionReasonChange} actionBusy={actionBusy} onAccept={onAcceptAssociationAction} onReject={onRejectAssociationAction} /> : null}
    {item.source === "association_action" && item.sourceStatus === "approved" ? <button type="button" className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50" disabled={actionBusy(item.source, item.sourceRecordId, "retry_announcement")} onClick={() => onRetryAssociationActionAnnouncement(item)}>{actionBusy(item.source, item.sourceRecordId, "retry_announcement") ? "Relance…" : "Relancer la diffusion"}</button> : null}
    {item.source !== "event" && item.source !== "legal_content_report" && item.source !== "association_action" ? <InboxItemProcessingActions item={item} copy={copy} actionReason={actionReason} actionBusy={actionBusy} onApplyInboxAction={onApplyInboxAction} /> : null}
  </>;
}

function InboxItemCardActions({
  item,
  locale,
  copy,
  copiedKey,
  promotionReason,
  onPromotionReasonChange,
  partnerReason,
  onPartnerReasonChange,
  associationActionReason = "",
  onAssociationActionReasonChange = () => undefined,
  actionReason,
  onActionReasonChange,
  actionBusy,
  onCopySummary,
  onAcceptPromotion,
  onRejectPromotion,
  onAcceptPartner,
  onRejectPartner,
  onAcceptAssociationAction = () => undefined,
  onRejectAssociationAction = () => undefined,
  onRetryAssociationActionAnnouncement = () => undefined,
  onApplyInboxAction,
  onLegalDecision,
}: InboxItemCardActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {item.source === "legal_content_report" && onLegalDecision ? <InboxItemLegalDecision item={item} actionBusy={actionBusy} onLegalDecision={onLegalDecision} /> : null}
      <InboxItemContextualActions item={item} copy={copy} copiedKey={copiedKey} onCopySummary={onCopySummary} />
      {item.source !== "event" && item.source !== "legal_content_report" && item.source !== "association_action" ? <InboxItemProcessingReason locale={locale} actionReason={actionReason} onActionReasonChange={onActionReasonChange} /> : null}
      <InboxItemWorkflowActions {...{ item, locale, copy, copiedKey, onActionReasonChange, onCopySummary, actionReason, actionBusy, promotionReason, onPromotionReasonChange, partnerReason, onPartnerReasonChange, associationActionReason, onAssociationActionReasonChange, onAcceptPromotion, onRejectPromotion, onAcceptPartner, onRejectPartner, onAcceptAssociationAction, onRejectAssociationAction, onRetryAssociationActionAnnouncement, onApplyInboxAction }} />
    </div>
  );
}
