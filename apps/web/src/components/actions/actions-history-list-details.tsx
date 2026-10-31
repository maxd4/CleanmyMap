import { ActionParticipantImpactManager } from "@/components/actions/action-participant-impact-manager";
import { ActionRetrospectivePanel } from "@/components/actions/action-retrospective-panel";
import { ActionRoleAttestationsPanel } from "@/components/actions/action-role-attestations-panel";
import { ActionMediaProofs } from "@/components/actions/action-media/action-media-proofs";
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

function ActionHistoryModerationSections({
  selectedItem,
  selectedCanModerateGroupJoin,
  pendingGroupJoinRequests,
  pendingGroupJoinLoading,
  pendingGroupJoinError,
  reviewingParticipantId,
  onRefreshPending,
  onReviewGroupJoin,
  fr,
}: Omit<Pick<ActionsHistoryListDetailsProps, "selectedItem" | "selectedCanModerateGroupJoin" | "pendingGroupJoinRequests" | "pendingGroupJoinLoading" | "pendingGroupJoinError" | "reviewingParticipantId" | "onRefreshPending" | "onReviewGroupJoin" | "fr">, "selectedItem"> & { selectedItem: NonNullable<ActionsHistoryListDetailsProps["selectedItem"]> }) {
  return <>
    {isSingleActionReportEligible(selectedItem) ? (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 p-3">
        <p className="cmm-text-caption font-semibold uppercase tracking-wide text-red-700">Rapport mono-action</p>
        <p className="mt-1 cmm-text-small cmm-text-secondary">Vérifiez le résumé serveur de cette action avant de générer son rapport d&apos;impact.</p>
        <CmmButton href={`/reports?tab=generation&actionId=${encodeURIComponent(selectedItem.id)}`} tone="primary" variant="pill" className="mt-3 min-h-11">
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
  </>;
}

function ActionHistoryEvidenceSections({
  actionId,
  selectedCanViewActionAudit,
  actionAudit,
  fr,
  selectedItem,
}: {
  actionId: string;
  selectedCanViewActionAudit: boolean;
  actionAudit: ActionsHistoryListDetailsProps["actionAudit"];
  fr: boolean;
  selectedItem: NonNullable<ActionsHistoryListDetailsProps["selectedItem"]>;
}) {
  return <>
    {selectedItem.record_type === "action" ? (
      <div className="mt-4">
        <ActionRetrospectivePanel
          key={selectedItem.id}
          actionId={actionId}
          actionPhase={selectedItem.contract?.metadata.actionPhase}
          status={selectedItem.status}
          fr={fr}
        />
      </div>
    ) : null}
    <ActionParticipantImpactManager actionId={actionId} fr={fr} />
    <ActionMediaProofs actionId={actionId} />
    <ActionHistoryAuditSection
      selectedItem={selectedItem}
      selectedCanViewActionAudit={selectedCanViewActionAudit}
      actionAudit={actionAudit}
      fr={fr}
    />
  </>;
}

function ActionHistoryPrimarySections({
  selectedItem,
  selectedQuality,
  selectedOperational,
  selectedLostPoints,
  correctiveAction,
}: Pick<ActionsHistoryListDetailsProps, "selectedItem" | "selectedQuality" | "selectedOperational" | "selectedLostPoints" | "correctiveAction"> & {
  selectedItem: NonNullable<ActionsHistoryListDetailsProps["selectedItem"]>;
  selectedQuality: ActionQualityResult;
}) {
  return <>
    <ActionHistoryQualitySection selectedItem={selectedItem} selectedQuality={selectedQuality} selectedOperational={selectedOperational} selectedLostPoints={selectedLostPoints} correctiveAction={correctiveAction} />
    <div className="mt-4"><ActionRoleAttestationsPanel actionId={selectedItem.id} /></div>
  </>;
}

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
      <ActionHistoryPrimarySections
        selectedItem={selectedItem}
        selectedQuality={selectedQuality}
        selectedOperational={selectedOperational}
        selectedLostPoints={selectedLostPoints}
        correctiveAction={correctiveAction}
      />
      <ActionHistoryModerationSections
        selectedItem={selectedItem}
        selectedCanModerateGroupJoin={selectedCanModerateGroupJoin}
        pendingGroupJoinRequests={pendingGroupJoinRequests}
        pendingGroupJoinLoading={pendingGroupJoinLoading}
        pendingGroupJoinError={pendingGroupJoinError}
        reviewingParticipantId={reviewingParticipantId}
        onRefreshPending={onRefreshPending}
        onReviewGroupJoin={onReviewGroupJoin}
        fr={fr}
      />
      <ActionHistoryEvidenceSections
        actionId={selectedItem.id}
        selectedCanViewActionAudit={selectedCanViewActionAudit}
        actionAudit={actionAudit}
        fr={fr}
        selectedItem={selectedItem}
      />
    </div>
  );
}
