import { ChevronRight, Loader2, Search, ShieldCheck } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type {
  ActionParticipationReviewItem,
  ActionParticipationSearchItem,
} from "@/lib/actions/participation/group-participation";
import { CmmButton } from "@/components/ui/cmm-button";
import { QueueRow } from "./rejoindre-un-formulaire-section.shared";
import { formatCount } from "./rejoindre-un-formulaire-section.format";

export type JoinFormPublicQueueProps = {
  fr: boolean;
  queueRequests: ActionParticipationReviewItem[];
  queueConfirmedParticipants: ActionParticipationReviewItem[];
  queueLoading: boolean;
  queueError: string | null;
  queueCanReview: boolean;
  reviewingQueueId: string | null;
  addingQueueParticipantId: string | null;
  queueSearchQuery: string;
  queueSearchResults: ActionParticipationSearchItem[];
  queueSearchLoading: boolean;
  queueSearchError: string | null;
  setQueueSearchQuery: Dispatch<SetStateAction<string>>;
  onReviewQueueRequest: (requestId: string, decision: "accept" | "reject") => Promise<void>;
  onAddQueueParticipant: (userId: string) => Promise<void>;
};

export function JoinFormPublicQueue({
  fr,
  queueRequests,
  queueConfirmedParticipants,
  queueLoading,
  queueError,
  queueCanReview,
  reviewingQueueId,
  addingQueueParticipantId,
  queueSearchQuery,
  queueSearchResults,
  queueSearchLoading,
  queueSearchError,
  setQueueSearchQuery,
  onReviewQueueRequest,
  onAddQueueParticipant,
}: JoinFormPublicQueueProps) {
  return (
    <div id="file-publique" className="rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black tracking-tight text-emerald-950">
              {fr ? "File publique des demandes" : "Public request queue"}
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
              {formatCount(queueRequests.length + queueConfirmedParticipants.length)}
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-600">
            {queueCanReview
              ? fr
                ? "Recherche, validation, exclusion et ajout manuel réservés aux admin et élus."
                : "Search, validation, exclusion and manual addition are reserved for admins and elected users."
              : fr
                ? "Seuls les admin et élus peuvent modérer cette file."
                : "Only admins and elected users can moderate this queue."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-emerald-700" />
          {queueCanReview
            ? fr
              ? "Accès de modération activé"
              : "Moderation access enabled"
            : fr
              ? "Lecture seule"
              : "Read only"}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {queueCanReview && (
          <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  {fr ? "Ajouter un compte" : "Add an account"}
                </p>
                <p className="text-xs text-slate-600">
                  {fr
                    ? "Recherchez un compte puis ajoutez-le directement à l'action."
                    : "Search for an account and add it directly to the action."}
                </p>
              </div>
              {queueSearchLoading && <Loader2 size={16} className="animate-spin text-emerald-700" />}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={queueSearchQuery}
                  onChange={(event) => setQueueSearchQuery(event.target.value)}
                  placeholder={fr ? "Nom, pseudo ou identifiant" : "Name, handle or ID"}
                  className="w-full border-0 bg-transparent pl-8 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <CmmButton
                type="button"
                tone="secondary"
                variant="pill"
                size="sm"
                onClick={() => setQueueSearchQuery((current) => current.trim())}
              >
                {fr ? "Rechercher" : "Search"}
              </CmmButton>
            </div>

            {queueSearchError && (
              <p className="mt-2 text-xs font-medium text-rose-700">{queueSearchError}</p>
            )}

            {queueSearchQuery.trim().length >= 2 && (
              <div className="mt-3 space-y-2">
                {queueSearchResults.length > 0 ? (
                  queueSearchResults.map((candidate) => (
                    <div
                      key={candidate.userId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{candidate.displayName}</p>
                        <p className="text-xs text-slate-500">
                          {candidate.handle ? `@${candidate.handle}` : candidate.userId}
                        </p>
                      </div>
                      <CmmButton
                        type="button"
                        tone="primary"
                        variant="pill"
                        size="sm"
                        disabled={addingQueueParticipantId === candidate.userId}
                        onClick={() => void onAddQueueParticipant(candidate.userId)}
                      >
                        {addingQueueParticipantId === candidate.userId ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            {fr ? "Ajout..." : "Adding..."}
                          </>
                        ) : (
                          fr ? "Ajouter" : "Add"
                        )}
                      </CmmButton>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600">
                    {fr ? "Aucun compte ne correspond à cette recherche." : "No account matches this search."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-900">
              {fr ? "Demandes en attente" : "Pending requests"}
            </h4>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">
              {formatCount(queueRequests.length)}
            </span>
          </div>
          {queueError ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
              {queueError}
            </div>
          ) : queueLoading ? (
            <div className="space-y-2.5">
              <div className="h-9 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40" />
              <div className="h-9 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40" />
            </div>
          ) : queueRequests.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-[1rem] border border-slate-100">
              {queueRequests.map((request) => (
                <QueueRow
                  key={request.id}
                  request={request}
                  fr={fr}
                  queueCanReview={queueCanReview}
                  reviewingQueueId={reviewingQueueId}
                  onReviewQueueRequest={onReviewQueueRequest}
                  displayMode="pending"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
              {fr
                ? "Aucune demande en attente sur ce formulaire."
                : "No requests are waiting on this form."}
            </div>
          )}
        </div>

        {queueCanReview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-900">
                {fr ? "Comptes confirmés" : "Confirmed accounts"}
              </h4>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                {formatCount(queueConfirmedParticipants.length)}
              </span>
            </div>
            {queueConfirmedParticipants.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-[1rem] border border-slate-100">
                {queueConfirmedParticipants.map((request) => (
                  <QueueRow
                    key={request.id}
                    request={request}
                    fr={fr}
                    queueCanReview={queueCanReview}
                    reviewingQueueId={reviewingQueueId}
                    onReviewQueueRequest={onReviewQueueRequest}
                    displayMode="confirmed"
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                {fr
                  ? "Aucun compte confirmé à afficher."
                  : "No confirmed account to display."}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
        <span>
          {queueCanReview
            ? fr
              ? "Les admin et élus peuvent accepter, exclure et ajouter un compte."
              : "Admins and elected users can approve, remove and add an account."
            : fr
              ? "La modération des comptes est réservée aux admin et élus."
              : "Account moderation is reserved for admins and elected users."}
        </span>
        <span className="inline-flex items-center gap-1.5 text-emerald-700">
          {fr ? "Vue de modération" : "Moderation view"}
          <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}
