import Link from "next/link";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy } from "./creator-inbox-copy";

type InboxItemContextualActionsProps = {
  item: CreatorInboxItem;
  copy: CreatorInboxCopy;
  copiedKey: string | null;
  onCopySummary: (item: CreatorInboxItem) => void;
};

export function InboxItemContextualActions({
  item,
  copy,
  copiedKey,
  onCopySummary,
}: InboxItemContextualActionsProps) {
  return (
    <>
      {item.hasReplyTarget && item.authorEmail ? (
        <a
          href={`mailto:${item.authorEmail}?subject=${encodeURIComponent(`Re: ${item.title}`)}`}
          className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700"
        >
          {copy.states.replyByEmail}
        </a>
      ) : null}
      {item.source === "feedback" ? (
        item.privateReplyTargetUserId ? (
          <Link
            href={`/sections/messagerie?tab=dm&recipientId=${encodeURIComponent(item.privateReplyTargetUserId)}&recipientLabel=${encodeURIComponent(item.authorName)}&feedbackId=${encodeURIComponent(item.sourceRecordId)}`}
            className="rounded-lg bg-indigo-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-indigo-700"
          >
            {copy.states.replyPrivately}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Aucun utilisateur canonique disponible pour ce feedback."
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 cmm-text-caption font-semibold cmm-text-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            {copy.states.replyPrivately}
          </button>
        )
      ) : null}
      <button
        type="button"
        onClick={() => onCopySummary(item)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
      >
        {copiedKey === item.id ? copy.states.copied : copy.states.copySummary}
      </button>
    </>
  );
}
