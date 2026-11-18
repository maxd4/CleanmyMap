import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import type { ActionListItem } from "@/lib/actions/types";
import { ActionsHistoryListMobileCard } from "./actions-history-list-mobile-card";
import {
  ActionsHistoryListTableRow,
  type ActionQualityResult,
} from "./actions-history-list-table-row";

export type ActionsHistoryListTableProps = {
  filteredItems: ActionListItem[];
  qualityById: Map<string, ActionQualityResult>;
  limit: number;
  selectedId?: string | null;
  hasActiveFilters?: boolean;
  isLoading: boolean;
  error: unknown;
  isValidating: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  groupJoinActionId: string | null;
  onSelectItem: (itemId: string) => void;
  onLoadMore: () => void;
  onToggleGroupJoin: (item: ActionListItem, nextEnabled: boolean) => void;
  onResetFilters?: () => void;
  onReload?: () => void;
};

export function ActionsHistoryListTable({
  filteredItems,
  qualityById,
  limit,
  selectedId = null,
  hasActiveFilters = false,
  isLoading,
  error,
  isValidating,
  currentUserId,
  isAdminLikeUser,
  groupJoinActionId,
  onSelectItem,
  onLoadMore,
  onToggleGroupJoin,
  onResetFilters,
  onReload,
}: ActionsHistoryListTableProps) {
  if (isLoading) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Chargement de l’historique des actions"
      >
        <div className="hidden gap-4 border-b border-slate-200 px-2 pb-3 md:flex">
          <CmmSkeleton className="h-4 w-20" />
          <CmmSkeleton className="h-4 w-48 flex-1" />
          <CmmSkeleton className="h-4 w-24" />
          <CmmSkeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-slate-100 px-2 py-2.5"
          >
            <CmmSkeleton className="h-4 w-20" />
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
      <CmmFeedback
        tone="error"
        action={
          onReload ? (
            <CmmButton type="button" size="sm" tone="secondary" onClick={onReload}>
              Réessayer
            </CmmButton>
          ) : undefined
        }
      >
        {error instanceof Error
          ? error.message
          : "Impossible de charger l'historique des actions. Veuillez vérifier votre connexion ou rafraîchir la page."}
      </CmmFeedback>
    );
  }

  return (
    <div className="space-y-4">
      {filteredItems.length > 0 ? (
        <>
          {/* Vue mobile dédiée (< md) */}
          <div className="space-y-3 md:hidden">
            {filteredItems.map((item) => (
              <ActionsHistoryListMobileCard
                key={item.id}
                item={item}
                quality={qualityById.get(item.id)}
                isSelected={selectedId === item.id}
                currentUserId={currentUserId}
                isAdminLikeUser={isAdminLikeUser}
                groupJoinActionId={groupJoinActionId}
                onSelectItem={onSelectItem}
                onToggleGroupJoin={onToggleGroupJoin}
              />
            ))}
          </div>

          {/* Tableau desktop optimisé (>= md) */}
          <div className="hidden md:block">
            <div className="cmm-data-table-wrap">
              <table className="cmm-data-table" data-density="compact">
                <thead>
                  <tr className="border-b border-slate-200 cmm-text-muted">
                    <th scope="col" className="font-medium">Date</th>
                    <th scope="col" className="font-medium">Lieu &amp; acteur</th>
                    <th scope="col" className="font-medium">Mesures</th>
                    <th scope="col" className="font-medium">Statut</th>
                    <th scope="col" className="font-medium">Qualité</th>
                    <th scope="col" className="font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <ActionsHistoryListTableRow
                      key={item.id}
                      item={item}
                      quality={qualityById.get(item.id)}
                      isSelected={selectedId === item.id}
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
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-default)] p-8 text-center">
          <p className="cmm-text-small font-semibold cmm-text-primary">Aucun enregistrement trouvé</p>
          <p className="max-w-sm cmm-text-caption cmm-text-secondary">
            Aucune action ne correspond à ces critères. Modifiez les filtres ou déclarez une nouvelle action terrain.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters && onResetFilters ? (
              <CmmButton type="button" tone="secondary" size="sm" onClick={onResetFilters}>
                Réinitialiser les filtres
              </CmmButton>
            ) : null}
            <CmmButton href="/actions/new" tone="primary" size="sm">
              Déclarer une action
            </CmmButton>
          </div>
        </div>
      )}

      {filteredItems.length >= limit ? (
        <div className="flex justify-center">
          <CmmButton
            type="button"
            onClick={onLoadMore}
            loading={isValidating}
            tone="secondary"
            size="sm"
          >
            {isValidating ? "Actualisation…" : "Afficher 25 de plus"}
          </CmmButton>
        </div>
      ) : null}
    </div>
  );
}
