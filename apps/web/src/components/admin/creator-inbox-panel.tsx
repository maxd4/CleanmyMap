"use client";

import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import { InboxFilterBar } from "./creator-inbox/inbox-filter-bar";
import { InboxHeader } from "./creator-inbox/inbox-header";
import { InboxItemCard } from "./creator-inbox/inbox-item-card";
import { useCreatorInbox } from "./creator-inbox/use-creator-inbox";

type CreatorInboxPanelProps = {
  initialItems: CreatorInboxItem[];
};

export function CreatorInboxPanel({ initialItems }: CreatorInboxPanelProps) {
  const inbox = useCreatorInbox({ initialItems });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <InboxHeader
        itemsCount={inbox.items.length}
        summary={inbox.summary}
        copy={inbox.copy}
      />

      <InboxFilterBar
        copy={inbox.copy}
        query={inbox.query}
        onQueryChange={inbox.setQuery}
        sourceFilter={inbox.sourceFilter}
        onSourceFilterChange={inbox.setSourceFilter}
        statusFilter={inbox.statusFilter}
        onStatusFilterChange={inbox.setStatusFilter}
        partnerConfirm={inbox.partnerConfirm}
        onPartnerConfirmChange={inbox.setPartnerConfirm}
        refreshing={inbox.refreshing}
        filteredCount={inbox.filteredItems.length}
        onRefresh={() => void inbox.refreshInbox()}
      />

      {inbox.errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-medium text-rose-700">
          {inbox.errorMessage}
        </p>
      ) : null}
      {inbox.successMessage ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-caption font-medium text-emerald-700">
          {inbox.successMessage}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {inbox.filteredItems.length > 0 ? (
          inbox.filteredItems.map((item) => (
            <InboxItemCard
              key={item.id}
              item={item}
              locale={inbox.locale}
              copy={inbox.copy}
              copiedKey={inbox.copiedKey}
              actionBusy={inbox.actionBusy}
              onCopySummary={(nextItem) => void inbox.copySummary(nextItem)}
              onAcceptPromotion={(nextItem) => void inbox.acceptPromotion(nextItem)}
              onRejectPromotion={(nextItem) => void inbox.rejectPromotion(nextItem)}
              onAcceptPartner={(nextItem) => void inbox.acceptPartner(nextItem)}
              onRejectPartner={(nextItem) => void inbox.rejectPartner(nextItem)}
              onApplyInboxAction={(params) => void inbox.applyInboxAction(params)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6">
            <p className="cmm-text-small font-semibold cmm-text-primary">
              {inbox.copy.states.emptyTitle}
            </p>
            <p className="mt-1 cmm-text-caption cmm-text-muted">
              {inbox.copy.states.emptySubtitle}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
