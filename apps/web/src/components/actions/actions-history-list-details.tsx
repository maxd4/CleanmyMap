import { ActionParticipantImpactManager } from "@/components/actions/action-participant-impact-manager";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import {
  ActionHistoryAuditSection,
  ActionHistoryGroupJoinSection,
  ActionHistoryQualitySection,
  type ActionHistorySelectedItem,
  type ActionQualityResult,
  type SelectedOperationalContext,
} from "./actions-history-list-detail-sections";

export type ActionsHistoryListDetailsProps = {
  selectedItem: ActionHistorySelectedItem | null;
  selectedQuality: ActionQualityResult | null;
  selectedOperational: SelectedOperationalContext;
  selectedLostPoints: number;
  correctiveAction: string | null;
  selectedCanModerateGroupJoin: boolean;
  selectedCanViewActionAudit: boolean;
  pendingGroupJoinRequests: ActionParticipationReviewItem[];
  pendingGroupJoinLoading: boolean;
  pendingGroupJoinError: string | null;
  reviewingParticipantId: string | null;
  actionAudit: {
    data?: { items?: AdminOperationAuditEntry[] };
    isLoading: boolean;
    error: unknown;
  };
  fr: boolean;
  onRefreshPending: () => void;
  onReviewGroupJoin: (
    request: ActionParticipationReviewItem,
    decision: "accept" | "reject",
  ) => void;
};

export function ActionsHistoryListDetails({
  selectedItem,
  selectedQuality,
  selectedOperational,
  selectedLostPoints,
  correctiveAction,
  selectedCanModerateGroupJoin,
  selectedCanViewActionAudit,
  pendingGroupJoinRequests,
  pendingGroupJoinLoading,
  pendingGroupJoinError,
  reviewingParticipantId,
  actionAudit,
  fr,
  onRefreshPending,
  onReviewGroupJoin,
}: ActionsHistoryListDetailsProps) {
  if (!selectedItem || !selectedQuality) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <ActionHistoryQualitySection
        selectedItem={selectedItem}
        selectedQuality={selectedQuality}
        selectedOperational={selectedOperational}
        selectedLostPoints={selectedLostPoints}
        correctiveAction={correctiveAction}
      />
      {selectedCanModerateGroupJoin ? (
        <ActionHistoryGroupJoinSection
          fr={fr}
          pendingGroupJoinRequests={pendingGroupJoinRequests}
          pendingGroupJoinLoading={pendingGroupJoinLoading}
          pendingGroupJoinError={pendingGroupJoinError}
          reviewingParticipantId={reviewingParticipantId}
          onRefreshPending={onRefreshPending}
          onReviewGroupJoin={onReviewGroupJoin}
        />
      ) : null}
      <ActionParticipantImpactManager actionId={selectedItem.id} fr={fr} />
      <ActionHistoryAuditSection
        selectedItem={selectedItem}
        selectedCanViewActionAudit={selectedCanViewActionAudit}
        actionAudit={actionAudit}
        fr={fr}
      />
    </div>
  );
}
