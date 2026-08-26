"use client";

import { formatCreatorInboxSourceLabel, formatCreatorInboxStatusLabel, type CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy, CreatorInboxLocale } from "./creator-inbox-copy";
import type { CreatorInboxSource } from "@/lib/community/creator-inbox";

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
  onApplyInboxAction: (params: {
    source: CreatorInboxSource;
    itemId: string;
    action: "mark_treated" | "responded" | "archive" | "delete";
    reason: string;
  }) => void;
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
}: InboxItemCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cmm-text-small font-semibold cmm-text-primary">{item.title}</p>
          <p className="mt-1 cmm-text-caption cmm-text-muted">
            {item.authorName}
            {item.authorEmail ? ` · ${item.authorEmail}` : ""}
            {item.subtitle ? ` · ${item.subtitle}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-slate-600">
            {formatCreatorInboxStatusLabel(item.status, locale)}
          </span>
          <span className="cmm-text-caption cmm-text-muted">
            {formatCreatorInboxSourceLabel(item.source, locale)}
          </span>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap cmm-text-small cmm-text-secondary">
        {item.context}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {item.details.map((detail) => (
          <div
            key={`${item.id}-${detail.label}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
              {detail.label}
            </p>
            <p className="mt-1 cmm-text-caption cmm-text-secondary">{detail.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption cmm-text-muted">
        <span>{new Date(item.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</span>
        <span>·</span>
        <span>{item.pagePath ?? copy.states.pageNotProvided}</span>
        <span>·</span>
        <span>{item.priority === "high" ? copy.states.highPriority : copy.states.normalPriority}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.hasReplyTarget && item.authorEmail ? (
          <a
            href={`mailto:${item.authorEmail}?subject=${encodeURIComponent(`Re: ${item.title}`)}`}
            className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700"
          >
            {copy.states.replyByEmail}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onCopySummary(item)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
        >
          {copiedKey === item.id ? copy.states.copied : copy.states.copySummary}
        </button>

        {item.source !== "event" ? (
          <label className="mt-2 basis-full space-y-1">
            <span className="cmm-text-caption font-semibold cmm-text-secondary">
              {locale === "fr" ? "Motif de traitement" : "Processing reason"}
            </span>
            <textarea
              value={actionReason}
              onChange={(event) => onActionReasonChange(event.target.value)}
              minLength={5}
              maxLength={500}
              rows={2}
              placeholder={
                locale === "fr"
                  ? "Expliquez le traitement (5 à 500 caractères)..."
                  : "Explain the processing (5 to 500 characters)..."
              }
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
            />
            <span className="cmm-text-caption cmm-text-muted">
              {actionReason.trim().length}/500
            </span>
          </label>
        ) : null}

        {item.source === "promotion" && item.sourceStatus === "pending_owner_review" ? (
          <>
            <label className="mt-2 basis-full space-y-1">
              <span className="cmm-text-caption font-semibold cmm-text-secondary">
                {locale === "fr" ? "Motif de décision" : "Decision reason"}
              </span>
              <textarea
                value={promotionReason}
                onChange={(event) => onPromotionReasonChange(event.target.value)}
                minLength={5}
                maxLength={500}
                rows={2}
                placeholder={
                  locale === "fr"
                    ? "Expliquez la décision (5 à 500 caractères)..."
                    : "Explain the decision (5 to 500 characters)..."
                }
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
              />
              <span className="cmm-text-caption cmm-text-muted">
                {promotionReason.trim().length}/500
              </span>
            </label>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "accept") ||
                promotionReason.trim().length < 5
              }
              onClick={() => onAcceptPromotion(item)}
              className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "accept")
                ? copy.states.approving
                : copy.states.approve}
            </button>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "reject") ||
                promotionReason.trim().length < 5
              }
              onClick={() => onRejectPromotion(item)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "reject")
                ? copy.states.processing
                : copy.states.reject}
            </button>
          </>
        ) : null}

        {item.source === "partner" && item.sourceStatus === "pending_admin_review" ? (
          <>
            <label className="mt-2 basis-full space-y-1">
              <span className="cmm-text-caption font-semibold cmm-text-secondary">
                {locale === "fr" ? "Motif de décision" : "Decision reason"}
              </span>
              <textarea
                value={partnerReason}
                onChange={(event) => onPartnerReasonChange(event.target.value)}
                minLength={5}
                maxLength={500}
                rows={2}
                placeholder={
                  locale === "fr"
                    ? "Expliquez la décision (5 à 500 caractères)..."
                    : "Explain the decision (5 to 500 characters)..."
                }
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
              />
              <span className="cmm-text-caption cmm-text-muted">
                {partnerReason.trim().length}/500
              </span>
            </label>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "accept") ||
                partnerReason.trim().length < 5
              }
              onClick={() => onAcceptPartner(item)}
              className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "accept")
                ? copy.states.approving
                : copy.states.approve}
            </button>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "reject") ||
                partnerReason.trim().length < 5
              }
              onClick={() => onRejectPartner(item)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "reject")
                ? copy.states.processing
                : copy.states.reject}
            </button>
          </>
        ) : null}

        {item.source !== "event" ? (
          <>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "mark_treated") ||
                actionReason.trim().length < 5
              }
              onClick={() =>
                onApplyInboxAction({
                  source: item.source,
                  itemId: item.sourceRecordId,
                  action: "mark_treated",
                  reason: actionReason,
                })
              }
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "mark_treated")
                ? copy.states.processing
                : copy.states.markTreated}
            </button>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "responded") ||
                actionReason.trim().length < 5
              }
              onClick={() =>
                onApplyInboxAction({
                  source: item.source,
                  itemId: item.sourceRecordId,
                  action: "responded",
                  reason: actionReason,
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "responded")
                ? copy.states.processing
                : copy.states.markResponded}
            </button>
            <button
              type="button"
              disabled={
                actionBusy(item.source, item.sourceRecordId, "archive") ||
                actionReason.trim().length < 5
              }
              onClick={() =>
                onApplyInboxAction({
                  source: item.source,
                  itemId: item.sourceRecordId,
                  action: "archive",
                  reason: actionReason,
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy(item.source, item.sourceRecordId, "archive")
                ? copy.states.archiving
                : copy.states.archive}
            </button>
            {item.canDelete ? (
              <button
                type="button"
                disabled={
                  actionBusy(item.source, item.sourceRecordId, "delete") ||
                  actionReason.trim().length < 5
                }
                onClick={() =>
                  onApplyInboxAction({
                    source: item.source,
                    itemId: item.sourceRecordId,
                    action: "delete",
                    reason: actionReason,
                  })
                }
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionBusy(item.source, item.sourceRecordId, "delete")
                  ? copy.states.deleting
                  : copy.states.delete}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}
