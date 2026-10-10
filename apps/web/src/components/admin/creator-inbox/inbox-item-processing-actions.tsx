import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy } from "./creator-inbox-copy";
import type { InboxActionParams } from "./inbox-item-card.types";

type InboxItemProcessingActionsProps = {
  item: CreatorInboxItem;
  copy: CreatorInboxCopy;
  actionReason: string;
  actionBusy: (source: CreatorInboxSource, id: string, action: string) => boolean;
  onApplyInboxAction: (params: InboxActionParams) => void;
};

export function InboxItemProcessingActions({
  item,
  copy,
  actionReason,
  actionBusy,
  onApplyInboxAction,
}: InboxItemProcessingActionsProps) {
  const apply = (action: InboxActionParams["action"]) => {
    onApplyInboxAction({
      source: item.source,
      itemId: item.sourceRecordId,
      action,
      reason: actionReason,
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={
          actionBusy(item.source, item.sourceRecordId, "mark_treated") ||
          actionReason.trim().length < 5
        }
        onClick={() => apply("mark_treated")}
        className="rounded-lg border border-emerald-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {actionBusy(item.source, item.sourceRecordId, "mark_treated")
          ? copy.states.processing
          : copy.states.markTreated}
      </button>
      {item.source !== "feedback" ? (
        <button
          type="button"
          disabled={
            actionBusy(item.source, item.sourceRecordId, "responded") ||
            actionReason.trim().length < 5
          }
          onClick={() => apply("responded")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionBusy(item.source, item.sourceRecordId, "responded")
            ? copy.states.processing
            : copy.states.markResponded}
        </button>
      ) : null}
      <button
        type="button"
        disabled={
          actionBusy(item.source, item.sourceRecordId, "archive") ||
          actionReason.trim().length < 5
        }
        onClick={() => apply("archive")}
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
          onClick={() => apply("delete")}
          className="rounded-lg border border-rose-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionBusy(item.source, item.sourceRecordId, "delete")
            ? copy.states.deleting
            : copy.states.delete}
        </button>
      ) : null}
    </>
  );
}
