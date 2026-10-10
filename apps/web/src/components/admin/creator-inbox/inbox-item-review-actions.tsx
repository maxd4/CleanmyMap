import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy, CreatorInboxLocale } from "./creator-inbox-copy";

type InboxItemReviewActionsProps = {
  item: CreatorInboxItem;
  locale: CreatorInboxLocale;
  copy: CreatorInboxCopy;
  reason: string;
  onReasonChange: (reason: string) => void;
  actionBusy: (source: CreatorInboxSource, id: string, action: string) => boolean;
  onAccept: (item: CreatorInboxItem) => void;
  onReject: (item: CreatorInboxItem) => void;
};

export function InboxItemReviewActions({
  item,
  locale,
  copy,
  reason,
  onReasonChange,
  actionBusy,
  onAccept,
  onReject,
}: InboxItemReviewActionsProps) {
  return (
    <>
      <label className="mt-2 basis-full space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">
          {locale === "fr" ? "Motif de décision" : "Decision reason"}
        </span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
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
          {reason.trim().length}/500
        </span>
      </label>
      <button
        type="button"
        disabled={
          actionBusy(item.source, item.sourceRecordId, "accept") ||
          reason.trim().length < 5
        }
        onClick={() => onAccept(item)}
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
          reason.trim().length < 5
        }
        onClick={() => onReject(item)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {actionBusy(item.source, item.sourceRecordId, "reject")
          ? copy.states.processing
          : copy.states.reject}
      </button>
    </>
  );
}
