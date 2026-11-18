import { CmmBadge } from "@/components/ui/cmm-badge";
import { CmmButton } from "@/components/ui/cmm-button";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import type { ActionListItem, ActionMapItem, ActionQualityGrade } from "@/lib/actions/types";
import { formatScorePercent } from "@/lib/formatters/score";
import {
  buildJoinHref,
  canManageGroupJoin,
  formatActionStatus,
  formatDate,
  formatRecordType,
  isJoinableAction,
  qualityTone,
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
  isSelected?: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  groupJoinActionId: string | null;
  onSelectItem: (itemId: string) => void;
  onToggleGroupJoin: (item: ActionListItem, nextEnabled: boolean) => void;
};

export function ActionsHistoryListTableRow({
  item,
  quality,
  isSelected = false,
  currentUserId,
  isAdminLikeUser,
  groupJoinActionId,
  onSelectItem,
  onToggleGroupJoin,
}: ActionsHistoryListTableRowProps) {
  const wasteKg = mapItemWasteKg(item as ActionMapItem);
  const butts = mapItemCigaretteButts(item as ActionMapItem);

  return (
    <tr
      tabIndex={0}
      aria-selected={isSelected}
      onClick={() => onSelectItem(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectItem(item.id);
        }
      }}
      className={`cursor-pointer cmm-text-secondary transition-colors hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
        isSelected ? "bg-emerald-50/80" : ""
      }`}
    >
      <td className="whitespace-nowrap">{formatDate(item.action_date)}</td>
      <td className="min-w-56">
        <p className="font-medium cmm-text-primary line-clamp-2">{item.location_label}</p>
        <p className="mt-0.5 cmm-text-caption cmm-text-muted">
          {item.actor_name || "Anonyme"} · {formatRecordType(item)}
        </p>
      </td>
      <td className="whitespace-nowrap">
        <div className="cmm-text-caption">
          <span className="font-medium cmm-text-primary">
            {wasteKg !== null ? `${Number(wasteKg).toFixed(1)} kg` : "—"}
          </span>
          <span className="mx-1 text-slate-300">·</span>
          <span>{butts !== null ? `${butts} mégots` : "—"}</span>
        </div>
      </td>
      <td>
        <CmmBadge tone="slate" shape="pill">
          <span className="whitespace-nowrap">{formatActionStatus(item.status)}</span>
        </CmmBadge>
      </td>
      <td className="whitespace-nowrap">
        {quality ? (
          <span
            title={quality.flags.length > 0 ? quality.flags.join(" | ") : "Aucun risque majeur détecté"}
            className={`inline-flex rounded-full border px-2.5 py-0.5 cmm-text-caption font-semibold ${qualityTone(
              quality.grade,
            )}`}
          >
            {quality.grade} ({formatScorePercent(quality.score)})
          </span>
        ) : (
          <span className="cmm-text-caption cmm-text-muted">n/a</span>
        )}
      </td>
      <td onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-1.5">
          <CmmButton
            type="button"
            tone="tertiary"
            size="sm"
            onClick={() => onSelectItem(item.id)}
            ariaLabel={`Voir les détails de ${item.location_label}`}
          >
            Détails
          </CmmButton>
          {item.status === "approved" && item.record_type === "action" ? (
            <>
              {isJoinableAction(item) ? (
                <CmmButton
                  href={buildJoinHref(item.id)}
                  tone="secondary"
                  size="sm"
                  variant="pill"
                >
                  Rejoindre
                </CmmButton>
              ) : null}
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
                >
                  {groupJoinActionId === item.id
                    ? item.contract?.metadata.groupJoinEnabled === false
                      ? "Réouverture…"
                      : "Fermeture…"
                    : item.contract?.metadata.groupJoinEnabled === false
                      ? "Rouvrir"
                      : "Fermer"}
                </CmmButton>
              ) : null}
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
