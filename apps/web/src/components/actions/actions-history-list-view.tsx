import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { CmmBadge } from "@/components/ui/cmm-badge";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { ActionsHistoryListControls } from "./actions-history-list-controls";
import { ActionsHistoryListDetails } from "./actions-history-list-details";
import { buildActionsHistoryPdfData } from "./actions-history-list-export";
import { ActionsHistoryListTable } from "./actions-history-list-table";
import { formatActionStatus, formatDate, formatRecordType } from "./actions-history-list.helpers";
import type { ActionsHistoryListParticipationModel } from "./use-actions-history-list-participation";
import type { ActionsHistoryListQueryModel } from "./use-actions-history-list-query";

export type ActionsHistoryListViewProps = {
  fr: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  partialSourcesLabel: string;
  actionAudit: {
    data?: { items?: AdminOperationAuditEntry[] };
    isLoading: boolean;
    error: unknown;
  };
  query: ActionsHistoryListQueryModel;
  participation: ActionsHistoryListParticipationModel;
  selectedCanViewActionAudit: boolean;
  pdfData: ReturnType<typeof buildActionsHistoryPdfData>;
};

export function ActionsHistoryListView({
  fr,
  currentUserId,
  isAdminLikeUser,
  partialSourcesLabel,
  actionAudit,
  query,
  participation,
  selectedCanViewActionAudit,
  pdfData,
}: ActionsHistoryListViewProps) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    limit,
    filteredItems,
    qualityById,
    selectedId,
    selectedIndex,
    selectedItem,
    selectedQuality,
    selectedOperational,
    selectedLostPoints,
    correctiveAction,
    hasActiveFilters,
    reload,
    setLimit,
    setSelectedId,
    resetFilters,
  } = query;
  const {
    selectedCanModerateGroupJoin,
    pendingGroupJoinRequests,
    pendingGroupJoinLoading,
    pendingGroupJoinError,
    reviewingParticipantId,
    groupJoinActionId,
    groupJoinNotice,
    loadPendingGroupJoinRequests,
    handleToggleGroupJoin,
    handleReviewGroupJoin,
  } = participation;

  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < filteredItems.length - 1;
  const detailOpen = Boolean(selectedItem && selectedQuality);

  return (
    <>
      <CmmCard as="section" className="space-y-4 p-4 sm:p-6">
        <ActionsHistoryListControls
          partialSource={data?.partialSource}
          partialSourcesLabel={partialSourcesLabel}
          query={query}
          pdfData={pdfData}
        />

        {groupJoinNotice ? (
          <CmmFeedback tone="info">{groupJoinNotice}</CmmFeedback>
        ) : null}

        <ActionsHistoryListTable
          filteredItems={filteredItems}
          qualityById={qualityById}
          limit={limit}
          selectedId={selectedId}
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          error={error}
          isValidating={isValidating}
          currentUserId={currentUserId}
          isAdminLikeUser={isAdminLikeUser}
          groupJoinActionId={groupJoinActionId}
          onSelectItem={setSelectedId}
          onLoadMore={() => setLimit((previous) => previous + 25)}
          onToggleGroupJoin={(item, nextEnabled) => {
            void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ handleToggleGroupJoin(item, nextEnabled);
          }}
          onResetFilters={resetFilters}
          onReload={() => {
            void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ reload();
          }}
        />
      </CmmCard>

      <CmmDialog
        open={detailOpen}
        onClose={() => setSelectedId(null)}
        ariaLabelledBy="history-detail-title"
        size="xl"
        panelClassName="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] p-4 shadow-xl sm:p-6"
      >
        {selectedItem && selectedQuality ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 border-b border-[color:var(--border-default)] pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CmmBadge tone="slate" shape="pill">
                    <span className="whitespace-nowrap">{formatActionStatus(selectedItem.status)}</span>
                  </CmmBadge>
                  <span className="cmm-text-caption cmm-text-muted">
                    {formatDate(selectedItem.action_date)} · {formatRecordType(selectedItem)}
                  </span>
                </div>
                <h2 id="history-detail-title" className="cmm-text-h3 cmm-text-primary">
                  {selectedItem.location_label || "Enregistrement terrain"}
                </h2>
                <p className="cmm-text-caption cmm-text-secondary">
                  Déclaré par {selectedItem.actor_name || "Anonyme"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <CmmButton
                  type="button"
                  size="sm"
                  tone="secondary"
                  disabled={!hasPrevious}
                  ariaLabel="Enregistrement précédent"
                  onClick={() => {
                    if (hasPrevious) {
                      setSelectedId(filteredItems[selectedIndex - 1].id);
                    }
                  }}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </CmmButton>
                <CmmButton
                  type="button"
                  size="sm"
                  tone="secondary"
                  disabled={!hasNext}
                  ariaLabel="Enregistrement suivant"
                  onClick={() => {
                    if (hasNext) {
                      setSelectedId(filteredItems[selectedIndex + 1].id);
                    }
                  }}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </CmmButton>
                <CmmButton
                  type="button"
                  size="sm"
                  tone="tertiary"
                  ariaLabel="Fermer le panneau de détail"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} aria-hidden="true" />
                  <span>Fermer</span>
                </CmmButton>
              </div>
            </div>

            <ActionsHistoryListDetails
              selectedItem={selectedItem}
              selectedQuality={selectedQuality}
              selectedCanCorrectAction={Boolean(currentUserId && selectedItem.created_by_clerk_id === currentUserId)}
              selectedOperational={selectedOperational}
              selectedLostPoints={selectedLostPoints}
              correctiveAction={correctiveAction}
              selectedCanModerateGroupJoin={selectedCanModerateGroupJoin}
              selectedCanViewActionAudit={selectedCanViewActionAudit}
              pendingGroupJoinRequests={pendingGroupJoinRequests}
              pendingGroupJoinLoading={pendingGroupJoinLoading}
              pendingGroupJoinError={pendingGroupJoinError}
              reviewingParticipantId={reviewingParticipantId}
              actionAudit={actionAudit}
              fr={fr}
              onRefreshPending={() => {
                if (selectedItem.id) {
                  void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPendingGroupJoinRequests(selectedItem.id);
                }
              }}
              onReviewGroupJoin={(request: ActionParticipationReviewItem, decision) => {
                void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ handleReviewGroupJoin(request, decision);
              }}
            />
          </div>
        ) : null}
      </CmmDialog>
    </>
  );
}
