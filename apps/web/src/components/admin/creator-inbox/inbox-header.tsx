"use client";

import type { CreatorInboxCopy } from "./creator-inbox-copy";

type InboxHeaderProps = {
  itemsCount: number;
  summary: {
    feedback: number;
    promotion: number;
    partner: number;
    event: number;
  };
  copy: CreatorInboxCopy;
};

export function InboxHeader({ itemsCount, summary, copy }: InboxHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
          {copy.panel.badge}
        </p>
        <h2 className="text-lg font-semibold cmm-text-primary">
          {copy.panel.title}
        </h2>
        <p className="max-w-2xl cmm-text-caption cmm-text-secondary">
          {copy.panel.description}
        </p>
      </div>
      <div className="text-right">
        <p className="cmm-text-caption cmm-text-muted">
          {itemsCount} {copy.panel.itemCountSuffix}
        </p>
        <p className="cmm-text-caption cmm-text-muted">
          {copy.panel.feedbackLabel}: {summary.feedback} · {copy.panel.promotionLabel}:{" "}
          {summary.promotion} · {copy.panel.partnerLabel}: {summary.partner} ·{" "}
          {copy.panel.eventLabel}: {summary.event}
        </p>
      </div>
    </div>
  );
}
