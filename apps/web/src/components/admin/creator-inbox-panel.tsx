"use client";

import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import { InboxFilterBar } from "./creator-inbox/inbox-filter-bar";
import { InboxItemCard } from "./creator-inbox/inbox-item-card";
import { useCreatorInbox } from "./creator-inbox/use-creator-inbox";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";

type CreatorInboxPanelProps = {
  initialItems: CreatorInboxItem[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  canQualify?: boolean;
};

export function CreatorInboxPanel({
  initialItems,
  initialHasMore,
  initialNextCursor,
  canQualify = false,
}: CreatorInboxPanelProps) {
  const inbox = useCreatorInbox({ initialItems, initialHasMore, initialNextCursor, initialCanQualify: canQualify });

  return (
    <AdminPanelShell
      title={inbox.copy.panel.title}
      subtitle={inbox.copy.panel.description}
      headerAction={
        <div className="text-right">
          <p className="cmm-text-caption font-black uppercase tracking-widest text-slate-500">
            {inbox.items.length} {inbox.copy.panel.itemCountSuffix}
          </p>
          <p className="cmm-text-caption font-medium text-slate-600">
            {inbox.copy.panel.pageCountLabel}: F: {inbox.summary.feedback} · P: {inbox.summary.promotion} · S: {inbox.summary.partner} · L: {inbox.summary.legalContentReport}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <InboxFilterBar
          copy={inbox.copy}
          query={inbox.query}
          onQueryChange={inbox.setQuery}
          sourceFilter={inbox.sourceFilter}
          onSourceFilterChange={inbox.setSourceFilter}
          statusFilter={inbox.statusFilter}
          onStatusFilterChange={inbox.setStatusFilter}
          priorityFilter={inbox.priorityFilter}
          onPriorityFilterChange={inbox.setPriorityFilter}
          sortMode={inbox.sortMode}
          onSortModeChange={inbox.setSortMode}
          partnerConfirm={inbox.partnerConfirm}
          onPartnerConfirmChange={inbox.setPartnerConfirm}
          refreshing={inbox.refreshing}
          filteredCount={inbox.filteredItems.length}
          onRefresh={() => void inbox.refreshInbox()}
        />

        {inbox.errorMessage && (
          <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-4">
            <p className="text-xs font-medium text-rose-400">
              {inbox.errorMessage}
            </p>
          </div>
        )}

        {inbox.successMessage && (
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <p className="text-xs font-medium text-emerald-400">
              {inbox.successMessage}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {inbox.filteredItems.length > 0 ? (
            inbox.filteredItems.map((item) => (
              <InboxItemCard
                key={item.id}
                item={item}
                locale={inbox.locale}
                copy={inbox.copy}
                copiedKey={inbox.copiedKey}
                promotionReason={inbox.promotionReasons[item.sourceRecordId] ?? ""}
                onPromotionReasonChange={(reason) =>
                  inbox.setPromotionReasons((current) => ({
                    ...current,
                    [item.sourceRecordId]: reason,
                  }))
                }
                partnerReason={inbox.partnerReason[item.sourceRecordId] ?? ""}
                onPartnerReasonChange={(reason) =>
                  inbox.setPartnerReason((current) => ({
                    ...current,
                    [item.sourceRecordId]: reason,
                  }))
                }
                actionReason={inbox.actionReasons[item.sourceRecordId] ?? ""}
                onActionReasonChange={(reason) =>
                  inbox.setActionReasons((current) => ({
                    ...current,
                    [item.sourceRecordId]: reason,
                  }))
                }
                actionBusy={inbox.actionBusy}
                onCopySummary={(nextItem) => void inbox.copySummary(nextItem)}
                onAcceptPromotion={(nextItem) => void inbox.acceptPromotion(nextItem)}
                onRejectPromotion={(nextItem) => void inbox.rejectPromotion(nextItem)}
                onAcceptPartner={(nextItem) => void inbox.acceptPartner(nextItem)}
                onRejectPartner={(nextItem) => void inbox.rejectPartner(nextItem)}
                onApplyInboxAction={(params) =>
                  void inbox.applyInboxAction({
                    ...params,
                    reason: inbox.actionReasons[item.sourceRecordId] ?? "",
                  })
                }
                onLegalDecision={(params) => void inbox.decideLegalReport(params)}
                canQualify={inbox.canQualify}
                feedbackOptions={inbox.items.filter((option) => option.source === "feedback")}
                onQualifyFeedback={(params) =>
                  void inbox.qualifyFeedback({ item, ...params })
                }
              />
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
              <p className="text-sm font-black text-white uppercase tracking-widest">
                {inbox.copy.states.emptyTitle}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {inbox.copy.states.emptySubtitle}
              </p>
            </div>
          )}
        </div>
        {inbox.hasMore ? (
          <button
            type="button"
            onClick={() => void inbox.loadNextPage()}
            disabled={inbox.loadingNextPage}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inbox.loadingNextPage
              ? inbox.copy.panel.loadingNextPageLabel
              : inbox.copy.panel.nextPageLabel}
          </button>
        ) : null}
      </div>
    </AdminPanelShell>
  );
}
