import {
  formatCreatorInboxSourceLabel,
  formatCreatorInboxStatusLabel,
  type CreatorInboxItem,
} from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy, CreatorInboxLocale } from "./creator-inbox-copy";

type InboxItemRequestDetailsProps = {
  item: CreatorInboxItem;
  locale: CreatorInboxLocale;
  copy: CreatorInboxCopy;
};

export function InboxItemRequestDetails({
  item,
  locale,
  copy,
}: InboxItemRequestDetailsProps) {
  return (
    <>
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
    </>
  );
}
