import { CmmButton } from "@/components/ui/cmm-button";
import type { ActionListItem, ActionMapItem, ActionQualityGrade } from "@/lib/actions/types";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import { formatScorePercent } from "@/lib/formatters/score";
import {
  buildJoinHref,
  canManageGroupJoin,
  formatDate,
  formatRecordType,
  isJoinableAction,
  qualityTone,
  rowTone,
} from "./actions-history-list.helpers";

export type ActionQualityResult = {
  score: number;
  grade: ActionQualityGrade;
  breakdown: {
    geoloc: number;
    traceability: number;
    freshness: number;
  };
  flags: string[];
};

type ActionsHistoryListTableRowProps = {
  item: ActionListItem;
  quality?: ActionQualityResult;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  groupJoinActionId: string | null;
  onSelectItem: (itemId: string) => void;
  onToggleGroupJoin: (item: ActionListItem, nextEnabled: boolean) => void;
};

export function ActionsHistoryListTableRow({
  item,
  quality,
  currentUserId,
  isAdminLikeUser,
  groupJoinActionId,
  onSelectItem,
  onToggleGroupJoin,
}: ActionsHistoryListTableRowProps) {
  return (
    <tr
      className={`cursor-pointer cmm-text-secondary ${rowTone(quality?.grade ?? null)}`}
      onClick={() => onSelectItem(item.id)}
    >
      <td>{formatDate(item.action_date)}</td>
      <td>{item.actor_name || "Anonyme"}</td>
      <td>{item.location_label}</td>
      <td>{formatRecordType(item)}</td>
      <td>
        {mapItemWasteKg(item as ActionMapItem) !== null ? (
          Number(mapItemWasteKg(item as ActionMapItem)).toFixed(1)
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      <td>
        {mapItemCigaretteButts(item as ActionMapItem) !== null ? (
          mapItemCigaretteButts(item as ActionMapItem)
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      <td>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
          {item.status}
        </span>
      </td>
      <td>
        {quality ? (
          <div className="space-y-1">
            <span
              title={quality.flags.join(" |")}
              className={`inline-flex rounded-full border px-2 py-0.5 cmm-text-caption font-semibold ${qualityTone(
                quality.grade,
              )}`}
            >
              {quality.grade} ({formatScorePercent(quality.score)})
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
      <td>
        {item.status === "approved" && item.record_type === "action" ? (
          <div className="flex flex-col items-start gap-2">
            {isJoinableAction(item) ? (
              <CmmButton
                href={buildJoinHref(item.id)}
                tone="secondary"
                size="sm"
                variant="pill"
                className="h-9 px-3 font-black uppercase tracking-[0.16em]"
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
                size="sm"
                variant="pill"
                loading={groupJoinActionId === item.id}
                onClick={() =>
                  onToggleGroupJoin(
                    item,
                    item.contract?.metadata.groupJoinEnabled === false,
                  )
                }
                className="h-9 px-3 font-black uppercase tracking-[0.16em]"
              >
                {groupJoinActionId === item.id
                  ? item.contract?.metadata.groupJoinEnabled === false
                    ? "Réouverture…"
                    : "Fermeture…"
                  : item.contract?.metadata.groupJoinEnabled === false ? (
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
}
