import { ActionParticipantImpactManager } from "@/components/actions/action-participant-impact-manager";
import { CmmButton } from "@/components/ui/cmm-button";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import {
  ActionHistoryAuditSection,
  ActionHistoryGroupJoinSection,
  ActionHistoryQualitySection,
  type ActionHistorySelectedItem,
  type ActionQualityResult,
  type SelectedOperationalContext,
  isSingleActionReportEligible,
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
      {isSingleActionReportEligible(selectedItem) ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 p-3">
          <p className="cmm-text-caption font-semibold uppercase tracking-wide text-red-700">Rapport mono-action</p>
          <p className="mt-1 cmm-text-small cmm-text-secondary">
            Vérifiez le résumé serveur de cette action avant de générer son rapport d&apos;impact.
          </p>
          <CmmButton
            href={`/reports?tab=generation&actionId=${encodeURIComponent(selectedItem.id)}`}
            tone="primary"
            variant="pill"
            className="mt-3 min-h-11"
          >
            Générer un rapport d&apos;impact
          </CmmButton>
        </div>
      ) : null}
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
