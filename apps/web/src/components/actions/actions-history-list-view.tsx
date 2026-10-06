import type { ActionsHistoryListQueryModel } from "./use-actions-history-list-query";
import type { ActionsHistoryListParticipationModel } from "./use-actions-history-list-participation";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import { ActionsHistoryListDetails } from "./actions-history-list-details";
import { ActionsHistoryListTable } from "./actions-history-list-table";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { buildActionsHistoryPdfData } from "./actions-history-list-export";
import { ActionsHistoryListControls } from "./actions-history-list-controls";

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
    selectedItem,
    selectedQuality,
    selectedOperational,
    selectedLostPoints,
    correctiveAction,
    setLimit,
    setSelectedId,
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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <ActionsHistoryListControls
        partialSource={data?.partialSource}
        partialSourcesLabel={partialSourcesLabel}
        query={query}
        pdfData={pdfData}
      />

      {groupJoinNotice ? (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          {groupJoinNotice}
        </div>
      ) : null}

      {selectedItem && selectedQuality ? (
        <ActionsHistoryListDetails
          selectedItem={selectedItem}
          selectedQuality={selectedQuality}
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
              void loadPendingGroupJoinRequests(selectedItem.id);
            }
          }}
          onReviewGroupJoin={(request: ActionParticipationReviewItem, decision) =>
            void handleReviewGroupJoin(request, decision)
          }
        />
      ) : null}

      <ActionsHistoryListTable
        filteredItems={filteredItems}
        qualityById={qualityById}
        limit={limit}
        isLoading={isLoading}
        error={error}
        isValidating={isValidating}
        currentUserId={currentUserId}
        isAdminLikeUser={isAdminLikeUser}
        groupJoinActionId={groupJoinActionId}
        onSelectItem={setSelectedId}
        onLoadMore={() => setLimit((previous) => previous + 25)}
        onToggleGroupJoin={(item, nextEnabled) => void handleToggleGroupJoin(item, nextEnabled)}
      />
    </section>
  );
}
