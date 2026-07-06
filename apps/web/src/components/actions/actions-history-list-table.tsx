import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import type { ActionListItem, ActionMapItem, ActionQualityGrade } from "@/lib/actions/types";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import {
  buildJoinHref,
  canManageGroupJoin,
  formatDate,
  formatRecordType,
  isJoinableAction,
  qualityTone,
  rowTone,
} from "./actions-history-list.helpers";

type ActionQualityResult = {
  score: number;
  grade: ActionQualityGrade;
  breakdown: {
    geoloc: number;
    traceability: number;
    freshness: number;
  };
  flags: string[];
};

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
      <div className="mt-5 space-y-3">
        <div className="flex gap-4 border-b border-slate-200 px-2 pb-3">
          <CmmSkeleton className="h-4 w-16" />
          <CmmSkeleton className="h-4 w-24" />
          <CmmSkeleton className="h-4 w-32" />
          <CmmSkeleton className="h-4 w-20" />
        </div>
        {[...Array(5)].map((_, index) => (
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
      <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-700">
        {error instanceof Error
          ? error.message
          : "Impossible de charger l'historique des actions. Veuillez vérifier votre connexion ou rafraîchir la page."}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left cmm-text-small">
          <thead>
            <tr className="border-b border-slate-200 cmm-text-muted">
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Bénévole</th>
              <th className="px-2 py-2 font-medium">Lieu</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Kg</th>
              <th className="px-2 py-2 font-medium">Mégots</th>
              <th className="px-2 py-2 font-medium">Statut</th>
              <th className="px-2 py-2 font-medium">Qualité</th>
              <th className="px-2 py-2 font-medium">Jonction</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const quality = qualityById.get(item.id);
              return (
                <tr
                  key={item.id}
                  className={`cursor-pointer border-b border-slate-100 cmm-text-secondary ${rowTone(
                    quality?.grade ?? null,
                  )}`}
                  onClick={() => onSelectItem(item.id)}
                >
                  <td className="px-2 py-2">{formatDate(item.action_date)}</td>
                  <td className="px-2 py-2">{item.actor_name || "Anonyme"}</td>
                  <td className="px-2 py-2">{item.location_label}</td>
                  <td className="px-2 py-2">{formatRecordType(item)}</td>
                  <td className="px-2 py-2">
                    {mapItemWasteKg(item as ActionMapItem) !== null ? (
                      Number(mapItemWasteKg(item as ActionMapItem)).toFixed(1)
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {mapItemCigaretteButts(item as ActionMapItem) !== null ? (
                      mapItemCigaretteButts(item as ActionMapItem)
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {quality ? (
                      <div className="space-y-1">
                        <span
                          title={quality.flags.join(" |")}
                          className={`inline-flex rounded-full border px-2 py-0.5 cmm-text-caption font-semibold ${qualityTone(
                            quality.grade,
                          )}`}
                        >
                          {quality.grade} ({quality.score}/100)
                        </span>
                        <p className="max-w-48 truncate cmm-text-caption cmm-text-muted">
                          {quality.flags[0]
                            ? `Risque: ${quality.flags[0]}`
                            : "Aucun risque majeur détecté"}
                        </p>
                      </div>
                    ) : (
                      <span className="cmm-text-caption cmm-text-muted">n/a</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {item.status === "approved" && item.record_type === "action" ? (
                      <div className="flex flex-col items-start gap-2">
                        {isJoinableAction(item) ? (
                          <CmmButton
                            href={buildJoinHref(item.id)}
                            tone="secondary"
                            variant="pill"
                            className="h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                          >
                            Rejoindre
                          </CmmButton>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide text-slate-500">
                            Fermé
                          </span>
                        )}
                        {canManageGroupJoin(item, currentUserId, isAdminLikeUser) ? (
                          <CmmButton
                            type="button"
                            tone="primary"
                            variant="pill"
                            disabled={groupJoinActionId === item.id}
                            onClick={() =>
                              onToggleGroupJoin(
                                item,
                                item.contract?.metadata.groupJoinEnabled === false,
                              )
                            }
                            className="h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                          >
                            {groupJoinActionId === item.id ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                {item.contract?.metadata.groupJoinEnabled === false
                                  ? "Rouverture..."
                                  : "Fermeture..."}
                              </>
                            ) : item.contract?.metadata.groupJoinEnabled === false ? (
                              "Rouvrir"
                            ) : (
                              "Fermer"
                            )}
                          </CmmButton>
                        ) : null}
                      </div>
                    ) : (
                      <span className="cmm-text-caption cmm-text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredItems.length >= limit ? (
        <div className="mt-6 flex justify-center border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isValidating}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 cmm-text-small font-bold cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 active:translate-y-0 disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                Actualisation...
              </>
            ) : (
              <>
                <span>Afficher 25 de plus</span>
                <span className="text-slate-300 group-hover:text-emerald-400">↓</span>
              </>
            )}
          </button>
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
