import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { OperationAuditTimeline } from "@/components/actions/operation-audit-timeline";
import type { AdminOperationAuditEntry } from "@/lib/admin/operation-audit";
import type { ActionParticipationReviewItem } from "@/lib/actions/group-participation";
import { formatDate } from "./actions-history-list.helpers";

type ActionQualityResult = {
  score: number;
  grade: "A" | "B" | "C";
  breakdown: {
    geoloc: number;
    traceability: number;
    freshness: number;
  };
  flags: string[];
};

type SelectedOperationalContext = {
  placeTypeLabel: string;
  routeStyleLabel: string;
  volunteersCount: number;
  durationMinutes: number;
  engagementHours: number;
  routeAdjustmentMessage?: string | null;
} | null;

export type ActionsHistoryListDetailsProps = {
  selectedItem: {
    location_label: string | null;
    contract?: {
      metadata: {
        placeType?: string | null;
      };
    } | null;
  } | null;
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
  if (!selectedItem || !selectedQuality) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
        Detail score qualite
      </p>
      <p className="mt-1 cmm-text-small cmm-text-secondary">
        <span className="font-semibold">
          {selectedQuality.grade} ({selectedQuality.score}/100)
        </span>
        {" "}
        - points perdus: {selectedLostPoints}
        {selectedItem.contract?.metadata.placeType && (
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 cmm-text-caption cmm-text-secondary">
            Type: {selectedItem.contract.metadata.placeType}
          </span>
        )}
      </p>
      <p className="mt-1 cmm-text-caption cmm-text-secondary">
        Facteurs:
        {" "}
        {selectedQuality.flags.length > 0
          ? selectedQuality.flags.join(",")
          : "Aucun facteur critique."}
      </p>
      <p className="mt-1 cmm-text-caption cmm-text-secondary">
        Action corrective recommandee: {correctiveAction}
      </p>
      {selectedOperational ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
            Contexte métier
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 cmm-text-caption font-semibold text-emerald-800">
              {selectedOperational.placeTypeLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-semibold cmm-text-secondary">
              {selectedOperational.routeStyleLabel}
            </span>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 cmm-text-caption font-semibold text-sky-800">
              {selectedOperational.volunteersCount} bénévoles
            </span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 cmm-text-caption font-semibold text-indigo-800">
              {selectedOperational.durationMinutes} min
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 cmm-text-caption font-semibold text-amber-800">
              {selectedOperational.engagementHours} h-personnes
            </span>
          </div>
          {selectedOperational.routeAdjustmentMessage ? (
            <p className="mt-2 cmm-text-caption cmm-text-secondary">
              Ajustement trajet: {selectedOperational.routeAdjustmentMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      {selectedCanModerateGroupJoin ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="cmm-text-caption font-semibold uppercase tracking-wide text-amber-800">
                Modération
              </p>
              <p className="mt-0.5 cmm-text-small cmm-text-secondary">
                {fr
                  ? `${pendingGroupJoinRequests.length} demande${pendingGroupJoinRequests.length > 1 ? "s" : ""} à traiter.`
                  : `${pendingGroupJoinRequests.length} request${pendingGroupJoinRequests.length > 1 ? "s" : ""} to review.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshPending}
              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 cmm-text-small font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              {pendingGroupJoinLoading ? "..." : fr ? "Actualiser" : "Refresh"}
            </button>
          </div>

          {pendingGroupJoinError ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-700">
              {pendingGroupJoinError}
            </p>
          ) : null}

          {pendingGroupJoinLoading ? (
            <div className="mt-2 space-y-2">
              {[...Array(2)].map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-amber-100 bg-white px-3 py-2.5"
                >
                  <CmmSkeleton className="h-4 w-40" />
                  <CmmSkeleton className="mt-2 h-3 w-24" />
                </div>
              ))}
            </div>
          ) : pendingGroupJoinRequests.length > 0 ? (
            <div className="mt-2 space-y-2.5">
              {pendingGroupJoinRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-amber-100 bg-white px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.displayName}
                      </p>
                      <p className="text-xs text-slate-600">
                        {request.handle ? `@${request.handle}` : request.displayName} ·{" "}
                        {fr
                          ? `depuis ${formatDate(request.joinedAt.slice(0, 10), "fr")}`
                          : `since ${formatDate(request.joinedAt.slice(0, 10), "en")}`}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                      {fr ? "À traiter" : "To review"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <CmmButton
                      type="button"
                      tone="primary"
                      variant="pill"
                      size="sm"
                      disabled={reviewingParticipantId === request.id}
                      onClick={() => onReviewGroupJoin(request, "accept")}
                    >
                      {reviewingParticipantId === request.id
                        ? "..."
                        : fr
                          ? "Accepter"
                          : "Accept"}
                    </CmmButton>
                    <CmmButton
                      type="button"
                      tone="secondary"
                      variant="pill"
                      size="sm"
                      disabled={reviewingParticipantId === request.id}
                      onClick={() => onReviewGroupJoin(request, "reject")}
                    >
                      {reviewingParticipantId === request.id
                        ? "..."
                        : fr
                          ? "Refuser"
                          : "Reject"}
                    </CmmButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 rounded-lg border border-dashed border-amber-200 bg-white/80 px-3 py-2.5 cmm-text-small cmm-text-secondary">
              {fr ? "Aucune demande en attente." : "No requests waiting."}
            </div>
          )}
        </div>
      ) : null}

      {selectedCanViewActionAudit ? (
        <div className="mt-3">
          <OperationAuditTimeline
            title={fr ? "Journal de modifications" : "Change log"}
            scopeLabel={
              fr
                ? selectedItem?.location_label
                  ? `Fiche action · ${selectedItem.location_label}`
                  : "Fiche action"
                : selectedItem?.location_label
                  ? `Action sheet · ${selectedItem.location_label}`
                  : "Action sheet"
            }
            items={actionAudit.data?.items ?? []}
            loading={actionAudit.isLoading}
            errorMessage={
              actionAudit.error
                ? actionAudit.error instanceof Error
                  ? actionAudit.error.message
                  : fr
                    ? "Journal indisponible."
                    : "Audit unavailable."
                : null
            }
            emptyMessage={
              fr
                ? "Aucune modification enregistrée sur cette action pour le moment."
                : "No change recorded for this action yet."
            }
          />
        </div>
      ) : null}
    </div>
  );
}
