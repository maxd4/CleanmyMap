import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import type { ActionListItem } from "@/lib/actions/types";
import {
  ActionsHistoryListTableRow,
  type ActionQualityResult,
} from "./actions-history-list-table-row";

export type ActionsHistoryListTableProps = {
  filteredItems: ActionListItem[];
  qualityById: Map<string, ActionQualityResult>;
  limit: number;
  isLoading: boolean;
  error: unknown;
  isValidating: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  groupJoinActionId: string | null;
  onSelectItem: (itemId: string) => void;
  onLoadMore: () => void;
  onToggleGroupJoin: (item: ActionListItem, nextEnabled: boolean) => void;
};

export function ActionsHistoryListTable({
  filteredItems,
  qualityById,
  limit,
  isLoading,
  error,
  isValidating,
  currentUserId,
  isAdminLikeUser,
  groupJoinActionId,
  onSelectItem,
  onLoadMore,
  onToggleGroupJoin,
}: ActionsHistoryListTableProps) {
  if (isLoading) {
    return (
      <div
        className="mt-5 space-y-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Chargement de l’historique des actions"
      >
        <div className="flex gap-4 border-b border-slate-200 px-2 pb-3">
          <CmmSkeleton className="h-4 w-16" />
          <CmmSkeleton className="h-4 w-24" />
          <CmmSkeleton className="h-4 w-32" />
          <CmmSkeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-slate-50 px-2 py-2"
          >
            <CmmSkeleton className="h-4 w-16" />
            <CmmSkeleton className="h-4 w-24" />
            <CmmSkeleton className="h-4 w-48 flex-1" />
            <CmmSkeleton className="h-5 w-16 rounded-full" />
            <CmmSkeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <CmmFeedback tone="error" className="mt-5">
        {error instanceof Error
          ? error.message
          : "Impossible de charger l'historique des actions. Veuillez vérifier votre connexion ou rafraîchir la page."}
      </CmmFeedback>
    );
  }

  return (
    <div className="mt-5">
      <div className="cmm-data-table-wrap">
        <table className="cmm-data-table" data-density="compact">
          <thead>
            <tr className="border-b border-slate-200 cmm-text-muted">
              <th scope="col" className="font-medium">Date</th>
              <th scope="col" className="font-medium">Bénévole</th>
              <th scope="col" className="font-medium">Lieu</th>
              <th scope="col" className="font-medium">Type</th>
              <th scope="col" className="font-medium">Kg</th>
              <th scope="col" className="font-medium">Mégots</th>
              <th scope="col" className="font-medium">Statut</th>
              <th scope="col" className="font-medium">Qualité</th>
              <th scope="col" className="font-medium">Jonction</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <ActionsHistoryListTableRow
                key={item.id}
                item={item}
                quality={qualityById.get(item.id)}
                currentUserId={currentUserId}
                isAdminLikeUser={isAdminLikeUser}
                groupJoinActionId={groupJoinActionId}
                onSelectItem={onSelectItem}
                onToggleGroupJoin={onToggleGroupJoin}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length >= limit ? (
        <div className="mt-6 flex justify-center border-t border-slate-100 pt-6">
          <CmmButton
            type="button"
            onClick={onLoadMore}
            loading={isValidating}
            tone="secondary"
            className="group mt-6 flex items-center gap-2 px-5 py-2.5 cmm-text-small font-bold cmm-text-secondary hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
          >
            {isValidating ? "Actualisation…" : (
              <>
                <span>Afficher 25 de plus</span>
                <span aria-hidden="true" className="text-slate-300 group-hover:text-emerald-400">↓</span>
              </>
            )}
          </CmmButton>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-4 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div className="max-w-xs space-y-2">
            <p className="cmm-text-small font-bold cmm-text-primary">Aucun enregistrement trouvé</p>
            <p className="cmm-text-caption cmm-text-secondary leading-relaxed">
              Il semble que vous n&apos;ayez pas encore d&apos;actions correspondant à ces filtres.
              Commencez par déclarer votre première action terrain !
            </p>
          </div>
          <CmmButton
            href="/actions/new"
            tone="primary"
            variant="pill"
            className="mt-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest"
          >
            Déclarer une action
          </CmmButton>
        </div>
      ) : null}
    </div>
  );
}
